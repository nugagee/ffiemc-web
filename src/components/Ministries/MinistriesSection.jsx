import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Modal, Skeleton } from "antd";
import { useNavigate } from "react-router-dom";
import JoinMinistryForm from "./JoinMinistryForm";
import "./MinistriesSection.css";
import img1 from '../../assets/img/you_1.jpg';
import img2 from '../../assets/img/cr_2.jpg';
import img3 from '../../assets/img/cr_1.jpg';

const ministriesData = [
  {
    id: "youth",
    title: "Fire Youth Ministry",
    tag: "Fire Youth Ministry",
    description: "Empowering young people to live boldly for Christ",
    leader: "Pastor Michael Ade",
    time: "Saturdays 4:00 PM",
    image: img1,
    fullText:
      "Our youth ministry equips young believers through worship, teaching, and mentorship.",
  },
  {
    id: "women",
    title: "Women of Fire",
    tag: "Women of Fire",
    description: "Building godly women who impact families and communities",
    leader: "Pastor Grace Moronranti",
    time: "First Saturday Monthly 10:00 AM",
    image: img2,
    fullText:
      "A fellowship empowering women spiritually and socially.",
  },
  {
    id: "men",
    title: "Men of Valor",
    tag: "Men of Valor",
    description: "Raising strong men of God who lead with integrity",
    leader: "Deacon John Adebayo",
    time: "Third Saturday Monthly 6:00 AM",
    image: img3,
    fullText:
      "Developing men of faith, leadership, and character.",
  },
];

const MinistriesSection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeMinistry, setActiveMinistry] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="ministries-section">
      <div className="ministries-header">
        <span className="section-tag">Get Involved</span>
        <h2>Our Ministries</h2>
        <p>Find your place to serve, grow, and make a difference.</p>
      </div>

      <div className="ministries-grid">
        {(loading ? Array.from({ length: 3 }) : ministriesData).map(
          (m, index) =>
            loading ? (
              <Skeleton key={index} active className="ministry-skeleton" />
            ) : (
              <motion.div
                key={m.id}
                className="ministry-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.1,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className="ministry-image"
                  onClick={() => setActiveMinistry(m)}
                >
                  <img src={m.image} alt={m.title} />
                  <span className="ministry-tag">{m.tag}</span>
                </div>

                <div className="ministry-content">
                  <h3>{m.title}</h3>
                  <p className="description">{m.description}</p>

                  <div className="meta">
                    <span>👤 {m.leader}</span>
                    <span>⏰ {m.time}</span>
                  </div>

                  <button
                    className="join-btn"
                    onClick={() => setJoinOpen(true)}
                  >
                    Join Ministry
                  </button>

                  <button
                    className="details-link"
                    onClick={() => navigate(`/ministries/${m.id}`)}
                  >
                    View Details →
                  </button>
                </div>
              </motion.div>
            )
        )}
      </div>

      {/* DETAILS MODAL */}
      <Modal
        open={!!activeMinistry}
        footer={null}
        onCancel={() => setActiveMinistry(null)}
        width={700}
      >
        {activeMinistry && (
          <>
            <h2>{activeMinistry.title}</h2>
            <p>{activeMinistry.fullText}</p>
            <p><strong>Leader:</strong> {activeMinistry.leader}</p>
            <p><strong>Schedule:</strong> {activeMinistry.time}</p>
          </>
        )}
      </Modal>

      {/* JOIN FORM MODAL */}
      <Modal
        open={joinOpen}
        footer={null}
        onCancel={() => setJoinOpen(false)}
        width={500}
      >
        <JoinMinistryForm />
      </Modal>

      <div className="explore-wrapper">
        <button className="explore-btn">Explore All Ministries</button>
      </div>
    </section>
  );
};

export default MinistriesSection;
