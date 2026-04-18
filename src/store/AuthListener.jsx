import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { setUser, setAdminData, setAuthLoading, logout } from "./slices/authSlice";

/**
 * Listens to Firebase auth state and syncs to Redux.
 * Must be rendered inside Redux Provider.
 */
export default function AuthListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      dispatch(setAuthLoading(true));

      if (!firebaseUser) {
        dispatch(logout());
        localStorage.removeItem("adminUser");
        dispatch(setAuthLoading(false));
        return;
      }

      const adminRef = doc(db, "admins", firebaseUser.uid);
      const snap = await getDoc(adminRef);

      if (!snap.exists()) {
        dispatch(logout());
        dispatch(setAuthLoading(false));
        return;
      }

      dispatch(setUser(firebaseUser));
      dispatch(setAdminData({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...snap.data(),
      }));

      dispatch(setAuthLoading(false));
    });

    return unsubscribe;
  }, [dispatch]);

  return null;
}
