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
import JourneyCTASection from "../../components/JourneyCTA/JourneyCTASection";
import Scheduleection from "../../components/Schedule/Schedule";

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
      <Scheduleection />
      <AboutIntroSection />
      <EventsHighlightSection />
      <SermonsSection />
      <MinistriesSection />
      <JourneyCTASection />
      <TestimonialsSection />
      <SocialFeedSection />
      <FooterSection /> 
    </>
  );
};

export default Home;
