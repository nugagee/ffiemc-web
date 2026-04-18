import React from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import "./SectionWrapper.css";

const SectionWrapper = ({
  id,
  children,
  className = "",
  style = {},
  delay = 0.1,
  duration = 0.6,
  y = 60,
  once = true,
  stagger = 0.15,
}) => {
  return (
    <motion.section
      id={id}
      className={`section-wrapper ${className}`}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      viewport={{ once }}
    >
      <motion.div
        className="section-inner"
        initial="hidden"
        whileInView="visible"
        viewport={{ once }}
        variants={{
          visible: { transition: { staggerChildren: stagger } },
        }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
};

SectionWrapper.propTypes = {
  id: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
  delay: PropTypes.number,
  duration: PropTypes.number,
  y: PropTypes.number,
  once: PropTypes.bool,
  stagger: PropTypes.number,
};

export default SectionWrapper;
