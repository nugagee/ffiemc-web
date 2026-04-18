import React from "react";
import "./events.css";

const EventsSection = ({ events }) => {
  return (
    <section className="events-section">
      <div className="container">
        <h2 className="section-title">Upcoming Events</h2>
        <div className="events-grid">
          {events.map((event, i) => (
            <div key={i} className="event-card">
              <span className="event-date">{event.date}</span>
              <h4>{event.title}</h4>
              <p>{event.description}</p>
              <button className="event-btn">Learn More</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
