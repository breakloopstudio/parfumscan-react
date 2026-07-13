// src/utils/error-translator.ts
// Mapping des codes d'erreur Firebase vers messages en français.

const AUTH_ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'Cet email est déjà utilisé.',
  'auth/invalid-email': "L'adresse email n'est pas valide.",
  'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
  'auth/network-request-failed': 'Problème de connexion réseau.',
  'auth/internal-error': 'Une erreur interne est survenue.',
  'auth/popup-closed-by-user': 'Fenêtre de connexion fermée.',
};

const FIRESTORE_ERROR_MAP: Record<string, string> = {
  'permission-denied': 'Permission refusée.',
  'not-found': 'Document introuvable.',
  'already-exists': 'Ce document existe déjà.',
  'resource-exhausted': 'Quota dépassé. Réessayez plus tard.',
  'unavailable': 'Service temporairement indisponible.',
};

export function translateFirebaseError(error: unknown): string {
  if (error instanceof Error) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code) {
      const message =
        AUTH_ERROR_MAP[firebaseError.code] ??
        FIRESTORE_ERROR_MAP[firebaseError.code];
      if (message) return message;
    }
    return error.message;
  }
  return 'Une erreur inattendue est survenue.';
}
