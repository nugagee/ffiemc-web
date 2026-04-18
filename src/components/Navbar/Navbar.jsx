import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import "./navbar.css";
import { Link } from "react-router-dom";
import logo from "../../assets/img/Logo png.png";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", href: "#hero" },
    { name: "Sermons", href: "#sermons" },
    { name: "Ministries", href: "#ministries" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Contact", href: "#footer" },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm"
          : "bg-transparent text-white"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center justify-between">
          <Link className=" d-flex mr-auto" to="/">
            <img src={logo} alt="" className="home-logo" />
          </Link>
          <p className="font-heading text-2xl mb-0 font-bold color-accent">
            Fire-Fire International Evangelical Church
          </p>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`${scrolled ? "color-text-dark" : "color-text-light"} hover-btn-link font-medium transition-colors`}
            >
              {item.name}
            </a>
          ))}
          <a
            href="#give"
            className="bg-color-accent text-white px-4 py-2 rounded-full hover-bg transition"
          >
            Give
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <X className="w-6 h-6 color-text-dark" />
            ) : (
              <Menu className="w-6 h-6 color-text-dark" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white/95 backdrop-blur-md shadow-md"
        >
          <div className="flex flex-col items-center space-y-4 py-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="color-text-dark font-medium hover:color-accent"
                onClick={() => setMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <a
              href="#give"
              className="color-accent text-white px-4 py-2 rounded-full hover:bg-color-accent-hover transition"
              onClick={() => setMenuOpen(false)}
            >
              Give
            </a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
