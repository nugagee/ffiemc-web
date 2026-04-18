import React from "react";
import "./button.css";

const PrimaryButton = ({ text, variant = "solid" }) => {
  return (
    <button className={`primary-btn ${variant}`}>
      {text}
    </button>
  );
};

export default PrimaryButton;
