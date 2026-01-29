import React from "react";
import { Row, Col, Typography, Button, Card } from "antd";
import { HeartOutlined, TeamOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import logo from "../../assets/img/Logo png.png";

const { Title, Text, Paragraph } = Typography;

const AboutIntroSection = () => {
  return (
    <section style={{ padding: "100px 8%", background: "#fff" }}>
      <Row gutter={[48, 48]} align="middle">
        {/* LEFT CONTENT */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {/* Badge */}
            <span
              style={{
                background: "rgba(217, 0, 0, 0.1)",
                color: "#d90000",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                display: "inline-block",
                marginBottom: 20,
              }}
            >
              Welcome Home
            </span>

            {/* Heading */}
            <Title level={1} style={{ marginBottom: 16 }}>
              Teaching One by{" "}
              <span style={{ color: "#d90000" }}>One Another</span>
            </Title>

            {/* Description */}
            <Paragraph style={{ fontSize: 16, color: "#555", maxWidth: 520 }}>
              At Fire-Fire International Evangelical Church, we believe in the
              transformative power of personal discipleship. Every member is
              both a student and a teacher in God's kingdom.
            </Paragraph>

            {/* Feature Cards */}
            <Row gutter={16} style={{ marginTop: 32 }}>
              <Col xs={24} sm={12}>
                <Card
                  bordered={false}
                  style={{
                    borderRadius: 16,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <HeartOutlined style={{ fontSize: 28, color: "#d90000" }} />
                  <Title level={5} style={{ marginTop: 12 }}>
                    Transform Lives
                  </Title>
                  <Text type="secondary">Through God's love</Text>
                </Card>
              </Col>

              <Col xs={24} sm={12}>
                <Card
                  bordered={false}
                  style={{
                    borderRadius: 16,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <TeamOutlined style={{ fontSize: 28, color: "#d90000" }} />
                  <Title level={5} style={{ marginTop: 12 }}>
                    Build Community
                  </Title>
                  <Text type="secondary">Lasting bonds in Christ</Text>
                </Card>
              </Col>
            </Row>

            {/* CTA Buttons */}
            <div style={{ marginTop: 40 }}>
              <Button
                type="primary"
                size="large"
                style={{
                  background: "#d90000",
                  borderColor: "#d90000",
                  borderRadius: 30,
                  padding: "0 28px",
                  marginRight: 16,
                }}
                icon={<ArrowRightOutlined />}
              >
                Discover Our Story
              </Button>

              <Button
                size="large"
                style={{
                  borderRadius: 30,
                  padding: "0 28px",
                }}
              >
                Meet Our Team
              </Button>
            </div>
          </motion.div>
        </Col>

        {/* RIGHT IMAGE */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{ position: "relative" }}
          >
            {/* Years Badge */}
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                background: "#d90000",
                color: "#fff",
                padding: "16px 18px",
                borderRadius: 14,
                textAlign: "center",
                zIndex: 2,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <Title level={3} style={{ color: "#fff", margin: 0 }}>
                15+
              </Title>
              <Text style={{ color: "#fff" }}>Years Serving</Text>
            </div>

            {/* Image Card */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(217,0,0,0.12), rgba(255,200,200,0.4))",
                borderRadius: 32,
                padding: 40,
              }}
            >
              <img
                src={logo}
                alt="Fire Evangelical Church"
                style={{
                  width: "100%",
                  maxWidth: 420,
                  display: "block",
                  margin: "0 auto",
                  borderRadius: 20,
                  background: "#fff",
                  padding: 24,
                }}
              />
            </div>
          </motion.div>
        </Col>
      </Row>
    </section>
  );
};

export default AboutIntroSection;
