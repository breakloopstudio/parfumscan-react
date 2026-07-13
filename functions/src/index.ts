import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

admin.initializeApp();



/**
 * Cloud Function : sendNotification
 * Envoie une notification push à un utilisateur ou à tous les utilisateurs.
 */
export const sendNotification = functions.https.onCall(
  { region: 'europe-west1' },
  async (
    request: functions.https.CallableRequest<{
      title: string;
      body: string;
      userId?: string;
      data?: Record<string, string>;
    }>
  ): Promise<{ success: boolean; sent: number; errors: number }> => {
    const { title, body, userId, data } = request.data;

    if (!title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Les champs "title" et "body" sont requis.'
      );
    }

    // Si userId spécifié, vérifier que c'est le même utilisateur (ou admin)
    if (userId && request.auth?.uid !== userId) {
      // Vérifier si l'utilisateur est admin
      const adminDoc = await admin
        .firestore()
        .collection('admins')
        .doc(request.auth?.uid ?? '')
        .get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError(
          'permission-denied',
          "Vous ne pouvez envoyer des notifications qu'à vous-même."
        );
      }
    }

    const tokens: string[] = [];

    if (userId) {
      // Envoyer à un utilisateur spécifique
      const tokensSnapshot = await admin
        .firestore()
        .collection(`users/${userId}/fcmTokens`)
        .get();
      tokensSnapshot.forEach((doc) => {
        const t = doc.data().token;
        if (t) tokens.push(t);
      });
    } else {
      // Envoyer à tous les utilisateurs (admin uniquement via auth check ci-dessus)
      if (!request.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentification requise pour envoyer à tous les utilisateurs.'
        );
      }
      const usersSnapshot = await admin.firestore().collection('users').get();
      for (const userDoc of usersSnapshot.docs) {
        const tokensSnapshot = await admin
          .firestore()
          .collection(`users/${userDoc.id}/fcmTokens`)
          .get();
        tokensSnapshot.forEach((doc) => {
          const t = doc.data().token;
          if (t) tokens.push(t);
        });
      }
    }

    if (tokens.length === 0) {
      return { success: true, sent: 0, errors: 0 };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      webpush: {
        notification: {
          icon: '/assets/icons/manifest-icon-192.maskable.png',
          badge: '/assets/icons/manifest-icon-192.maskable.png',
        },
        fcmOptions: {
          link: data?.url ?? '/',
        },
      },
      data: data ?? {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const errors = response.responses.filter((r) => !r.success).length;

    console.log(
      `📨 Notification envoyée : ${response.successCount} succès, ${errors} échecs`
    );

    return {
      success: true,
      sent: response.successCount,
      errors,
    };
  }

);

interface ScanResult {
  marque: string | null;
  nom: string | null;
  volumeMl: number | null;
  typeParfum: string | null;
  confidence: 'high' | 'low';
}

/**
 * Cloud Function : searchFragrance
 * Recherche via Fragella API directe — pas de cache Firestore.
 * Scan : utilise /brands/:brandName pour résultats exhaustifs.
 * Catalogue : utilise /fragrances?search pour suggestions rapides.
 */
