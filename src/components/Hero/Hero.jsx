// import React from "react";
// import "./hero.css";
// import PrimaryButton from "../Button/PrimaryButton";

// const HeroSection = ({ title, subtitle, cta1, cta2 }) => {
//   return (
//     <section className="hero-section">
//       <div className="hero-overlay">
//         <div className="container text-center">
//           <h1>{title}</h1>
//           <p>{subtitle}</p>
//           <div className="hero-buttons">
//             <PrimaryButton text={cta1} />
//             <PrimaryButton text={cta2} variant="outline" />
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default HeroSection;

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Timer } from "lucide-react";

/*
  HeroSection
  - slides: array of { id, image, eyebrow, title, subtitle, ctas }
  - autoplay: boolean (default true)
  - autoplayInterval: ms
*/

const slidesData = [
  {
    id: 1,
    image: "../../assets/img/hero/home4",
    eyebrow: "Fire-Fire International Evangelical Church",
    title: "Igniting Hearts, Transforming Lives",
    // title: "Come as You Are",
    subtitle: "Experience God's Love in Our Community",
    // subtitle: "Everyone Welcome, Every Sunday. Experience worship, biblical teaching, and warm fellowship with us",
    subtitle2:
      "Join us as we spread the fire of God's love and build His kingdom together.",
    ctaPrimary: { text: "Join Our Family", href: "#plan" },
    // ctaPrimary: { text: "Plan Your Visit", href: "#plan" },
    ctaSecondary: { text: "Watch Live", href: "#watch" },
  },
  {
    id: 2,
    image: "../../assets/img/hero/home3",
    eyebrow: "Join Us This Sunday",
    title: "Teaching One by One Another",
    subtitle: "Growing Together in Faith.",
    subtitle2:
      "Discover the power of personal discipleship and community fellowship.",
    ctaPrimary: { text: "Visit This Sunday", href: "#visit" },
    ctaSecondary: { text: "Watch Sermon", href: "#watch" },
  },
  {
    id: 3,
    image: "../../assets/img/hero/home2",
    eyebrow: "You're Welcome Here",
    title: "Come as You Are",
    // title: "Experience God's Love",
    subtitle:
      "We’re a community where everyone can belong — come and find a home.",
    subtitle2:
      "Experience worship, biblical teaching, and warm fellowship with us.",
    ctaPrimary: { text: "Plan Your Visit", href: "#directions" },
    // ctaPrimary: { text: "Get Directions", href: "#directions" },
    ctaSecondary: { text: "Live Stream", href: "#live" },
  },
  {
    id: 4,
    image: "../../assets/img/hero/home",
    eyebrow: "You're Welcome Here",
    title: "A Place to Call Home",
    subtitle: "Beautiful Worship, Beautiful Community.",
    subtitle2: "Find your spiritual home in our welcoming church family.",
    ctaPrimary: { text: "Contact Us", href: "#directions" },
    ctaSecondary: { text: "Live Stream", href: "#live" },
  },
];

