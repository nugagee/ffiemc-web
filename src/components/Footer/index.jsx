import React from "react";
import { Layout, Row, Col, Typography } from "antd";

const { Footer } = Layout;
const { Title, Text, Link } = Typography;

const FooterSection = () => {
  return (
    <Footer
      style={{
        backgroundColor: "var(--color-bg-dark)",
        color: "var(--color-text-light)",
        padding: "60px 20px 30px",
      }}
    >
      <Row gutter={[32, 32]} justify="center">
        <Col xs={24} sm={12} md={6}>
          <Title
            level={4}
            style={{ color: "var(--color-accent)", marginBottom: 12 }}
          >
            Fire Evangelical Church
          </Title>
          <Text style={{ color: "#d1d5db", lineHeight: 1.6 }}>
            Igniting hearts and transforming lives through God’s love.
          </Text>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Title level={5} style={{ color: "#ffffff" }}>
            Quick Links
          </Title>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="#about" style={{ color: "#d1d5db" }}>
              About
            </Link>
            <Link href="#events" style={{ color: "#d1d5db" }}>
              Events
            </Link>
            <Link href="#sermons" style={{ color: "#d1d5db" }}>
              Sermons
            </Link>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Title level={5} style={{ color: "#ffffff" }}>
            Service Times
          </Title>
          <Text style={{ color: "#d1d5db", lineHeight: 1.6 }}>
            Sunday: 8:30AM & 10:30AM
            <br />
            Wednesday: 6:00PM
          </Text>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Title level={5} style={{ color: "#ffffff" }}>
            Contact
          </Title>
          <Text style={{ color: "#d1d5db", lineHeight: 1.6 }}>
            123 Revival Ave, Lagos
            <br />
            info@fireevangelical.org
          </Text>
        </Col>
      </Row>

      <div
        style={{
          textAlign: "center",
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid #374151",
          color: "#9ca3af",
          fontSize: 14,
        }}
      >
        © {new Date().getFullYear()} Fire Evangelical Church. All Rights Reserved.
      </div>
    </Footer>
  );
};

export default FooterSection;
