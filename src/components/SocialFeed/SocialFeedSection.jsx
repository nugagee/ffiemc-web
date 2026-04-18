import React from "react";
import { motion } from "framer-motion";
import SectionWrapper from "../Layout/SectionWrapper";

const feeds = [
  {
    id: 1,
    platform: "Instagram",
    text: "What an amazing worship service this Sunday!",
    image: "/images/feed1.jpg",
    time: "2h ago",
  },
  {
    id: 2,
    platform: "Facebook",
    text: "Join us for Youth Revival this Friday 🔥",
    image: "/images/feed2.jpg",
    time: "1d ago",
  },
  {
    id: 3,
    platform: "X",
    text: "‘Where two or three gather in my name, there I am with them.’ – Matthew 18:20",
    image: "/images/feed3.jpg",
    time: "3d ago",
  },
];

const SocialFeedSection = () => (
  <SectionWrapper id="social" className="bg-white">
    <h2 className="text-center text-3xl md:text-4xl font-heading font-bold mb-10 text-[var(--color-text-dark)]">
      Follow Our Journey
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {feeds.map((f) => (
        <motion.div
          key={f.id}
          className="bg-[var(--color-bg-light)] rounded-2xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer"
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0 },
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.4 }}
        >
          <img src={f.image} alt={f.platform} className="w-full h-48 object-cover" />
          <div className="p-4">
            <h4 className="font-semibold text-lg mb-1">{f.platform}</h4>
            <p className="text-gray-600 text-sm mb-2">{f.text}</p>
            <span className="text-xs text-gray-400">{f.time}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </SectionWrapper>
);

export default SocialFeedSection;