const HeroSection = ({
  slides = slidesData,
  autoplay = true,
  autoplayInterval = 6000,
}) => {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const autoplayRef = useRef(null);

  useEffect(() => {
    if (!autoplay) return;
    autoplayRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, autoplayInterval);
    return () => clearInterval(autoplayRef.current);
  }, [autoplay, autoplayInterval, count]);

  // Pause autoplay on hover
  const handleMouseEnter = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  };
  const handleMouseLeave = () => {
    if (!autoplay) return;
    autoplayRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, autoplayInterval);
  };

  const goPrev = () => setIndex((i) => (i - 1 + count) % count);
  const goNext = () => setIndex((i) => (i + 1) % count);

  return (
    <section id="hero" className="relative w-full">
      <div
        className="relative h-[78vh] md:h-[88vh] w-full overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* slides container */}
        <AnimatePresence initial={false}>
          {slides.map((slide, idx) =>
            idx === index ? (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0"
                aria-hidden={idx !== index}
              >
                {/* background image */}
                <div
                  className="absolute inset-0 bg-center bg-cover"
                  style={{
                    backgroundImage: `url(${slide.image})`,
                    // backgroundImage: `url(${slide.image})`,
                  }}
                />
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[rgba(212,69,39,0.85)] via-[rgba(204,84,69,0.55)] to-[rgba(0,0,0,0.2)] mix-blend-multiply" />
                {/* darken / color overlay + subtle vignette */}
                <div className="absolute inset-0 bg-black/10" />

                {/* content */}
                <div className="relative z-10 h-full flex items-center">
                  <div className="container mx-auto px-6 md:px-10 lg:px-20">
                    <div className="max-w-3xl text-white">
                      {/* eyebrow/badge */}
                      <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2 rounded-full text-sm mb-6">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            className="opacity-90"
                          >
                            <path
                              fill="currentColor"
                              d="M12 2L13.09 8.26L19 9.27L14.5 13.14L15.82 19.02L12 16.2L8.18 19.02L9.5 13.14L5 9.27L10.91 8.26L12 2Z"
                            />
                          </svg>
                        </span>
                        <span className="text-sm font-medium">
                          {slide.eyebrow}
                        </span>
                      </div>

                      {/* title */}
                      <motion.h1
                        key={`title-${slide.id}`}
                        initial={{ y: 18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.12, duration: 0.6 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight font-heading font-extrabold mb-4"
                      >
                        {slide.title}
                      </motion.h1>

                      {/* subtitle */}
                      <motion.p
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.22, duration: 0.6 }}
                        className="text-md sm:text-lg md:text-xl text-white/90 mb-6"
                      >
                        {slide.subtitle}
                      </motion.p>

                      {/* subtitle - 2*/}
                      <motion.p
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.22, duration: 0.6 }}
                        className="text-md sm:text-lg md:text-xl text-white/90 mb-6"
                      >
                        {slide.subtitle2}
                      </motion.p>

                      {/* CTAs */}
                      <motion.div
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.32, duration: 0.6 }}
                        className="flex flex-wrap gap-4 items-center"
                      >
                        <a
                          href={slide.ctaPrimary.href}
                          className="inline-flex items-center gap-3 bg-color-primary hover:color-accent-dark text-white px-5 py-3 rounded-full font-semibold shadow-md transition"
                        >
                          {slide.ctaPrimary.text}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            className="opacity-90"
                          >
                            <path
                              fill="currentColor"
                              d="M13 5l7 7-7 7v-4H4v-6h9V5z"
                            />
                          </svg>
                        </a>

                        <a
                          href={slide.ctaSecondary.href}
                          className="inline-flex items-center gap-3 border border-white/40 text-white px-5 py-3 rounded-full font-medium hover:bg-white/5 transition"
                        >
                          <Play className="w-4 h-4" />
                          {slide.ctaSecondary.text}
                        </a>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>

        {/* left/right arrows */}
        <div className="absolute inset-y-0 left-4 flex items-center z-20">
          <button
            onClick={goPrev}
            aria-label="Previous slide"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-4 flex items-center z-20">
          <button
            onClick={goNext}
            aria-label="Next slide"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-3 h-3 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/40"
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Schedule cards floating over hero bottom */}
      <div className="relative -mt-12 md:-mt-16 z-30">
        <div className="container mx-auto px-6 md:px-10 lg:px-20">
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 lg:p-8 -translate-y-6 md:-translate-y-10">
            <div className="text-lg text-center text-black">
              Join Us for Worship
            </div>
            <div className="text-sm text-center text-gray-600 mb-3">
            All are welcome to experience God's love
            </div>
            <div className="flex flex-col md:flex-row items-stretch gap-4">
              {/* each schedule card */}
              <div className="flex-1 min-w-[170px] text-center p-4 rounded-xl bg-red-50 border border-gray-100">
                <Timer
                  className="w-5 h-5 color-primary item-center"
                  style={{ margin: "10px auto" }}
                />
                <div className="text-sm text-gray-400">
                  Sitting at the Jesus feet
                </div>
                <div className="mt-2 font-semibold text-sm">Sunday</div>
                <div className="text-[13px] text-[var(--color-accent)] mt-1">
                  8:00 AM - 9:00 AM
                </div>
              </div>

              <div className="flex-1 min-w-[170px] text-center p-4 rounded-xl bg-red-50 border border-gray-100">
                <Timer
                  className="w-5 h-5 color-primary item-center"
                  style={{ margin: "10px auto" }}
                />
                <div className="text-sm text-gray-400">Main Service</div>
                <div className="mt-2 font-semibold text-sm">Sunday</div>
                <div className="text-[13px] text-[var(--color-accent)] mt-1">
                  9:00 AM - 12:00 PM
                </div>
              </div>

              <div className="flex-1 min-w-[170px] text-center p-4 rounded-xl bg-red-50 border border-gray-100">
                <Timer
                  className="w-5 h-5 color-primary item-center"
                  style={{ margin: "10px auto" }}
                />
                <div className="text-sm text-gray-400">Bible Study</div>
                <div className="mt-2 font-semibold text-sm">Monday</div>
                <div className="text-[13px] text-[var(--color-accent)] mt-1">
                  5:00 PM - 7:00 PM
                </div>
              </div>

              <div className="flex-1 min-w-[170px] text-center p-4 rounded-xl bg-red-50 border border-gray-100 hidden md:block">
                <Timer
                  className="w-5 h-5 color-primary item-center"
                  style={{ margin: "10px auto" }}
                />
                <div className="text-sm text-gray-400">Women's Program</div>
                <div className="mt-2 font-semibold text-sm">Wednesday</div>
                <div className="text-[13px] text-[var(--color-accent)] mt-1">
                  12:00 PM - 3:00 PM
                </div>
              </div>

              <div className="flex-1 min-w-[170px] text-center p-4 rounded-xl bg-red-50 border border-gray-100 hidden lg:block">
                <Timer
                  className="w-5 h-5 color-primary item-center"
                  style={{ margin: "10px auto" }}
                />
                <div className="text-sm text-gray-400">Mid-week Service</div>
                <div className="mt-2 font-semibold text-sm">Wednesday</div>
                <div className="text-[13px] text-[var(--color-accent)] mt-1">
                  6:00 PM - 8:00 PM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
