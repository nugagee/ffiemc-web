import React from "react";
import { motion } from "framer-motion";
import { Button } from "antd";
import { CalendarOutlined, HeartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "./journeyCTA.css";

const JourneyCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="journey-cta">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="journey-content"
      >
        <span className="journey-badge">🔥 Ready to Start Your Journey?</span>

        <h2>Experience God's Love Today</h2>

        <p>
          Join our church family and discover the life-changing power of God's
          love. We're here to walk with you every step of the way.
        </p>

        <div className="journey-actions">
          <Button
            size="large"
            icon={<CalendarOutlined />}
            className="visit-btn"
            onClick={() => navigate("/contact")}
          >
            Visit This Sunday
          </Button>

          <Button
            size="large"
            icon={<HeartOutlined />}
            className="prayer-btn"
            onClick={() => navigate("/contact")}
          >
            Request Prayer
          </Button>
        </div>
      </motion.div>
    </section>
  );
};

export default JourneyCTASection;
