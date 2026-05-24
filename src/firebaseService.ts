import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Score } from './types';

const SCORES_COLLECTION = 'scores';

/**
 * Fetch top high scores from Firestore
 */
export async function fetchTopScores(limitNumber: number = 10): Promise<Score[]> {
  try {
    const scoresRef = collection(db, SCORES_COLLECTION);
    const q = query(
      scoresRef, 
      orderBy('score', 'desc'), 
      limit(limitNumber)
    );
    const querySnapshot = await getDocs(q);
    const scores: Score[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      scores.push({
        id: doc.id,
        userId: data.userId,
        username: data.username,
        photoURL: data.photoURL || '',
        score: Number(data.score),
        isGuest: Boolean(data.isGuest),
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });
    
    return scores;
  } catch (error) {
    console.error('Failed to fetch top scores from Firestore, falling back to local list:', error);
    // Since we want standard robust fallback, we just return empty array and handle in UI
    // rather than crashing, but we still log it.
    return [];
  }
}

/**
 * Add a new score to the database
 */
export async function submitScore(scoreData: Omit<Score, 'createdAt'>): Promise<string | null> {
  const path = SCORES_COLLECTION;
  try {
    const scoresRef = collection(db, path);
    const docRef = await addDoc(scoresRef, {
      ...scoreData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return null;
  }
}

/**
 * Fetch the personal best score for a specific user from Firestore
 */
export async function fetchUserPersonalBest(userId: string): Promise<number> {
  try {
    const scoresRef = collection(db, SCORES_COLLECTION);
    const q = query(
      scoresRef,
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return Number(doc.data().score || 0);
    }
    return 0;
  } catch (error) {
    console.error('Failed to fetch personal best from cloud:', error);
    return 0;
  }
}
