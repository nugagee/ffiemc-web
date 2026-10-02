import React from "react";
import { Form, Input, Button } from "antd";
import { validateEmail } from "../../lib/emailValidation";

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

        <Form.Item
          name="email"
          label="Email"
          rules={[
            {
              validator: (_, value) => {
                const result = validateEmail(value, { required: true });
                if (result.ok) return Promise.resolve();
                const hint = result.suggestion ? `${result.message} (${result.suggestion})` : result.message;
                return Promise.reject(new Error(hint));
              },
            },
          ]}
        >
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
