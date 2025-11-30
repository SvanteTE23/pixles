// Firebase configuration
// You need to replace these values with your Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBZ6pNVpIcQceL8H-fVouixxJ88zZVzwWY",
  authDomain: "pixels-be1e1.firebaseapp.com",
  projectId: "pixels-be1e1",
  storageBucket: "pixels-be1e1.firebasestorage.app",
  messagingSenderId: "74165407986",
  appId: "1:74165407986:web:69d6ac3b5dcf33882fc06b",
  measurementId: "G-CXTG0TKS08"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const firebaseSignIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const firebaseSignUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const firebaseSignInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const firebaseSignOut = () => {
  return signOut(auth);
};

export const firebaseSendPasswordReset = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const firebaseChangePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user logged in');
  
  // Re-authenticate user before changing password
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  
  // Update password
  return updatePassword(user, newPassword);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export { auth };
