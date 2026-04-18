import React from "react";
import { motion } from "framer-motion";
import SectionWrapper from "../Layout/SectionWrapper";

const testimonials = [
  {
    id: 1,
    name: "Sister Grace Akintayo",
    text: "God has changed my life through this ministry — I’ve found peace and community.",
    avatar: "/images/test1.jpg",
    role: "Member",
  },
  {
    id: 2,
    name: "Brother Michael Oduro",
    text: "The love of Christ I experienced here has transformed my family and faith.",
    avatar: "/images/test2.jpg",
    role: "Member",
  },
];

const TestimonialsSection = () => (
  <SectionWrapper id="testimonials" className="bg-[var(--color-bg-light)]">
    <h2 className="text-center text-3xl md:text-4xl font-heading font-bold mb-10 text-[var(--color-text-dark)]">
      What God is Doing
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {testimonials.map((t) => (
        <motion.div
          key={t.id}
          className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl"
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0 },
          }}
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-gray-700 italic mb-4">“{t.text}”</p>
          <div className="flex items-center gap-3">
            <img
              src={t.avatar}
              alt={t.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-gray-500">{t.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </SectionWrapper>
);

export default TestimonialsSection;