export const searchFragrance = functions.https.onCall(
  { region: 'europe-west1' },
  async (request: functions.https.CallableRequest<{ marque?: string; nom?: string; query?: string; typeParfum?: string | null }>): Promise<Record<string, unknown> | null> => {
    const { marque, nom, query, typeParfum } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Connexion requise pour utiliser la recherche Fragella.');
    }

    const parts: string[] = [];
    if (marque) parts.push(marque);
    if (nom) parts.push(nom);
    if (typeParfum) parts.push(typeParfum);
    const searchQuery = query || (parts.length > 0 ? parts.join(' ') : null);

    if (!searchQuery || searchQuery.trim().length < 2) {
      throw new functions.https.HttpsError('invalid-argument', 'Recherche trop courte (min 2 caractères).');
    }

    // Vérifier le cache Firestore avant d'appeler Fragella (mode scan uniquement)
    if (marque && nom && !query) {
      const cacheKey = `${normalize(marque)}_${normalize(nom)}`;
      try {
        const cachedDoc = await admin.firestore().doc(`parfums/${cacheKey}`).get();
        if (cachedDoc.exists) {
          console.log(`[Cache] Hit: ${cacheKey}`);
          const data = cachedDoc.data()!;
          data['id'] = cacheKey;
          data['source'] = 'cache';
          return { results: [data], source: 'cache' as const };
        }
        console.log(`[Cache] Miss: ${cacheKey}`);
      } catch { /* cache read failure, on passe à Fragella */ }
    }

    const apiKey = process.env.FRAGELLA_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'Clé API Fragella non configurée.');
    }

    // Rate limit utilisateur : max 10 appels Fragella / jour
    const today = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().doc(`users/${uid}/_usage/${today}`);
    const usageDoc = await usageRef.get();
    const count = usageDoc.exists ? (usageDoc.data()?.['fragellaCalls'] ?? 0) : 0;
    if (count >= 10) {
      throw new functions.https.HttpsError('resource-exhausted', 'Limite quotidienne atteinte (10 recherches/jour).');
    }

    // Plafond global : max 200 appels/jour tous utilisateurs confondus
    const globalRef = admin.firestore().doc(`rateLimits/${today}`);
    const globalDoc = await globalRef.get();
    const globalCount = globalDoc.exists ? (globalDoc.data()?.['total'] ?? 0) : 0;
    if (globalCount >= 200) {
      throw new functions.https.HttpsError('resource-exhausted', 'Limite globale quotidienne atteinte. Réessayez demain.');
    }

    // Incrémenter les compteurs avant l'appel Fragella
    await Promise.all([
      usageRef.set({ fragellaCalls: count + 1 }, { merge: true }),
      globalRef.set({ total: globalCount + 1 }, { merge: true }),
    ]);

    // Appeler Fragella
    try {
      let fragellaUrl: string;

      if (marque && !query) {
        // Mode scan : utiliser /brands pour avoir TOUTES les fragrances de la marque
        fragellaUrl = `https://api.fragella.com/api/v1/brands/${encodeURIComponent(marque)}?limit=50`;
      } else {
        // Mode catalogue : recherche texte libre (normaliser les accents)
        const q = normalize(searchQuery);
        fragellaUrl = `https://api.fragella.com/api/v1/fragrances?search=${encodeURIComponent(q)}&limit=10`;
      }

      const response = await fetch(fragellaUrl, { headers: { 'x-api-key': apiKey } });
      console.log(`[Fragella] GET ${fragellaUrl} → status ${response.status}`);
      if (!response.ok) {
        console.error('Fragella API error:', response.status);
        return null;
      }

      const data = await response.json() as Array<Record<string, unknown>>;
      console.log(`[Fragella] ${data.length} résultats bruts`);
      if (!data.length) return null;

      let results = data.map(f => mapFragrance(f));

      // Mode scan : trier par pertinence nom, mais garder tous les résultats
      if (marque && nom && !query) {
        const nomLower = normalize(nom);
        results.sort((a, b) => {
          const aMatch = normalize(String(a['nom'] ?? '')).includes(nomLower) ? 1 : 0;
          const bMatch = normalize(String(b['nom'] ?? '')).includes(nomLower) ? 1 : 0;
          return bMatch - aMatch;
        });
        if (results.length > 10) results = results.slice(0, 10);
      }

      // Filtrer par typeParfum si fourni
      if (typeParfum) {
        const typeFiltered = results.filter(r =>
          normalize(String(r['typeParfum'] ?? '')).includes(normalize(typeParfum))
        );
        if (typeFiltered.length > 0) results = typeFiltered;
      }

      // Fallback ultime : /fragrances?search=marque+nom
      if (results.length === 0 && marque && nom) {
        const fallbackUrl = `https://api.fragella.com/api/v1/fragrances?search=${encodeURIComponent(marque + ' ' + nom)}&limit=5`;
        const fbResponse = await fetch(fallbackUrl, { headers: { 'x-api-key': apiKey } });
        if (fbResponse.ok) {
          const fbData = await fbResponse.json() as Array<Record<string, unknown>>;
          if (fbData.length) results = fbData.map(f => mapFragrance(f));
        }
      }

      // Sauvegarder dans le cache Firestore (mode scan)
      if (marque && nom && !query) {
        try {
          const now = new Date().toISOString();
          for (const r of results) {
            const key = `${normalize(String(r['marque'] ?? ''))}_${normalize(String(r['nom'] ?? ''))}`;
            const docRef = admin.firestore().doc(`parfums/${key}`);
            const existing = await docRef.get();
            if (existing.exists && existing.data()?.imageVerified) {
              r['imageUrl'] = existing.data()?.imageUrl;
            }
            r['source'] = 'fragella';
            r['cachedAt'] = now;
            await docRef.set(r, { merge: true });
          }
          console.log(`[Cache] ${results.length} parfum(s) sauvegardé(s)`);
        } catch (e: any) { console.warn('[Cache] Write failed:', e?.message); }
      }

      return { results, source: 'fragella' as const };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue.';
      console.error('Fragella error:', message);
      return null;
    }
  }
);

