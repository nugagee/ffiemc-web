import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../../assets/img/Logo png.png";
import "./navbar.css";

const navItems = [
  { key: "home", label: "Home", href: "/" },
  { key: "about", label: "About", href: "/about-us" },
  { key: "sermons", label: "Sermons", href: "/#sermons" },
  { key: "ministries", label: "Ministries", href: "/#ministries" },
  { key: "services", label: "Services", href: "/services" },
  { key: "contact", label: "Contact", href: "/contact-us" },
  { key: "events", label: "Events", href: "/#footer" },
  { key: "blog", label: "Blog", href: "/#footer" },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isAboutPage = pathname === "/about-us";
  const isContactPage = pathname === "/contact-us";
  const isServicesPage = pathname === "/services";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const linkClass =
    scrolled || isAboutPage || isContactPage || isServicesPage
      ? "nav-link nav-link--dark"
      : "nav-link nav-link--light";

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`navbar ${scrolled || isAboutPage || isContactPage || isServicesPage ? "navbar--scrolled" : ""}`}
    >
      <div className="navbar__container">
        {/* Logo & Brand */}
        <Link to="/" className="navbar__brand">
          <img src={logo} alt="Logo" className="navbar__logo" />
          <span className="navbar__title">
            Fire-Fire International Evangelical Church
          </span>
        </Link>

        {/* Desktop Menu */}
        <nav className="navbar__nav">
          <ul className="navbar__list">
            {navItems.map((item) => {
              const isActive = item.key === "contact" && pathname === "/contact-us";
              return (
                <li key={item.key} className="navbar__item">
                  <Link
                    to={item.href}
                    className={`${linkClass} ${isActive ? "nav-link--active" : ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <a href="#give" className="navbar__cta">
            Give
          </a>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className={`navbar__toggle ${scrolled || isAboutPage || isContactPage || isServicesPage ? "navbar__toggle--dark" : ""}`}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="navbar__overlay"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            className="navbar__mobile-menu"
            aria-label="Mobile navigation"
          >
            <ul className="navbar__mobile-list">
              {navItems.map((item, index) => (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="navbar__mobile-item"
                >
                  <Link
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="navbar__mobile-link"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <a
              href="#give"
              onClick={() => setMenuOpen(false)}
              className="navbar__mobile-cta"
            >
              Give
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
