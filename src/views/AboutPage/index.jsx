import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import ContactModal from "../../components/ContactModal/ContactModal";
import "./about-page.css";
import Footer from "../../components/Footer";
import {
  MapPin,
  Clock,
  Home,
  Heart,
  BookOpen,
  Users,
  Target,
} from "lucide-react";
import logo from "../../assets/img/Logo png.png";

const AboutPage = () => {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const coreValues = [
    {
      icon: Heart,
      title: "Love & Compassion",
      description:
        "We extend God's love to everyone who walks through our doors, creating a warm and welcoming community.",
    },
    {
      icon: BookOpen,
      title: "Biblical Truth",
      description:
        "Our teachings are rooted in Scripture, guiding members to live out their faith with integrity.",
    },
    {
      icon: Users,
      title: "Community & Fellowship",
      description:
        "We believe in doing life together, supporting one another in faith and building lasting bonds.",
    },
    {
      icon: Target,
      title: "Service & Mission",
      description:
        "We are called to serve our community and share the gospel locally and globally.",
    },
  ];

  const timeline = [
    { year: "1995", title: "Church Founded", description: "Faith-Fire International was established with a vision to ignite hearts and transform lives through the power of the gospel." },
    { year: "2002", title: "New Sanctuary", description: "We moved into our current location, expanding our capacity to serve and welcome more families." },
    { year: "2010", title: "Global Outreach", description: "Launched international missions to spread the message of hope across borders." },
    { year: "2018", title: "Digital Ministry", description: "Embarked on online ministry to reach and disciple believers worldwide." },
  ];

  return (
    <div className="min-h-screen bg-white font-body about-page">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider mb-6">
            About Us
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-gray-900 mb-6">
            Our Story of{" "}<br/>
            <span className="text-primary color-primary">Faith & Fire</span>
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Fire-Fire International Evangelical Church exists to ignite hearts with the love of Christ and transform lives through biblical teaching, authentic community, and Spirit-led worship. We are a family of believers committed to teaching one by one another.
          </p>
        </div>
      </section>

      {/* History & Vision Section */}
      <section className="py-12 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left - Text */}
            <div>
              <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
                Our History
              </span>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gray-900 mb-6">
                Teach one by one another
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                From our founding, Fire-Fire International has been built on the principle of personal discipleship. Every member is both a student and a teacher in God's kingdom—we learn from one another and grow together in faith.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Our journey has been marked by God's faithfulness. Through seasons of growth and challenge, we have remained rooted in Scripture and committed to spreading the gospel.
              </p>

              <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
                Our Vision
              </span>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gray-900 mb-6">
                Igniting hearts, transforming lives
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We envision a church where every person encounters God, grows in discipleship, and is equipped to make an impact in their community and beyond. Our vision is to raise a generation grounded in faith, purpose, and spiritual growth.
              </p>
            </div>

            {/* Right - Logo Card */}
            <div className="flex justify-center md:justify-end">
              <div className="w-full max-w-sm rounded-2xl shadow-lg bg-white p-8 md:p-12">
                <img
                  src={logo}
                  alt="Fire-Fire International Evangelical Church"
                  className="w-full aspect-square object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-12 md:py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900 mb-4">
              What We Stand For
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our core values guide everything we do as a church community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {coreValues.map((item, index) => {
              const Icon = item.icon;
              return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary color-primary" />
                </div>
                <h3 className="text-xl font-bold font-heading text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-12 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
              Our Journey
            </span>
            <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900">
              God's Faithfulness
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
            These core values guide everything we do as a church family and shape our ministry approach.
            </p>
          </div>

          <div className="relative">
            {/* Vertical line - desktop */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary -translate-x-1/2" />

            {timeline.map((item, index) => (
              <div
                key={index}
                className={`relative flex flex-col md:flex-row gap-4 md:gap-8 mb-12 last:mb-0 ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Content card */}
                <div
                  className={`flex-1 md:w-5/12 ${
                    index % 2 === 1 ? "md:text-right" : ""
                  }`}
                >
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out">
                    <span className="inline-block px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold mb-3">
                      {item.year}
                    </span>
                    <h3 className="text-lg font-bold font-heading text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Center node */}
                <div className="hidden md:flex absolute left-1/2 w-4 h-4 rounded-full bg-primary -translate-x-1/2 top-6 border-4 border-white shadow" />

                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1 md:w-5/12" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pastor's Message Section */}
      <section className="py-16 md:py-24 px-4 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-5 py-2 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-6">
            Pastor's Message
          </span>
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-white mb-8">
            A Word from Pastor Moronranti
          </h2>
          <blockquote className="text-xl md:text-2xl text-white/95 italic leading-relaxed mb-8">
            "Our church exists to be a place where every person can encounter the living God. Whether you are new to faith, returning to church, or seeking to grow deeper, you have a place here. We believe in teaching one by one another—each of us both a student and a teacher in God's kingdom."
          </blockquote>
          <p className="text-white/90 font-medium">— Pastor Moronranti</p>
        </div>
      </section>

      {/* Plan Your Visit Section */}
      <section className="py-12 md:py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900 mb-4">
              Plan Your Visit
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We would love to welcome you this Sunday. Here's what you need to know.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 color-primary" />
              </div>
              <h3 className="text-lg font-bold font-heading text-gray-900 mb-2">
                Location
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 color-primary" />
              </div>
              <h3 className="text-lg font-bold font-heading text-gray-900 mb-3">
                Service Times
              </h3>
              <div className="text-gray-600 text-sm space-y-2">
                <p><strong>Sunday</strong><br />Sitting at the Jesus feet — 8:00 AM - 9:00 AM</p>
                <p><strong>Sunday</strong><br />Main Service — 9:00 AM - 12:00 PM</p>
                <p><strong>Monday</strong><br />Bible Study — 5:00 PM - 7:00 PM</p>
                <p><strong>Wednesday</strong><br />Women's Program — 9:00 AM - 2:00 PM</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Home className="w-6 h-6 color-primary" />
              </div>
              <h3 className="text-lg font-bold font-heading text-gray-900 mb-2">
                What to Expect
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A warm welcome, powerful worship, practical Bible teaching, and a community where you can belong and grow in your faith journey.
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setContactModalOpen(true)}
              className="about-page__cta inline-block px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-full transition-colors no-underline border-0 cursor-pointer"
            >
              Connect with Us Today
            </button>
          </div>

          <ContactModal
            open={contactModalOpen}
            onClose={() => setContactModalOpen(false)}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
