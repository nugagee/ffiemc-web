import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layout, Menu, Button, Drawer, Flex, Typography } from "antd";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import logo from "../../assets/img/Logo png.png";
import "./navbar.css";

const { Header } = Layout;
const { Text } = Typography;

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { key: "home", label: "Home", href: "#hero" },
    { key: "sermons", label: "Sermons", href: "#sermons" },
    { key: "ministries", label: "Ministries", href: "#ministries" },
    { key: "testimonials", label: "Testimonials", href: "#testimonials" },
    { key: "contact", label: "Contact", href: "#footer" },
    { key: "sermons", label: "Sermons", href: "#footer" },
  ];

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        position: "fixed",
        width: "100%",
        top: 0,
        zIndex: 50,
      }}
    >
      <Header
        style={{
          background: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          transition: "all 0.3s ease",
          paddingInline: "10%",
        }}
      >
        <Flex justify="space-between" align="center">
          {/* Logo */}
          <Flex align="center" gap={12}>
            <Link to="/">
              <img src={logo} alt="Logo" className="home-logo" />
            </Link>
            <Text strong className="font-heading color-accent">
              Fire-Fire International Evangelical Church
            </Text>
          </Flex>

          {/* Desktop Menu */}
          <Flex align="center" gap={24} className="desktop-nav">
            <Menu
              mode="horizontal"
              selectable={false}
              // overflowedIndicator={null}   
              style={{
                background: "transparent",
                borderBottom: "none",
                flex: "none",             
              }}
              items={navItems.map((item) => ({
                key: item.key,
                label: (
                  <a
                    href={item.href}
                    className={scrolled ? "color-text-dark" : "color-text-light"}
                    // style={{color: `${scrolled} ? "#000000" : "#ffffff"`}}
                  >
                    {item.label}
                  </a>
                ),
              }))}
            />

            <Button type="primary" shape="round" href="#give">
              Give
            </Button>
          </Flex>

          {/* Mobile Toggle */}
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMenuOpen(true)}
            className="mobile-toggle"
          />
        </Flex>
      </Header>

      {/* Mobile Drawer */}
      <Drawer
        placement="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        closeIcon={<CloseOutlined />}
      >
        <Flex vertical gap={16}>
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="color-text-dark"
            >
              {item.label}
            </a>
          ))}

          <Button type="primary" shape="round" href="#give">
            Give
          </Button>
        </Flex>
      </Drawer>
    </motion.div>
  );
};

export default Navbar;
