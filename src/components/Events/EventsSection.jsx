import React from "react";
import { motion } from "framer-motion";
import "./events.css";

const events = [
  {
    id: 1,
    type: "Featured",
    date: "Mar 15",
    time: "9:00 AM",
    title: "Holy Ghost Fire Conference",
    description:
      "A powerful conference focused on receiving the baptism of the Holy Spirit and fire",
    location: "Main Auditorium",
    featured: true,
  },
  {
    id: 2,
    type: "Event",
    date: "Feb 28",
    time: "6:00 PM",
    title: "Youth Revival",
    description:
      "Special revival service for young people to encounter God's transforming power",
    location: "Youth Hall",
  },
  {
    id: 3,
    type: "Event",
    date: "Mar 8",
    time: "4:00 PM",
    title: "Marriage Enrichment Seminar",
    description:
      "Building stronger marriages through biblical principles",
    location: "Conference Room",
  },
];

const EventsHighlightSection = () => {
  return (
    <section className="events-highlight-section">
      <div className="container">
        <span className="events-pill">What’s Happening</span>
        <h2 className="events-title">Upcoming Events</h2>
        <p className="events-subtitle">
          Join us for these exciting opportunities to worship, learn, and grow
          together in faith.
        </p>

        <div className="events-grid">
          {events.map((event) => (
            <motion.div
              key={event.id}
              className="event-card"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="event-card-header">
                <span
                  className={`event-tag ${
                    event.featured ? "featured" : ""
                  }`}
                >
                  {event.type}
                </span>

                <div className="event-date">
                  <strong>{event.date}</strong>
                  <span>{event.time}</span>
                </div>
              </div>

              <h3>{event.title}</h3>
              <p className="event-desc">{event.description}</p>

              <div className="event-location">
                <span>📍 {event.location}</span>
              </div>

              <button className="learn-more-btn">Learn More</button>
            </motion.div>
          ))}
        </div>

        <div className="events-cta">
          <button className="view-all-btn">View All Events</button>
        </div>
      </div>
    </section>
  );
};

export default EventsHighlightSection;
