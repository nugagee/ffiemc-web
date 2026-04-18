import store from "./index";
import { logout } from "./slices/authSlice";

export const removeState = () => {
  store.dispatch(logout());
  localStorage.removeItem("adminUser");
};
