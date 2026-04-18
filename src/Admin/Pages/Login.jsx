import { Form, Input, Button, Card, message, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../../store/hooks/useAuth";
import { login } from "../../store/thunks/authThunks";
import logo from "../../assets/img/Logo png.png";
import "./index.css";

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const onFinish = async ({ email, password }) => {
    try {
      const result = await dispatch(login({ email, password })).unwrap();

      if (result) {
        message.success("Login successful");
        navigate("/admin/dashboard");
      }
    } catch (err) {
      message.error(err || "Unable to sign in. Try again.");
    }
  };

  if (loading) return <Spin fullscreen />;
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
