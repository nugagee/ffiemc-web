import React, { useState } from "react";
import { Modal, Form, Input, Button, message } from "antd";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

const { TextArea } = Input;

const CONTACT_COLLECTION = "contactSubmissions";

const ContactModal = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, CONTACT_COLLECTION), {
        name: values.name,
        address: values.address,
        email: values.email,
        phone: values.phone,
        prayerRequest: values.prayerRequest,
        createdAt: serverTimestamp(),
      });
      message.success("Thank you! Your message has been sent. We will be in touch soon.");
      form.resetFields();
      onClose();
    } catch (error) {
      console.error("Contact form error:", error);
      message.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Contact Us"
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      centered
      width={480}
      styles={{
        header: { borderBottom: "1px solid #f0f0f0" },
        body: { paddingTop: 24 },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: "Please enter your name" }]}
        >
          <Input placeholder="Your full name" size="large" />
        </Form.Item>

        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, message: "Please enter your address" }]}
        >
          <Input placeholder="Your address" size="large" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input placeholder="your@email.com" size="large" type="email" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[{ required: true, message: "Please enter your phone number" }]}
        >
          <Input placeholder="+234 800 000 0000" size="large" />
        </Form.Item>

        <Form.Item
          name="prayerRequest"
          label="Prayer Request"
          rules={[{ required: true, message: "Please share your prayer request" }]}
        >
          <TextArea
            placeholder="Share your prayer request with us..."
            rows={4}
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            block
            size="large"
            style={{
              background: "var(--color-primary)",
              borderColor: "var(--color-primary)",
            }}
          >
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ContactModal;
