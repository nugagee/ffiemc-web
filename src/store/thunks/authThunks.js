import { createAsyncThunk } from "@reduxjs/toolkit";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import { setUser, setAdminData, setAuthLoading, setAuthError, logout } from "../slices/authSlice";

// Login with Firebase + Firestore admin check
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setAuthLoading(true));
      dispatch(setAuthError(null));

      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Check if user is admin in Firestore
      const adminRef = doc(db, "admins", cred.user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        await signOut(auth);
        return rejectWithValue("You are not authorized to access the admin portal.");
      }

      const adminData = {
        uid: cred.user.uid,
        email: cred.user.email,
        ...adminSnap.data(),
      };

      dispatch(setUser(cred.user));
      dispatch(setAdminData(adminData));

      // Persist to localStorage for session recovery
      localStorage.setItem("adminUser", JSON.stringify(adminData));

      return { user: cred.user, adminData };
    } catch (error) {
      const message =
        error.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : error.message || "Unable to sign in. Try again.";
      dispatch(setAuthError(message));
      return rejectWithValue(message);
    } finally {
      dispatch(setAuthLoading(false));
    }
  }
);

// Logout - sign out from Firebase and clear Redux state
export const logoutUser = () => async (dispatch) => {
  try {
    await signOut(auth);
  } finally {
    dispatch(logout());
    localStorage.removeItem("adminUser");
  }
};
