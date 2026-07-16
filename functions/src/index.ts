import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import OpenAI from 'openai';

admin.initializeApp();

const db = admin.firestore();



/**
 * Cloud Function : checkPriceAlerts
 * Scheduled every 6 hours — checks all active price alerts for drops.
 */
export const checkPriceAlerts = onSchedule('every 6 hours', async () => {
  const apiKey = process.env.FRAGELLA_API_KEY;
  if (!apiKey) {
    console.error('[checkPriceAlerts] FRAGELLA_API_KEY not configured');
    return;
  }

  const usersSnap = await db.collection('users').get();
  let alertsChecked = 0;
  let notificationsSent = 0;
  const now = Date.now();
  const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    // Check user settings: must have priceAlerts + pushNotifs enabled
    let settings: { priceAlerts?: boolean; pushNotifs?: boolean } = {};
    try {
      const settingsDoc = await db.doc(`users/${uid}/settings/preferences`).get();
      settings = settingsDoc.data() ?? {};
    } catch {
      continue;
    }
    if (settings.priceAlerts !== true || settings.pushNotifs !== true) continue;

    // Get user's active price alerts
    let alertsSnap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      alertsSnap = await db.collection(`users/${uid}/priceAlerts`).get();
    } catch {
      continue;
    }
    if (alertsSnap.empty) continue;

    // Get user's FCM tokens
    let tokens: string[] = [];
    try {
      const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
      tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean) as string[];
    } catch {
      continue;
    }
    if (tokens.length === 0) continue;

    for (const alertDoc of alertsSnap.docs) {
      const alert = alertDoc.data();
      const parfumId = alert.parfumId as string;
      const lastPrice = typeof alert.lastPrice === 'number' ? alert.lastPrice : null;
      if (!parfumId) continue;

      alertsChecked++;

      // Get cached parfum from Firestore
      let currentPrice: number | null = null;
      let parfumNom = '';
      let parfumMarque = '';

      try {
        const parfumDoc = await db.doc(`parfums/${parfumId}`).get();
        if (parfumDoc.exists) {
          const p = parfumDoc.data()!;
          const cachedAt = p.cachedAt ? new Date(p.cachedAt as string | Date).getTime() : 0;
          const isFresh = (now - cachedAt) < STALE_MS;

          if (isFresh) {
            currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
            parfumNom = (p.nom as string) ?? '';
            parfumMarque = (p.marque as string) ?? '';
          } else {
            // Stale cache — call Fragella to refresh
            const fragellaId = p.fragellaId as string | undefined;
            if (fragellaId) {
              const fragResponse = await fetch(
                `https://api.fragella.com/api/v1/fragrances/${encodeURIComponent(fragellaId)}`,
                { headers: { 'x-api-key': apiKey } }
              );
              if (fragResponse.ok) {
                const fragData = await fragResponse.json() as Record<string, unknown>;
                const newPrice = fragData['Price'] ? parseFloat(String(fragData['Price'])) : null;
                currentPrice = newPrice ?? null;
                parfumNom = (fragData['Name'] as string) ?? (p.nom as string);
                parfumMarque = (fragData['Brand'] as string) ?? (p.marque as string);

                // Update cache
                await db.doc(`parfums/${parfumId}`).set({
                  bestPrice: currentPrice,
                  cachedAt: new Date().toISOString(),
                }, { merge: true });
              } else {
                // API failed, use cached regardless of staleness
                currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
                parfumNom = (p.nom as string) ?? '';
                parfumMarque = (p.marque as string) ?? '';
              }
            } else {
              // No fragellaId, use cached regardless
              currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
              parfumNom = (p.nom as string) ?? '';
              parfumMarque = (p.marque as string) ?? '';
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[checkPriceAlerts] Failed to fetch parfum ${parfumId}:`, msg);
        continue;
      }

      // Compare prices and trigger notification if drop detected
      if (lastPrice !== null && currentPrice !== null && currentPrice > 0) {
        const dropPct = (lastPrice - currentPrice) / lastPrice;
        const dropAbs = lastPrice - currentPrice;
        const significantDrop = dropPct >= 0.10 || dropAbs >= 5;

        if (significantDrop) {
          const displayName = parfumMarque && parfumNom
            ? `${parfumMarque} ${parfumNom}`
            : parfumId;

          const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
              title: '💰 Baisse de prix !',
              body: `${displayName} est passé à ${currentPrice.toFixed(0)} € (-${Math.round(dropPct * 100)}%)`,
            },
            data: {
              type: 'price_alert',
              parfumId,
              newPrice: String(currentPrice),
            },
            android: {
              notification: {
                channelId: 'price_alerts',
                priority: 'high',
              },
            },
          };

          try {
            const response = await admin.messaging().sendEachForMulticast(message);
            notificationsSent += response.successCount;
            console.log(`[checkPriceAlerts] Sent to ${uid}: ${displayName} ${lastPrice.toFixed(0)}€ → ${currentPrice.toFixed(0)}€`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[checkPriceAlerts] Failed to notify ${uid}:`, msg);
          }
        }
      }

      // Update lastPrice and lastChecked on the alert doc
      try {
        await alertDoc.ref.set({
          lastPrice: currentPrice,
          lastChecked: new Date().toISOString(),
        }, { merge: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[checkPriceAlerts] Failed to update alert doc:`, msg);
      }
    }
  }

  console.log(`[checkPriceAlerts] Done — ${alertsChecked} alerts checked, ${notificationsSent} notifications sent`);
});

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
/**
 * Extrait un objet JSON d'une chaîne de texte (supporte markdown fences et texte autour).
 */
function extractJson(text: string): string {
  // Essayer d'extraire depuis des fences markdown ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Sinon, chercher la première { et dernière }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

export const analyzePerfumeImage = functions.https.onCall(
  { region: 'europe-west1' },
  async (request: functions.https.CallableRequest<{ imageBase64?: string; imagesBase64?: string[] }>): Promise<ScanResult> => {
    const { imageBase64, imagesBase64 } = request.data;

    const isBurst = Array.isArray(imagesBase64) && imagesBase64.length > 0;
    const hasSingle = typeof imageBase64 === 'string' && imageBase64.length > 0;

    if (!isBurst && !hasSingle) {
      throw new functions.https.HttpsError('invalid-argument', 'Le paramètre "imageBase64" ou "imagesBase64" est requis.');
    }

    const images: string[] = isBurst ? imagesBase64! : [imageBase64!];

    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/')) {
        throw new functions.https.HttpsError('invalid-argument', "Chaque image doit être en base64 avec préfixe \"data:image/\".");
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'Clé API OpenAI non configurée.');
    }

    const openai = new OpenAI({ apiKey });

    const BURST_PROMPT = `Tu es un expert en parfumerie. Tu analyses ${images.length} photos du MÊME flacon de parfum prises sous des angles légèrement différents. Analyse chaque photo indépendamment puis fusionne les lectures en un résultat unique. Retourne UNIQUEMENT un objet JSON avec ces champs :

- marque: la marque (ex: "Dior", "Chanel", "Xerjoff").
- nom: le nom du parfum (ex: "Sauvage", "N°5").
- volumeMl: le volume en ml (ex: 100). null si non visible sur aucune photo.
- typeParfum: "Eau de Parfum", "Eau de Toilette", "Extrait", "Parfum", ou null.
- confidence: "high" si clairement lisibles sur au moins 2 photos, "low" si incertain.

RÈGLES :
- Si les photos montrent des informations partielles ou contradictoires, utilise la photo la plus nette comme référence principale.
- Si un champ est partiellement visible, donne ta meilleure estimation, mets confidence:"low".
- N'invente JAMAIS volumeMl ou typeParfum si rien n'est visible (mets null).
- Réponds TOUJOURS avec un JSON valide contenant les 5 champs.
- Réponds uniquement avec le JSON, pas de texte autour.`;

    const SINGLE_PROMPT = `Tu es un expert en parfumerie. Analyse cette photo de flacon et retourne UNIQUEMENT un objet JSON avec ces champs :

- marque: la marque (ex: "Dior", "Chanel", "Xerjoff").
- nom: le nom du parfum (ex: "Sauvage", "N°5").
- volumeMl: le volume en ml (ex: 100). null si non visible.
- typeParfum: "Eau de Parfum", "Eau de Toilette", "Extrait", "Parfum", ou null.
- confidence: "high" si clairement lisibles, "low" si incertain.

RÈGLES :
- Si partiellement visible, donne ta meilleure estimation, mets confidence:"low".
- N'invente JAMAIS volumeMl ou typeParfum si rien n'est visible (mets null).
- Réponds TOUJOURS avec un JSON valide contenant les 5 champs.
- Réponds uniquement avec le JSON, pas de texte autour.`;

    const SYSTEM_PROMPT = isBurst ? BURST_PROMPT : SINGLE_PROMPT;

    const callOpenAI = async (detail: 'auto' | 'high') => {
      return openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SYSTEM_PROMPT },
              ...images.map(img => ({ type: 'image_url' as const, image_url: { url: img, detail } })),
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      });
    };

    const parseResponse = (content: string | null, finishReason: string | null): ScanResult => {
      if (!content || content.trim().length === 0) {
        console.error('[analyzePerfumeImage] Empty content, finish_reason:', finishReason);
        throw new functions.https.HttpsError('internal', "Réponse vide de l'IA.");
      }

      const jsonStr = extractJson(content);
      console.log('[analyzePerfumeImage] Parsed JSON length:', jsonStr.length);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error('[analyzePerfumeImage] JSON parse error:', msg);
        console.error('[analyzePerfumeImage] Raw content (first 300 chars):', content.slice(0, 300));
        throw new functions.https.HttpsError('internal', "Réponse de l'IA invalide. Réessayez.");
      }

      return {
        marque: typeof parsed.marque === 'string' ? parsed.marque : null,
        nom: typeof parsed.nom === 'string' ? parsed.nom : null,
        volumeMl: typeof parsed.volumeMl === 'number' ? parsed.volumeMl : null,
        typeParfum: typeof parsed.typeParfum === 'string' ? parsed.typeParfum : null,
        confidence: parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'low',
      };
    };

    try {
      // Premier essai avec detail:'auto' (bon compromis qualité/coût)
      const response = await callOpenAI('auto');
      const finishReason = response.choices[0]?.finish_reason;
      console.log(`[analyzePerfumeImage] ${isBurst ? `Burst (${images.length} images)` : 'Single'} — Attempt 1 finish_reason:`, finishReason);

      const content = response.choices[0]?.message?.content;
      if (content && content.trim().length > 0) {
        return parseResponse(content, finishReason ?? null);
      }

      // Fallback : contenu vide → réessayer avec detail:'high'
      console.log('[analyzePerfumeImage] Empty content on attempt 1, retrying with detail:high...');
      const retryResponse = await callOpenAI('high');
      const retryFinish = retryResponse.choices[0]?.finish_reason;
      console.log('[analyzePerfumeImage] Attempt 2 — finish_reason:', retryFinish);

      return parseResponse(retryResponse.choices[0]?.message?.content ?? null, retryFinish ?? null);
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) throw error;
      const message = error instanceof Error ? error.message : 'Erreur inconnue.';
      console.error('OpenAI API error:', message);
      throw new functions.https.HttpsError('internal', "Échec de l'analyse IA. Veuillez réessayer.");
    }
  }
);
