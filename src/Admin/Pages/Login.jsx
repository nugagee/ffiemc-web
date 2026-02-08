import { Form, Input, Button, Card, message } from "antd";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { useAuth } from "../Auth/AuthContext";
import logo from "../../assets/img/Logo png.png";
import "./index.css";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "../Auth/authStore";

export default function AdminLogin() {
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const authContext = useAuth();

  if (!authContext) {
    return <div>Loading...</div>; // Handle the case where useAuth returns null
  }
  const { isAuthenticated } = authContext;

  const onFinish = async ({ email, password }) => {
    // try {
    //   await signInWithEmailAndPassword(auth, email, password);

    //   message.success("Welcome back");
    //   navigate("/admin/dashboard");
    // } catch (err) {
    //   message.error(
    //     err.code === "auth/invalid-credential"
    //       ? "Invalid email or password"
    //       : "Unable to sign in"
    //   );
    // }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      console.log("Login page - isAuthenticated:", cred.user);

      const adminRef = doc(db, "admins", "6Vb8pXbNGFxWwQLOxSXd");
    //   const adminRef = doc(db, "admins", cred.user.uid);
      const adminSnap = await getDoc(adminRef);

      console.log("Admin Snapshot Data:", adminSnap.data());

      if (!adminSnap.exists()) {
        message.error("You are not authorized to access the admin portal.");
        return;
      }

      const adminData = {
        uid: cred.user.uid,
        email: cred.user.email,
        ...adminSnap.data(),
      };

      // Persist session
      setUser(adminData);
      localStorage.setItem("adminUser", JSON.stringify(adminData));

      message.success("Login successful");
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      message.error(
        err.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : "Unable to sign in. Try again."
      );
    }
  };

  if (isAuthenticated) {
    navigate("/admin/dashboard");
    return null;
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-logo">
        <img src={logo} alt="Church Logo" />
      </div>
      <Card title="Admin Login" className="auth-card">
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 6, message: "Minimum 6 characters" },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Sign In
          </Button>
        </Form>
      </Card>
    </div>
  );
}
