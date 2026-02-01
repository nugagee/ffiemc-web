import React from "react";
import { Carousel } from "antd";
import { motion } from "framer-motion";
import "./TestimonialsSection.css";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { chunkArray } from "../../components/Utils/chunkArray";
import { useIsDesktop } from "../../components/Hooks/useIsDesktop";
import img1 from "../../assets/img/test/tes_1.jpg";
import img2 from "../../assets/img/test/tes_2.jpg";
import img3 from "../../assets/img/test/tes_3.jpg";

export const PrevArrow = (props) => {
  const { onClick } = props;
  return (
    <div className="testimonial-arrow left" onClick={onClick}>
      <LeftOutlined />
    </div>
  );
};

export const NextArrow = (props) => {
  const { onClick } = props;
  return (
    <div className="testimonial-arrow right" onClick={onClick}>
      <RightOutlined />
    </div>
  );
};

const testimonials = [
  {
    name: "Sister Grace Adebayo",
    role: "Church Member",
    since: "Member since 2020",
    image: img1,
    content:
      "God completely transformed my life when I joined Fire-Fire International. I was broken and lost, but through the love and support of this church family, I found healing and purpose. Pastor Moronranti's teachings helped me understand God's plan for my life.",
  },
  {
    name: "Brother Michael Okonkwo",
    role: "Youth Leader",
    since: "Member since 2019",
    image: img2,
    content:
      "This church didn't just change my life – it saved it. I was heading down a wrong path as a young man, but the youth ministry here showed me a better way. Now I'm leading other young people to Christ and seeing God work miracles.",
  },
  {
    name: "Sister Pelumi Adebayo",
    role: "Youth Leader",
    since: "Member since 2019",
    image: img3,
    content:
      "This church didn't just change my life – it saved it. I was heading down a wrong path as a young man, but the youth ministry here showed me a better way. Now I'm leading other young people to Christ and seeing God work miracles.",
  },
];

const TestimonialsSection = () => {
  const isDesktop = useIsDesktop();
  const slides = chunkArray(testimonials, isDesktop ? 2 : 1);

  return (
    <section className="testimonial-section">
      <div className="ministries-header">
        <span className="section-tag">Life Changing Stories</span>
        <h2>What God is Doing</h2>
        <p>
          Hear from our church family members about how God has transformed
          their lives through His love and our community.
        </p>
      </div>
      <Carousel
        autoplay
        autoplaySpeed={5000}
        dots
        pauseOnHover
        draggable
        arrows
        prevArrow={<PrevArrow />}
        nextArrow={<NextArrow />}
      >
        {slides.map((group, index) => (
          <div key={index}>
            <div className="testimonial-slide">
              {group.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="testimonial-card-wrapper"
                >
                  <div className="testimonial-card">
                    {/* Avatar + Name */}
                    <div className="testimonial-header">
                      <div className="test-img-wrapper">
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div>
                        <h6>{item.name}</h6>
                        <span className="role">{item.role}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="testimonial-text">“{item.content}”</p>

                    {/* Rating */}
                    <div className="testimonial-rating">
                      ⭐⭐⭐⭐⭐ <span>Blessed by God’s goodness</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </Carousel>

      <div className="testimonial-cta">
        <button className="read-more-btn">Read More Stories</button>
      </div>
    </section>
  );
};

export default TestimonialsSection;