/** Helper: normalise une chaîne pour comparaison insensible aux accents. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Helper: mappe une entrée Fragella vers notre format */
function mapFragrance(f: Record<string, unknown>): Record<string, unknown> {
  const notes = f['Notes'] as Record<string, Array<{ name: string }>> | undefined;
  const nom = String(f['Name'] ?? '');
  const marque = String(f['Brand'] ?? '');
  const raw = {
    id: normalize(marque) + '_' + normalize(nom),
    nom,
    marque,
    annee: f['Year'] ? (parseInt(String(f['Year']), 10) || undefined) : undefined,
    imageUrl: f['Image URL'] ?? null,
    bestPrice: f['Price'] ? (parseFloat(String(f['Price'])) || undefined) : undefined,
    typeParfum: f['OilType'] ?? null,
    familleOlactive: (f['Main Accords'] as string[])?.[0] ?? '',
    notesTete: notes?.Top?.map(n => n.name) ?? [],
    notesCoeur: notes?.Middle?.map(n => n.name) ?? [],
    notesFond: notes?.Base?.map(n => n.name) ?? [],
    longevity: f['Longevity'] ?? null,
    sillage: f['Sillage'] ?? null,
    gender: f['Gender'] ?? null,
    purchaseUrl: f['Purchase URL'] ?? null,
    priceValue: f['Price Value'] ?? null,
    mainAccords: f['Main Accords'] ?? [],
    rating: f['rating'] ?? null,
    popularity: f['Popularity'] ?? null,
  };
  return Object.fromEntries(
    Object.entries(raw).filter(([_, v]) => v !== undefined && v !== null && !Number.isNaN(v))
  );
}

/**
 * Cloud Function : analyzePerfumeImage
 * Reçoit une image base64, appelle OpenAI GPT-4o Vision,
 * et retourne les informations du parfum détecté.
 */
export const analyzePerfumeImage = functions.https.onCall(
  { region: 'europe-west1' },
  async (request: functions.https.CallableRequest<{ imageBase64: string }>): Promise<ScanResult> => {
    const { imageBase64 } = request.data;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Le paramètre "imageBase64" est requis.');
    }
    if (!imageBase64.startsWith('data:image/')) {
      throw new functions.https.HttpsError('invalid-argument', "L'image doit être en base64 avec préfixe \"data:image/\".");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'Clé API OpenAI non configurée.');
    }

    const openai = new OpenAI({ apiKey });

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Tu es un expert en parfumerie. Analyse cette photo de flacon et retourne UNIQUEMENT un objet JSON avec ces champs :

- marque: la marque (ex: "Dior", "Chanel", "Xerjoff").
- nom: le nom du parfum (ex: "Sauvage", "N°5").
- volumeMl: le volume en ml (ex: 100). null si non visible.
- typeParfum: "Eau de Parfum", "Eau de Toilette", "Extrait", "Parfum", ou null.
- confidence: "high" si clairement lisibles, "low" si incertain.

RÈGLES :
- Si partiellement visible, donne ta meilleure estimation, mets confidence:"low".
- N'invente JAMAIS volumeMl ou typeParfum si rien n'est visible (mets null).
- Réponds TOUJOURS avec un JSON valide contenant les 5 champs.
- Réponds uniquement avec le JSON, pas de texte autour.`,
              },
              { type: 'image_url', image_url: { url: imageBase64, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const finishReason = response.choices[0]?.finish_reason;
      console.log('[analyzePerfumeImage] finish_reason:', finishReason);
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[analyzePerfumeImage] Empty content, finish_reason:', finishReason);
        throw new functions.https.HttpsError('internal', "Réponse vide de l'IA.");
      }

      const parsed: ScanResult = JSON.parse(content);
      return {
        marque: parsed.marque ?? null,
        nom: parsed.nom ?? null,
        volumeMl: typeof parsed.volumeMl === 'number' ? parsed.volumeMl : null,
        typeParfum: parsed.typeParfum ?? null,
        confidence: parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'low',
      };
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) throw error;
      const message = error instanceof Error ? error.message : 'Erreur inconnue.';
      console.error('OpenAI API error:', message);
      throw new functions.https.HttpsError('internal', "Échec de l'analyse IA. Veuillez réessayer.");
    }
  }
);
