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
exports.sendWeatherNotifications = exports.transcribeVoice = exports.analyzePerfumeImage = exports.sendNotification = exports.checkPriceAlerts = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const openai_1 = __importDefault(require("openai"));
const weather_scoring_1 = require("./weather-scoring");
admin.initializeApp();
const db = admin.firestore();
/**
 * Cloud Function : checkPriceAlerts
 * Scheduled every 6 hours — checks all active price alerts for drops.
 * Utilise uniquement les données Firestore (bestPrice) — plus de dépendance à l'API Fragella.
 */
exports.checkPriceAlerts = (0, scheduler_1.onSchedule)('every 6 hours', async () => {
    const usersSnap = await db.collection('users').get();
    let alertsChecked = 0;
    let notificationsSent = 0;
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
            // Get parfum from Firestore
            let currentPrice = null;
            let parfumNom = '';
            let parfumMarque = '';
            try {
                const parfumDoc = await db.doc(`parfums/${parfumId}`).get();
                if (parfumDoc.exists) {
                    const p = parfumDoc.data();
                    currentPrice = typeof p.bestPrice === 'number' ? p.bestPrice : null;
                    parfumNom = p.nom ?? '';
                    parfumMarque = p.marque ?? '';
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
/**
 * Cloud Function : analyzePerfumeImage
 * Reçoit une image base64, appelle OpenAI GPT-4o Vision,
 * et retourne les informations du parfum détecté.
 */
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
/**
 * Cloud Function : transcribeVoice
 * Reçoit un fichier audio en base64, appelle OpenAI Whisper,
 * et retourne la transcription texte.
 * Fallback pour la recherche vocale quand le STT on-device échoue.
 */
exports.transcribeVoice = functions.https.onCall({ region: 'europe-west1' }, async (request) => {
    const { audioBase64, mimeType } = request.data;
    if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Le paramètre "audioBase64" est requis.');
    }
    if (typeof mimeType !== 'string' || mimeType.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Le paramètre "mimeType" est requis.');
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('internal', 'Clé API OpenAI non configurée.');
    }
    const openai = new openai_1.default({ apiKey });
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB limit
    if (audioBase64.length > MAX_BYTES * 1.37) {
        throw new functions.https.HttpsError('invalid-argument', 'Fichier audio trop volumineux (max 10 Mo).');
    }
    const buffer = Buffer.from(audioBase64, 'base64');
    const file = new File([buffer], 'audio.m4a', { type: mimeType });
    try {
        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file,
            response_format: 'text',
        });
        console.log('[transcribeVoice] Transcription:', transcription);
        return { text: transcription };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue.';
        console.error('[transcribeVoice] Whisper error:', message);
        throw new functions.https.HttpsError('internal', 'Échec de la transcription vocale. Veuillez réessayer.');
    }
});
/**
 * Cloud Function : sendWeatherNotifications
 * Scheduled every day at 7:00 AM Europe/Paris.
 * Sends a personalised perfume suggestion based on current weather.
 */
exports.sendWeatherNotifications = (0, scheduler_1.onSchedule)({
    schedule: '0 7 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
}, async () => {
    const usersSnap = await db.collection('users').get();
    let processed = 0;
    let sent = 0;
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        let settings = {};
        try {
            const settingsDoc = await db.doc(`users/${uid}/settings/preferences`).get();
            settings = settingsDoc.data() ?? {};
        }
        catch {
            continue;
        }
        if (settings.pushNotifs !== true || settings.weatherNotifs !== true)
            continue;
        if (typeof settings.weatherLat !== 'number' || typeof settings.weatherLon !== 'number')
            continue;
        const weather = await (0, weather_scoring_1.fetchWeatherForServer)(settings.weatherLat, settings.weatherLon);
        if (!weather)
            continue;
        let wardrobeItems = [];
        try {
            const wardrobeSnap = await db.collection(`users/${uid}/wardrobe`).get();
            wardrobeItems = wardrobeSnap.docs
                .map(d => ({ parfumId: d.id, ...d.data() }))
                .filter(i => i.ownership === 'have');
        }
        catch {
            continue;
        }
        if (wardrobeItems.length === 0)
            continue;
        const scored = wardrobeItems
            .map(item => ({ item, score: (0, weather_scoring_1.scoreItemForWeather)(item, weather) }))
            .sort((a, b) => b.score - a.score);
        const top = scored[0];
        if (!top || top.score < 30)
            continue;
        processed++;
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
        const wmo = WMO_META[weather.weatherCode] ?? WMO_META[1];
        const icon = weather.isDay ? wmo.icon : (NIGHT_ICON[wmo.icon] ?? wmo.icon);
        const emoji = (0, weather_scoring_1.weatherEmoji)(icon);
        const title = `${emoji} ${Math.round(weather.temperature)}°C`;
        const body = `Aujourd'hui : ${top.item.nom ?? '?'} de ${top.item.marque ?? '?'} (${top.score}% compatible)`;
        const message = {
            tokens,
            notification: { title, body },
            data: { type: 'weather-suggestion', parfumId: top.item.parfumId },
            android: { notification: { channelId: 'weather_suggestions', priority: 'high' } },
        };
        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            sent += response.successCount;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[sendWeatherNotifications] Failed to notify ${uid}:`, msg);
        }
    }
    console.log(`[sendWeatherNotifications] Done — ${processed} users processed, ${sent} notifications sent`);
});
const NIGHT_ICON = {
    sunny: 'moon',
    'partly-sunny': 'cloudy-night',
};
const WMO_META = {
    0: { label: 'Ensoleillé', icon: 'sunny', seasonBoost: {} },
    1: { label: 'Clair', icon: 'partly-sunny', seasonBoost: {} },
    2: { label: 'Nuageux', icon: 'cloudy', seasonBoost: {} },
    3: { label: 'Couvert', icon: 'cloudy', seasonBoost: {} },
    45: { label: 'Brouillard', icon: 'cloudy', seasonBoost: {} },
    48: { label: 'Brouillard', icon: 'cloudy', seasonBoost: {} },
    51: { label: 'Bruine', icon: 'rainy-outline', seasonBoost: {} },
    53: { label: 'Bruine', icon: 'rainy-outline', seasonBoost: {} },
    55: { label: 'Bruine', icon: 'rainy-outline', seasonBoost: {} },
    56: { label: 'Verglas', icon: 'snow', seasonBoost: {} },
    57: { label: 'Verglas', icon: 'snow', seasonBoost: {} },
    61: { label: 'Pluie', icon: 'rainy', seasonBoost: {} },
    63: { label: 'Pluie', icon: 'rainy', seasonBoost: {} },
    65: { label: 'Pluie forte', icon: 'rainy', seasonBoost: {} },
    66: { label: 'Verglas', icon: 'snow', seasonBoost: {} },
    67: { label: 'Verglas', icon: 'snow', seasonBoost: {} },
    71: { label: 'Neige', icon: 'snow', seasonBoost: {} },
    73: { label: 'Neige', icon: 'snow', seasonBoost: {} },
    75: { label: 'Neige forte', icon: 'snow', seasonBoost: {} },
    77: { label: 'Neige', icon: 'snow', seasonBoost: {} },
    80: { label: 'Averses', icon: 'rainy-outline', seasonBoost: {} },
    81: { label: 'Averses', icon: 'rainy-outline', seasonBoost: {} },
    82: { label: 'Averses', icon: 'thunderstorm-outline', seasonBoost: {} },
    85: { label: 'Neige', icon: 'snow', seasonBoost: {} },
    86: { label: 'Neige', icon: 'snow', seasonBoost: {} },
    95: { label: 'Orage', icon: 'thunderstorm', seasonBoost: {} },
    96: { label: 'Orage', icon: 'thunderstorm', seasonBoost: {} },
    99: { label: 'Orage', icon: 'thunderstorm', seasonBoost: {} },
};
//# sourceMappingURL=index.js.map