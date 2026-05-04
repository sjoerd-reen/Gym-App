import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const authReady = signInAnonymously(auth).catch(console.error);

// ── Images ────────────────────────────────────────────────────────────────────

export async function uploadImageToFirestore(base64String: string): Promise<string> {
  await authReady;
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await setDoc(doc(db, "exercise_images", imageId), {
    dataUrl: base64String,
    createdAt: Date.now(),
  });
  return `firestore://${imageId}`;
}

export async function getImageUrlFromFirestore(firestoreUrl: string): Promise<string | null> {
  if (!firestoreUrl.startsWith("firestore://")) return firestoreUrl;
  await authReady;
  const imageId = firestoreUrl.replace("firestore://", "");
  const snap = await getDoc(doc(db, "exercise_images", imageId));
  return snap.exists() ? snap.data().dataUrl : null;
}

// ── Routines ──────────────────────────────────────────────────────────────────

export async function saveRoutinesToFirestore(user: string, routines: unknown[]): Promise<void> {
  await authReady;
  await setDoc(doc(db, "routines", user.toLowerCase()), { data: routines, updatedAt: Date.now() });
}

export async function loadRoutinesFromFirestore(user: string): Promise<unknown[] | null> {
  await authReady;
  const snap = await getDoc(doc(db, "routines", user.toLowerCase()));
  if (!snap.exists()) return null;
  return snap.data().data ?? null;
}
