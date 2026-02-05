// services/socialFeedService.js
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";

export async function fetchSocialFeeds() {
  const q = query(
    collection(db, "social_feeds"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
