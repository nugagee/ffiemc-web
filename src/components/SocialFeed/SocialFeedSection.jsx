import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Card, Typography } from "antd";
import SectionWrapper from "../Layout/SectionWrapper";

const { Title, Paragraph, Text } = Typography;

const feeds = [
  {
    id: 1,
    platform: "Instagram",
    text: "What an amazing worship service this Sunday!",
    image: "/images/feed1.jpg",
    time: "2h ago",
  },
  {
    id: 2,
    platform: "Facebook",
    text: "Join us for Youth Revival this Friday 🔥",
    image: "/images/feed2.jpg",
    time: "1d ago",
  },
  {
    id: 3,
    platform: "X",
    text: "‘Where two or three gather in my name, there I am with them.’ – Matthew 18:20",
    image: "/images/feed3.jpg",
    time: "3d ago",
  },
];

const SocialFeedSection = () => (
  <SectionWrapper id="social">
    <Title
      level={2}
      style={{ textAlign: "center", marginBottom: 40, fontWeight: 700 }}
    >
      Follow Our Journey
    </Title>

    <Row gutter={[24, 24]} justify="center">
      {feeds.map((f) => (
        <Col xs={24} sm={12} lg={8} key={f.id}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4 }}
          >
            <Card
              hoverable
              cover={
                <img
                  alt={f.platform}
                  src={f.image}
                  style={{ height: 192, objectFit: "cover" }}
                />
              }
              style={{
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <Title level={4} style={{ marginBottom: 4 }}>
                {f.platform}
              </Title>
              <Paragraph style={{ marginBottom: 4, color: "#595959" }}>
                {f.text}
              </Paragraph>
              <Text type="secondary">{f.time}</Text>
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  </SectionWrapper>
);

export default SocialFeedSection;
