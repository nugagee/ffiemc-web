import React from "react";
import { Button } from "antd";

const PrimaryButton = ({
  text,
  variant = "solid",
  onClick,
  loading = false,
  disabled = false,
}) => {
  const getButtonProps = () => {
    switch (variant) {
      case "outline":
        return { type: "default" };
      case "text":
        return { type: "text" };
      default:
        return { type: "primary" };
    }
  };

  return (
    <Button
      {...getButtonProps()}
      shape="round"
      onClick={onClick}
      loading={loading}
      disabled={disabled}
    >
      {text}
    </Button>
  );
};

export default PrimaryButton;
