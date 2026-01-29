import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SermonSkeleton from "./SermonSkeleton";
import SermonModal from "./SermonModal";
import "./SermonsSection.css";

export default function LatestSermonsSection() {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState("");
  const [mediaType, setMediaType] = useState("");

  const sermons = [
    {
      id: 1,
      series: "Fire Series",
      title: "Walking in the Fire of God",
      pastor: "Pastor S.O. Moronranti",
      date: "26/01/2025",
      description:
        "Understanding how to maintain the fire of God in your daily walk",
      scripture: "Acts 2:1-4",
      video: "https://www.facebook.com/watch/?v=123456789",
      audio: "firefirechurch/walking-in-the-fire",
    },
    {
      id: 2,
      series: "Discipleship",
      title: "Teach One by One Another",
      pastor: "Pastor S.O. Moronranti",
      date: "19/01/2025",
      description:
        "The importance of discipleship and teaching in the body of Christ",
      scripture: "Matthew 28:19-20",
      video: "https://www.facebook.com/watch/?v=987654321",
      audio: "firefirechurch/teach-one-another",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="sermons-section">
      <div className="sermons-container">
        <span className="sermons-pill">Messages</span>
        <h2 className="sermons-title">Latest Sermons</h2>
        <p className="sermons-subtitle">
          Be encouraged and inspired by powerful messages from God's Word.
        </p>

        <div className="sermons-grid">
          {loading
            ? [...Array(2)].map((_, i) => <SermonSkeleton key={i} />)
            : sermons.map((sermon) => (
                <motion.div
                  key={sermon.id}
                  className="sermon-card"
                  whileHover={{ opacity: 0.85 }}
                >
                  <span className="sermon-series">{sermon.series}</span>
                  <h3>{sermon.title}</h3>
                  <p className="sermon-meta">
                    {sermon.pastor} • {sermon.date}
                  </p>
                  <p className="sermon-desc">{sermon.description}</p>
                  <p className="sermon-scripture">
                    <strong>Scripture:</strong> {sermon.scripture}
                  </p>

                  <div className="sermon-actions">
                    <button
                      className="watch-btn"
                      onClick={() => {
                        setActiveMedia(sermon.video);
                        setMediaType("video");
                        setModalOpen(true);
                      }}
                    >
                      ▶ Watch
                    </button>

                    <button
                      className="listen-btn"
                      onClick={() => {
                        setActiveMedia(sermon.audio);
                        setMediaType("audio");
                        setModalOpen(true);
                      }}
                    >
                      🎧 Listen
                    </button>
                  </div>

                  <div
                    className="play-icon"
                    onClick={() => {
                      setActiveMedia(sermon.video);
                      setMediaType("video");
                      setModalOpen(true);
                    }}
                  >
                    ▶
                  </div>
                </motion.div>
              ))}
        </div>

        <button className="view-all-btn">View All Sermons</button>
      </div>

      <SermonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mediaUrl={activeMedia}
        type={mediaType}
      />
    </section>
  );
}
