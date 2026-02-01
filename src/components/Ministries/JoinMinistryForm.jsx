import React from "react";
import { Form, Input, Button } from "antd";

const JoinMinistryForm = () => {
  const onFinish = (values) => {
    console.log("Form Data:", values);
  };

  return (
    <>
      <h3>Join Ministry</h3>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Full Name" required>
          <Input />
        </Form.Item>

        <Form.Item name="email" label="Email" required>
          <Input />
        </Form.Item>

        <Form.Item name="interest" label="Why do you want to join?">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Submit
        </Button>
      </Form>
    </>
  );
};

export default JoinMinistryForm;
