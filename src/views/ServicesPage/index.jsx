import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./services-page.css";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer";
import ContactModal from "../../components/ContactModal/ContactModal";
import {
  Heart,
  Users,
  BookOpen,
  Clock,
  Check,
  Music,
  BookMarked,
  UsersRound,
  HandHelping,
} from "lucide-react";
import "./services-page.css";

const regularServices = [
  {
    icon: Heart,
    day: "Sunday",
    title: "Sitting at the Jesus Feet",
    time: "8:00 AM - 9:00 AM",
    description: "A time of intimate worship and reflection at the feet of Jesus before our main service.",
    expect: [
      "Quiet worship and meditation",
      "Personal prayer time",
      "Scripture reading",
    ],
  },
  {
    icon: Users,
    day: "Sunday",
    title: "Main Service",
    time: "9:00 AM - 12:00 PM",
    description: "Our main Sunday worship experience with praise, teaching, and ministry.",
    expect: [
      "Inspiring worship and praise",
      "Biblical teaching and preaching",
      "Prayer and ministry time",
    ],
  },
  {
    icon: BookOpen,
    day: "Wednesday",
    title: "Mid-week Service",
    time: "6:00 PM - 8:00 PM",
    description: "A mid-week gathering for Bible study, fellowship, and spiritual growth.",
    expect: [
      "Deep Bible teaching",
      "Small group discussions",
      "Prayer and fellowship",
    ],
  },
];

const specialEvents = [
  { title: "Holy Ghost Fire Conference", frequency: "Annual", description: "A powerful week of revival, teaching, and ministry with guest speakers." },
  { title: "Youth Revival Night", frequency: "Quarterly", description: "An evening of worship and ministry specifically for young people." },
  { title: "Women's Prayer Breakfast", frequency: "Monthly", description: "Monthly gathering for women to pray, fellowship, and encourage one another." },
  { title: "Men's Fellowship", frequency: "Monthly", description: "Brothers coming together for accountability, prayer, and growth." },
  { title: "Children's Ministry Day", frequency: "Quarterly", description: "Special programs and activities for our children's ministry." },
  { title: "Community Outreach", frequency: "Monthly", description: "Reaching our community with the love of Christ through service." },
];

const whatToExpect = [
  { icon: Music, title: "Inspiring Worship", desc: "Lift your voice and heart in powerful praise and worship." },
  { icon: BookMarked, title: "Biblical Teaching", desc: "Practical, Spirit-led teaching rooted in Scripture." },
  { icon: UsersRound, title: "Warm Fellowship", desc: "Connect with a family of believers who care for you." },
  { icon: HandHelping, title: "Prayer & Ministry", desc: "Receive prayer and ministry for your needs." },
];

const ServicesPage = () => {
  const [prayerModalOpen, setPrayerModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-body services-page">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider mb-6">
            Our Services
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-gray-900 mb-6">
            Worship With Us{" "}
            <span className="text-primary color-primary">Every Week</span>
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Join us for spirit-filled worship, biblical teaching, and genuine fellowship. Whether you're new to faith or a seasoned believer, there's a place for you here.
          </p>
        </div>
      </section>

      {/* Regular Services Section */}
      <section className="py-12 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
              Weekly Schedule
            </span>
            <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900 mb-4">
              Regular Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our weekly services are designed to help you grow in faith and connect with our church family.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {regularServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="services-page__card bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-primary color-primary" />
                  </div>
                  <span className="text-primary color-primary text-sm font-semibold">{service.day}</span>
                  <h3 className="text-xl font-bold font-heading text-gray-900 mt-1 mb-2">
                    {service.title}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Clock className="w-4 h-4 text-primary color-primary flex-shrink-0" />
                    <span className="text-sm">{service.time}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">What to expect:</p>
                    <ul className="space-y-2">
                      {service.expect.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-primary color-primary flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Special Services & Events Section */}
      <section className="py-12 md:py-24 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
              Save the Dates
            </span>
            <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900 mb-4">
              Special Services & Events
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Throughout the year we host special conferences, revivals, and events for the whole family.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {specialEvents.map((event, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <h3 className="text-lg font-bold font-heading text-gray-900">
                    {event.title}
                  </h3>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                    {event.frequency}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-2">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What to Expect & Service Guidelines */}
      <section className="py-12 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* What to Expect */}
            <div>
              <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
                Join the Family
              </span>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gray-900 mb-8">
                What to Expect
              </h2>
              <div className="space-y-6">
                {whatToExpect.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary color-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold font-heading text-gray-900 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Guidelines */}
            <div className="bg-red-50 rounded-2xl p-8 border border-red-100">
              <h2 className="text-2xl font-bold font-heading text-gray-900 mb-6">
                Service Guidelines
              </h2>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Dress Code</h4>
                  <p className="text-gray-600 text-sm">
                    We welcome you as you are. Most people dress in smart casual attire, but feel free to wear what makes you comfortable.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Children</h4>
                  <p className="text-gray-600 text-sm">
                    Children are welcome in our services. We also have dedicated programs for kids during our main service.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Parking</h4>
                  <p className="text-gray-600 text-sm">
                    Free parking is available on our premises. Our ushers will be happy to assist you in finding a spot.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Accessibility</h4>
                  <p className="text-gray-600 text-sm">
                    Our facility is accessible. Please contact us in advance if you need any special arrangements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-white mb-4">
            Ready to Join Us?
          </h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            We can't wait to meet you. Plan your visit this Sunday or reach out with any questions. You're always welcome at Fire-Fire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact-us"
              className="services-page__cta-white inline-flex items-center justify-center px-8 py-4 bg-white font-semibold rounded-full"
            >
              Plan Your Visit
            </Link>
            <button
              type="button"
              onClick={() => setPrayerModalOpen(true)}
              className="services-page__cta-outline inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-full transition-all duration-300"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      <Footer />

      <ContactModal open={prayerModalOpen} onClose={() => setPrayerModalOpen(false)} />
    </div>
  );
};

export default ServicesPage;
