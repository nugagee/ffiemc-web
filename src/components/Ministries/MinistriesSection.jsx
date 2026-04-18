import React from "react";
import { motion } from "framer-motion";
import SectionWrapper from "../Layout/SectionWrapper";

const ministries = [
  {
    id: 1,
    name: "Youth Ministry",
    description: "Empowering the next generation with biblical values.",
    image: "/images/ministry1.jpg",
  },
  {
    id: 2,
    name: "Women of Faith",
    description: "Building strong women through prayer and mentorship.",
    image: "/images/ministry2.jpg",
  },
  {
    id: 3,
    name: "Men of Valor",
    description: "Raising men who lead with faith and integrity.",
    image: "/images/ministry3.jpg",
  },
];

const MinistriesSection = () => (
  <SectionWrapper id="ministries" className="bg-white">
    <h2 className="text-center text-3xl md:text-4xl font-heading font-bold text-[var(--color-text-dark)] mb-10">
      Our Ministries
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {ministries.map((m) => (
        <motion.div
          key={m.id}
          className="rounded-2xl overflow-hidden shadow-md bg-[var(--color-bg-light)] hover:shadow-xl cursor-pointer"
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0 },
          }}
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.4 }}
        >
          <img src={m.image} alt={m.name} className="h-52 w-full object-cover" />
          <div className="p-5">
            <h4 className="font-heading text-xl mb-2">{m.name}</h4>
            <p className="text-gray-600 text-sm">{m.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </SectionWrapper>
);

export default MinistriesSection;
