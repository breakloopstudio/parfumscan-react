"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePerfumeImage = exports.searchFragrance = exports.sendNotification = exports.checkPriceAlerts = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const openai_1 = __importDefault(require("openai"));
admin.initializeApp();
const db = admin.firestore();
/**
 * Cloud Function : checkPriceAlerts
 * Scheduled every 6 hours — checks all active price alerts for drops.
 */
exports.checkPriceAlerts = (0, scheduler_1.onSchedule)('every 6 hours', async () => {
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
        let settings = {};
        try {
            const settingsDoc = await db.doc(`users/${uid}/settings/preferences`).get();
            settings = settingsDoc.data() ?? {};
        }
        catch {
            continue;
        }
        if (settings.priceAlerts !== true || settings.pushNotifs !== true)
            continue;
        // Get user's active price alerts
        let alertsSnap;
        try {
            alertsSnap = await db.collection(`users/${uid}/priceAlerts`).get();
        }
        catch {
            continue;
        }
        if (alertsSnap.empty)
            continue;
        // Get user's FCM tokens
        let tokens = [];
        try {
            const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
            tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
        }
        catch {
            continue;
        }
        if (tokens.length === 0)
            continue;
        for (const alertDoc of alertsSnap.docs) {
            const alert = alertDoc.data();
            const parfumId = alert.parfumId;
            const lastPrice = typeof alert.lastPrice === 'number' ? alert.lastPrice : null;
            if (!parfumId)
                continue;
            alertsChecked++;
            // Get cached parfum from Firestore
            let currentPrice = null;
            let parfumNom = '';
            let parfumMarque = '';
            try {
                const parfumDoc = await db.doc(`parfums/${parfumId}`).get();
                if (parfumDoc.exists) {
                    const p = parfumDoc.data();
                    const cachedAt = p.cachedAt ? new Date(p.cachedAt).getTime() : 0;
                    const isFresh = (now - cachedAt) < STALE_MS;
                    if (isFresh) {
                        currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
                        parfumNom = p.nom ?? '';
                        parfumMarque = p.marque ?? '';
                    }
                    else {
                        // Stale cache — call Fragella to refresh
                        const fragellaId = p.fragellaId;
                        if (fragellaId) {
                            const fragResponse = await fetch(`https://api.fragella.com/api/v1/fragrances/${encodeURIComponent(fragellaId)}`, { headers: { 'x-api-key': apiKey } });
                            if (fragResponse.ok) {
                                const fragData = await fragResponse.json();
                                const newPrice = fragData['Price'] ? parseFloat(String(fragData['Price'])) : null;
                                currentPrice = newPrice ?? null;
                                parfumNom = fragData['Name'] ?? p.nom;
                                parfumMarque = fragData['Brand'] ?? p.marque;
                                // Update cache
                                await db.doc(`parfums/${parfumId}`).set({
                                    bestPrice: currentPrice,
                                    cachedAt: new Date().toISOString(),
                                }, { merge: true });
                            }
                            else {
                                // API failed, use cached regardless of staleness
                                currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
                                parfumNom = p.nom ?? '';
                                parfumMarque = p.marque ?? '';
                            }
                        }
                        else {
                            // No fragellaId, use cached regardless
                            currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
                            parfumNom = p.nom ?? '';
                            parfumMarque = p.marque ?? '';
                        }
                    }
                }
            }
            catch (err) {
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
                    const message = {
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
                    }
                    catch (err) {
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
            }
            catch (err) {
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
exports.sendNotification = functions.https.onCall({ region: 'europe-west1' }, async (request) => {
    const { title, body, userId, data } = request.data;
    if (!title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Les champs "title" et "body" sont requis.');
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
            throw new functions.https.HttpsError('permission-denied', "Vous ne pouvez envoyer des notifications qu'à vous-même.");
        }
    }
    const tokens = [];
    if (userId) {
        // Envoyer à un utilisateur spécifique
        const tokensSnapshot = await admin
            .firestore()
            .collection(`users/${userId}/fcmTokens`)
            .get();
        tokensSnapshot.forEach((doc) => {
            const t = doc.data().token;
            if (t)
                tokens.push(t);
        });
    }
    else {
        // Envoyer à tous les utilisateurs (admin uniquement via auth check ci-dessus)
        if (!request.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Authentification requise pour envoyer à tous les utilisateurs.');
        }
        const usersSnapshot = await admin.firestore().collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const tokensSnapshot = await admin
                .firestore()
                .collection(`users/${userDoc.id}/fcmTokens`)
                .get();
            tokensSnapshot.forEach((doc) => {
                const t = doc.data().token;
                if (t)
                    tokens.push(t);
            });
        }
    }
    if (tokens.length === 0) {
        return { success: true, sent: 0, errors: 0 };
    }
    const message = {
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
    console.log(`📨 Notification envoyée : ${response.successCount} succès, ${errors} échecs`);
    return {
        success: true,
        sent: response.successCount,
        errors,
    };
});
/**
 * Cloud Function : searchFragrance
 * Recherche via Fragella API directe — pas de cache Firestore.
 * Scan : utilise /brands/:brandName pour résultats exhaustifs.
 * Catalogue : utilise /fragrances?search pour suggestions rapides.
 */
exports.searchFragrance = functions.https.onCall({ region: 'europe-west1' }, async (request) => {
    const { marque, nom, query, typeParfum, id, similarTo } = request.data;
    const uid = request.auth?.uid;
    const isAuthed = !!uid;
    // Mode getById : récupérer un parfum par son ID Fragella
    if (id) {
        const apiKey = process.env.FRAGELLA_API_KEY;
        if (!apiKey)
            throw new functions.https.HttpsError('internal', 'Clé API Fragella non configurée.');
        const response = await fetch(`https://api.fragella.com/api/v1/fragrances/${encodeURIComponent(id)}`, {
            headers: { 'x-api-key': apiKey },
        });
        if (!response.ok)
            return null;
        const data = await response.json();
        return { results: [mapFragrance(data)], source: 'fragella' };
    }
    // Mode similarTo : récupérer des parfums similaires
    if (similarTo) {
        const apiKey = process.env.FRAGELLA_API_KEY;
        if (!apiKey)
            throw new functions.https.HttpsError('internal', 'Clé API Fragella non configurée.');
        const response = await fetch(`https://api.fragella.com/api/v1/fragrances/similar?name=${encodeURIComponent(similarTo)}&limit=8`, {
            headers: { 'x-api-key': apiKey },
        });
        if (!response.ok)
            return null;
        const raw = await response.json();
        const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
        return { results: items.map(mapFragrance), source: 'fragella' };
    }
    const parts = [];
    if (marque)
        parts.push(marque);
    if (nom)
        parts.push(nom);
    if (typeParfum)
        parts.push(typeParfum);
    const searchQuery = query || (parts.length > 0 ? parts.join(' ') : null);
    if (!searchQuery || searchQuery.trim().length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Recherche trop courte (min 2 caractères).');
    }
    // Vérifier le cache Firestore avant d'appeler Fragella (mode scan uniquement)
    if (marque && nom && !query) {
        const cacheKey = `${normalizeId(marque)}_${normalizeId(nom)}`;
        try {
            const cachedDoc = await admin.firestore().doc(`parfums/${cacheKey}`).get();
            if (cachedDoc.exists) {
                console.log(`[Cache] Hit: ${cacheKey}`);
                const data = cachedDoc.data();
                data['id'] = cacheKey;
                data['source'] = 'cache';
                return { results: [data], source: 'cache' };
            }
            console.log(`[Cache] Miss: ${cacheKey}`);
        }
        catch { /* cache read failure, on passe à Fragella */ }
    }
    const apiKey = process.env.FRAGELLA_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('internal', 'Clé API Fragella non configurée.');
    }
    // Rate limit : 10/jour (authed), 5/jour (anonymous)
    const maxCalls = isAuthed ? 10 : 5;
    const callerId = uid ?? ('anon_' + (request.rawRequest?.ip ?? 'unknown'));
    const today = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().doc(`users/${callerId}/_usage/${today}`);
    const usageDoc = await usageRef.get();
    const count = usageDoc.exists ? (usageDoc.data()?.['fragellaCalls'] ?? 0) : 0;
    if (count >= maxCalls) {
        throw new functions.https.HttpsError('resource-exhausted', `Limite quotidienne atteinte (${maxCalls} recherches/jour).`);
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
        let fragellaUrl;
        if (marque && !query) {
            // Mode scan : utiliser /brands pour avoir TOUTES les fragrances de la marque
            fragellaUrl = `https://api.fragella.com/api/v1/brands/${encodeURIComponent(marque)}?limit=50`;
        }
        else {
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
        const raw = await response.json();
        const data = Array.isArray(raw) ? raw : (raw?.data ?? []);
        console.log(`[Fragella] ${data.length} résultats bruts (isArray:${Array.isArray(raw)})`);
        if (!data.length)
            return null;
        let results = data.map(f => mapFragrance(f));
        // Mode scan : trier par pertinence nom, mais garder tous les résultats
        if (marque && nom && !query) {
            const nomLower = normalize(nom);
            results.sort((a, b) => {
                const aMatch = normalize(String(a['nom'] ?? '')).includes(nomLower) ? 1 : 0;
                const bMatch = normalize(String(b['nom'] ?? '')).includes(nomLower) ? 1 : 0;
                return bMatch - aMatch;
            });
            if (results.length > 10)
                results = results.slice(0, 10);
        }
        // Filtrer par typeParfum si fourni
        if (typeParfum) {
            const typeFiltered = results.filter(r => normalize(String(r['typeParfum'] ?? '')).includes(normalize(typeParfum)));
            if (typeFiltered.length > 0)
                results = typeFiltered;
        }
        // Fallback ultime : /fragrances?search=marque+nom
        if (results.length === 0 && marque && nom) {
            const fallbackUrl = `https://api.fragella.com/api/v1/fragrances?search=${encodeURIComponent(marque + ' ' + nom)}&limit=5`;
            const fbResponse = await fetch(fallbackUrl, { headers: { 'x-api-key': apiKey } });
            if (fbResponse.ok) {
                const fbRaw = await fbResponse.json();
                const fbData = Array.isArray(fbRaw) ? fbRaw : (fbRaw?.data ?? []);
                if (fbData.length)
                    results = fbData.map(f => mapFragrance(f));
            }
        }
        // Sauvegarder dans le cache Firestore (mode scan) — auth only
        if (isAuthed && marque && nom && !query) {
            try {
                const now = new Date().toISOString();
                for (const r of results) {
                    const key = `${normalizeId(String(r['marque'] ?? ''))}_${normalizeId(String(r['nom'] ?? ''))}`;
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
            }
            catch (e) {
                console.warn('[Cache] Write failed:', e?.message);
            }
        }
        return { results, source: 'fragella' };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue.';
        console.error('Fragella error:', message);
        return null;
    }
});
/** Helper: normalise une chaîne pour comparaison insensible aux accents (garde les espaces). */
function normalize(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
/** Helper: normalise pour les IDs/doc keys (remplace les espaces par des underscores).
 *  Doit correspondre exactement à la version client dans src/services/fragella.ts. */
function normalizeId(s) {
    return normalize(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
/** Helper: mappe une entrée Fragella vers notre format */
function mapFragrance(f) {
    const notes = f['Notes'];
    const nom = String(f['Name'] ?? '');
    const marque = String(f['Brand'] ?? '');
    const raw = {
        id: normalizeId(marque) + '_' + normalizeId(nom),
        fragellaId: f['_id'],
        nom,
        marque,
        annee: f['Year'] ? (parseInt(String(f['Year']), 10) || undefined) : undefined,
        imageUrl: f['Image URL'] ?? null,
        bestPrice: f['Price'] ? (parseFloat(String(f['Price'])) || undefined) : undefined,
        typeParfum: f['OilType'] ?? null,
        familleOlactive: f['Main Accords']?.[0] ?? '',
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
        popularityScore: popScore(f['Popularity']),
        ratingScore: rateScore(f['rating']),
        country: f['Country'] ?? null,
        imageUrlTransparent: f['Image URL Transparent'] ?? null,
        mainAccordsPercentage: f['Main Accords Percentage'] ?? null,
        generalNotes: f['General Notes'] ?? null,
        confidence: f['Confidence'] ?? null,
        seasonRanking: f['Season Ranking'] ?? null,
        occasionRanking: f['Occasion Ranking'] ?? null,
        imageFallbacks: f['Image Fallbacks'] ?? null,
    };
    return Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== undefined && v !== null && !Number.isNaN(v)));
}
function popScore(v) {
    if (!v)
        return undefined;
    const k = v.toLowerCase().trim();
    if (k.includes('very high') || k.includes('extremely'))
        return 100;
    if (k.includes('high'))
        return 75;
    if (k.includes('medium') || k.includes('moderate'))
        return 50;
    if (k.includes('low') && !k.includes('very'))
        return 25;
    if (k.includes('very low'))
        return 0;
    const n = parseFloat(k);
    return isNaN(n) ? undefined : n;
}
function rateScore(v) {
    if (!v)
        return undefined;
    const n = parseFloat(v);
    return isNaN(n) ? undefined : n;
}
/**
 * Cloud Function : analyzePerfumeImage
 * Reçoit une image base64, appelle OpenAI GPT-4o Vision,
 * et retourne les informations du parfum détecté.
 */
/**
 * Extrait un objet JSON d'une chaîne de texte (supporte markdown fences et texte autour).
 */
function extractJson(text) {
    // Essayer d'extraire depuis des fences markdown ```json ... ```
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch)
        return fenceMatch[1].trim();
    // Sinon, chercher la première { et dernière }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return text.slice(firstBrace, lastBrace + 1);
    }
    return text.trim();
}
exports.analyzePerfumeImage = functions.https.onCall({ region: 'europe-west1' }, async (request) => {
    const { imageBase64, imagesBase64 } = request.data;
    const isBurst = Array.isArray(imagesBase64) && imagesBase64.length > 0;
    const hasSingle = typeof imageBase64 === 'string' && imageBase64.length > 0;
    if (!isBurst && !hasSingle) {
        throw new functions.https.HttpsError('invalid-argument', 'Le paramètre "imageBase64" ou "imagesBase64" est requis.');
    }
    const images = isBurst ? imagesBase64 : [imageBase64];
    for (const img of images) {
        if (typeof img !== 'string' || !img.startsWith('data:image/')) {
            throw new functions.https.HttpsError('invalid-argument', "Chaque image doit être en base64 avec préfixe \"data:image/\".");
        }
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('internal', 'Clé API OpenAI non configurée.');
    }
    const openai = new openai_1.default({ apiKey });
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
    const callOpenAI = async (detail) => {
        return openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: SYSTEM_PROMPT },
                        ...images.map(img => ({ type: 'image_url', image_url: { url: img, detail } })),
                    ],
                },
            ],
            max_tokens: 500,
            temperature: 0.1,
        });
    };
    const parseResponse = (content, finishReason) => {
        if (!content || content.trim().length === 0) {
            console.error('[analyzePerfumeImage] Empty content, finish_reason:', finishReason);
            throw new functions.https.HttpsError('internal', "Réponse vide de l'IA.");
        }
        const jsonStr = extractJson(content);
        console.log('[analyzePerfumeImage] Parsed JSON length:', jsonStr.length);
        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        }
        catch (parseErr) {
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        const message = error instanceof Error ? error.message : 'Erreur inconnue.';
        console.error('OpenAI API error:', message);
        throw new functions.https.HttpsError('internal', "Échec de l'analyse IA. Veuillez réessayer.");
    }
});
//# sourceMappingURL=index.js.map