import FooterSection from "../../components/Footer";
import HeroSection from "../../components/Hero/Hero";
import Hero from "../../components/Hero/Hero";
import MinistriesSection from "../../components/Ministries/MinistriesSection";
import Navbar from "../../components/Navbar/Navbar";
import SermonsSection from "../../components/Sermons/SermonsSection";
import SocialFeedSection from "../../components/SocialFeed/SocialFeedSection";
import TestimonialsSection from "../../components/Testimonials/TestimonialsSection";
import AboutIntroSection from "../../components/About/AboutIntroSection";
import EventsHighlightSection from "../../components/Events/EventsSection";

const Home = () => {
  return (
    <>
      <Navbar />
      <Hero
        title="Igniting Hearts, Transforming Lives"
        subtitle="Experience God’s love in our community and grow together in faith."
        cta1="Visit This Sunday"
        cta2="Request Prayer"
      />
      <AboutIntroSection />
      <EventsHighlightSection />
      <SermonsSection />
      <MinistriesSection />
      <TestimonialsSection />
      <SocialFeedSection />
      <FooterSection />
    </>
  );
};

export default Home;
