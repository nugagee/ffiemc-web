import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firestore";

export async function logActivity({
  action,
  description,
  user,
  targetType,
  targetId,
}) {
  await addDoc(collection(db, "activityLogs"), {
    action,
    description,
    targetType,
    targetId,
    performedBy: {
      uid: user.uid,
      name: user.displayName || user.email,
      role: user.role,
    },
    createdAt: serverTimestamp(),
  });
}


//N.B: You’ll call this everywhere (approvals, edits, deletes).