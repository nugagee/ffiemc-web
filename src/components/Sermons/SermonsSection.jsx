import React from "react";
import { motion } from "framer-motion";
import SectionWrapper from "../Layout/SectionWrapper";

const sermons = [
  {
    id: 1,
    title: "Walking in the Fire of God",
    speaker: "Pastor John Doe",
    date: "Oct 6, 2025",
    thumbnail: "/images/sermon1.jpg",
  },
  {
    id: 2,
    title: "Teaching One by One Another",
    speaker: "Rev. Jane Smith",
    date: "Oct 13, 2025",
    thumbnail: "/images/sermon2.jpg",
  },
];

const SermonsSection = () => (
  <SectionWrapper id="sermons" className="bg-[var(--color-bg-light)]">
    <h2 className="text-center text-3xl md:text-4xl font-heading font-bold text-[var(--color-text-dark)] mb-10">
      Latest Sermons
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
      {sermons.map((s) => (
        <motion.div
          key={s.id}
          className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl"
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0 },
          }}
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.4 }}
        >
          <img
            src={s.thumbnail}
            alt={s.title}
            className="w-full h-56 object-cover"
          />
          <div className="p-5">
            <h4 className="font-heading text-xl mb-2">{s.title}</h4>
            <p className="text-sm text-gray-500">{s.speaker}</p>
            <span className="text-xs text-gray-400">{s.date}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </SectionWrapper>
);

export default SermonsSection;
