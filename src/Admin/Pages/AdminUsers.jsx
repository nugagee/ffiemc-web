import { Form, Input, Select, Button, Card, message } from "antd";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { v4 as uuid } from "uuid";
import { db } from "../../services/firebase";
import logo from "../../assets/img/Logo png.png";
import "./index.css";
import { useState } from "react";

export default function AdminUsers() {
  const [loading, setLoading] = useState(false); // State for button loading
  const token = uuid();

  const onFinish = async (values) => {
    setLoading(true); // Start loading
    try {
      await addDoc(collection(db, "admins"), {
        ...values,
        status: "approved",
        uid: token,
        createdAt: serverTimestamp(),
      });
      message.success("User created successfully!"); // Success toast
    } catch (error) {
      message.error("Error creating user: " + error.message); // Error toast
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-logo">
        <img src={logo} alt="Church Logo" />
      </div>
      <Card title="Create Admin User" className="auth-card">
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role!" }]}
          >
            <Select
              options={[
                { value: "admin", label: "Admin" },
                { value: "editor", label: "Editor" },
                { value: "viewer", label: "Viewer" },
              ]}
            />
          </Form.Item>

          <Form.Item name="permissions" label="Permissions">
            <Select
              mode="multiple"
              options={[
                { value: "approve", label: "Approve" },
                { value: "edit", label: "Edit" },
                { value: "publish", label: "Publish" },
              ]}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </Button>
        </Form>
      </Card>
    </div>
  );
}