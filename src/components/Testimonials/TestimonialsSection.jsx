import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Card, Avatar, Typography } from "antd";
import SectionWrapper from "../Layout/SectionWrapper";

const { Title, Paragraph, Text } = Typography;

const testimonials = [
  {
    id: 1,
    name: "Sister Grace Akintayo",
    text: "God has changed my life through this ministry — I’ve found peace and community.",
    avatar: "/images/test1.jpg",
    role: "Member",
  },
  {
    id: 2,
    name: "Brother Michael Oduro",
    text: "The love of Christ I experienced here has transformed my family and faith.",
    avatar: "/images/test2.jpg",
    role: "Member",
  },
];

const TestimonialsSection = () => (
  <SectionWrapper id="testimonials">
    <Title
      level={2}
      style={{ textAlign: "center", marginBottom: 40, fontWeight: 700 }}
    >
      What God is Doing
    </Title>

    <Row gutter={[24, 24]} justify="center">
      {testimonials.map((t) => (
        <Col xs={24} md={12} key={t.id}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.4 }}
          >
            <Card
              style={{
                borderRadius: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              hoverable
            >
              <Paragraph italic style={{ marginBottom: 16 }}>
                “{t.text}”
              </Paragraph>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar src={t.avatar} size={48} />
                <div>
                  <Text strong>{t.name}</Text>
                  <br />
                  <Text type="secondary">{t.role}</Text>
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  </SectionWrapper>
);

export default TestimonialsSection;
