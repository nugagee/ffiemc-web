import React, { useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import GoogleMap from "../../components/GoogleMap/GoogleMap";
import ContactModal from "../../components/ContactModal/ContactModal";
import Footer from "../../components/Footer";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Facebook,
  Twitter,
  Youtube,
  Instagram,
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Form, Input, Button, message } from "antd";
import "./contact-page.css";

const { TextArea } = Input;
const CONTACT_COLLECTION = "contactSubmissions";

const contactCards = [
  {
    icon: MapPin,
    title: "Visit Us",
    details: [
      "Fire-Fire Area, Papa Agric",
      "Off Olojuoro Olunde Road",
      "Olomi, Ibadan, Nigeria",
    ],
    iconBg: "bg-primary/10",
    iconColor: "color-primary",
  },
  {
    icon: Phone,
    title: "Call Us",
    details: ["+234 816 267 4805"],
    iconBg: "bg-primary/10",
    iconColor: "color-primary",
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["info@firefireintl.org"],
    iconBg: "bg-primary/10",
    iconColor: "color-primary",
  },
  {
    icon: Clock,
    title: "Office Hours",
    details: [
      "Sunday: 8:00 AM - 12:00 PM",
      "Monday: 5:00 PM - 7:00 PM",
      "Wednesday: 9:00 AM - 2:00 PM",
    ],
    iconBg: "bg-primary/10",
    iconColor: "color-primary",
  },
];

const serviceTimes = [
  { name: "Sitting at the Jesus Feet", time: "8:00 AM - 9:00 AM" },
  { name: "Main Service", time: "9:00 AM - 12:00 PM" },
  { name: "Bible Study (Monday)", time: "5:00 PM - 7:00 PM" },
  { name: "Women's Program (Wednesday)", time: "9:00 AM - 2:00 PM" },
];

const socialLinks = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
];

const ContactPage = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [prayerModalOpen, setPrayerModalOpen] = useState(false);

  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, CONTACT_COLLECTION), {
        name: values.fullName,
        email: values.email,
        phone: values.phone,
        subject: values.address,
        message: values.message,
        source: "contact-page",
        createdAt: serverTimestamp(),
      });
      message.success(
        "Thank you! Your message has been sent. We will be in touch soon.",
      );
      form.resetFields();
    } catch (error) {
      console.error("Contact form error:", error);
      message.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-body contact-page">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-5 py-2 rounded-full bg-color-primary text-white text-xs font-semibold uppercase tracking-wider mb-6">
            Get In Touch
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-heading text-gray-900 mb-6">
            We'd Love to <br />
            <span className="color-primary">Hear From You</span>
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
            Whether you have a question, a prayer request, or just want to
            connect—we're here for you. Reach out and let's start a
            conversation.
          </p>
        </div>
      </section>

      {/* Ways to Reach Us Cards */}
      <section className="py-12 md:py-16 px-4 md:px-8 -mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
              Contact Information
            </span>
            <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900">
              Ways to Reach Us
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We're always available to serve you. Here are the best ways to get
              in touch with our team.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 ease-out"
                >
                  <div
                    className={`w-12 h-12 rounded-full ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-heading text-gray-900 mb-3">
                    {card.title}
                  </h3>
                  <div className="space-y-1 text-gray-600 text-sm">
                    {card.details.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content - Form & Sidebar */}
      <section className="py-12 md:py-24 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left - Contact Form */}
            <div className="lg:col-span-2">
              <div className="mb-2 md:mb-8">
                <span className="inline-block px-3 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-2">
                  Send Message
                </span>
                <h2 className="text-1xl md:text-2xl font-bold font-heading text-gray-900">
                  Send Us a Message
                </h2>
              </div>
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleFormSubmit}
                  requiredMark={false}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      name="fullName"
                      label="Full Name"
                      rules={[
                        { required: true, message: "Please enter your name" },
                      ]}
                    >
                      <Input placeholder="Your full name" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      label="Email Address"
                      rules={[
                        { required: true, message: "Please enter your email" },
                        {
                          type: "email",
                          message: "Please enter a valid email",
                        },
                      ]}
                    >
                      <Input
                        placeholder="your@email.com"
                        size="large"
                        type="email"
                      />
                    </Form.Item>
                    <Form.Item
                      name="phone"
                      label="Phone Number"
                      rules={[
                        { required: true, message: "Please enter your phone" },
                      ]}
                    >
                      <Input placeholder="+234 800 000 0000" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="address"
                      label="Address"
                      rules={[{ required: true, message: "Address" }]}
                    >
                      <Input placeholder="Address" size="large" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    name="message"
                    label="Message"
                    rules={[
                      { required: true, message: "Please enter your message" },
                    ]}
                  >
                    <TextArea
                      placeholder="Write your message here..."
                      rows={5}
                      size="large"
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      size="large"
                      className="contact-page__btn"
                      icon={<Send className="w-4 h-4" />}
                    >
                      Send Message
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>

            {/* Right - Service Times & Social */}
            <div className="space-y-8">
              <div className="mb-2 md:mb-4">
                <span className="inline-block px-3 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-2">
                  Service Schedule
                </span>
                <h2 className="text-1xl md:text-2xl font-bold font-heading text-gray-900">
                  Join Us for Worship
                </h2>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
               
                <div className="space-y-3">
                  {serviceTimes.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-100"
                    >
                      <Clock className="w-5 h-5 color-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-2 md:mb-6">
                <span className="inline-block px-3 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-2">
                  Connect Online
                </span>
                <h2 className="text-1xl md:text-2xl font-bold font-heading text-gray-900">
                  Follow Us
                </h2>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Stay connected with us on social media for updates,
                  encouragement, and community fellowship.{" "}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={index}
                        href={item.href}
                        className="contact-page__social-link flex items-center gap-3 p-3 rounded-lg border border-gray-200 transition-colors"
                      >
                        <Icon className="w-5 h-5 contact-page__social-icon" />
                        <span className="text-sm font-medium text-gray-700">
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Location - Map Placeholder */}
      <section className="py-12 md:py-24 px-4 md:px-8">
        <div className="text-center max-w-6xl mx-auto">
          <span className="inline-block px-5 py-2 rounded-full bg-primary/10 color-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Visit Us
          </span>
          <h2 className="text-2xl md:text-4xl font-bold font-heading text-gray-900 mb-8">
            Our Location
          </h2>
          <GoogleMap address="Fire-Fire Area, Olomi, Ibadan, Nigeria" />
        </div>
      </section>

      {/* Immediate Help CTA */}
      <section className="py-16 md:py-24 px-4 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-white mb-4">
            Need Immediate Prayer or Help?
          </h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Our team is here for you. Call our emergency line or submit a prayer
            request and we'll reach out as soon as possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+2348162674805"
              className="contact-page__emergency-btn inline-flex items-center justify-center gap-2 px-8 py-4 bg-white font-semibold rounded-full hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              <Phone className="w-5 h-5" />
              Emergency Line
            </a>
            <button
              type="button"
              onClick={() => setPrayerModalOpen(true)}
              className="contact-page__prayer-btn inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold rounded-full transition-all duration-300"
            >
              Request Prayer
            </button>
          </div>
        </div>
      </section>

      <Footer />

      <ContactModal
        open={prayerModalOpen}
        onClose={() => setPrayerModalOpen(false)}
      />
    </div>
  );
};

export default ContactPage;
