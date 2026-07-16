import { FirebaseError } from 'firebase/app';

const firebaseMessages: Record<string, string> = {
  'auth/email-already-in-use': 'An account already exists for this email. Try signing in.',
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow popups and retry.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled before it finished.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
};

export function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return firebaseMessages[error.code] ?? 'Firebase could not sign you in. Please try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
