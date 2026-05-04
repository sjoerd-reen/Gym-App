import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Sign in anonymously so we can read/write to Firestore securely
const authReady = signInAnonymously(auth).catch(console.error);

export async function uploadImageToFirestore(base64String: string): Promise<string> {
  await authReady;
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await setDoc(doc(db, "exercise_images", imageId), {
    dataUrl: base64String,
    createdAt: Date.now()
  });
  return `firestore://${imageId}`;
}

export async function getImageUrlFromFirestore(firestoreUrl: string): Promise<string | null> {
  if (!firestoreUrl.startsWith("firestore://")) return firestoreUrl;
  await authReady;
  const imageId = firestoreUrl.replace("firestore://", "");
  const docSnap = await getDoc(doc(db, "exercise_images", imageId));
  
  if (docSnap.exists()) {
    return docSnap.data().dataUrl;
  }
  return null;
}


