import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Card, Typography } from "antd";
import SectionWrapper from "../Layout/SectionWrapper";

const { Title, Paragraph, Text } = Typography;

const sermons = [
  {
    id: 1,
    title: "Walking in the Fire of God",
    speaker: "Pastor John Doe",
    date: "Oct 6, 2025",
    thumbnail: "/images/sermon1.jpg",
  },
  {
    id: 2,
    title: "Teaching One by One Another",
    speaker: "Rev. Jane Smith",
    date: "Oct 13, 2025",
    thumbnail: "/images/sermon2.jpg",
  },
];

const SermonsSection = () => (
  <SectionWrapper id="sermons">
    <Title
      level={2}
      style={{ textAlign: "center", marginBottom: 40, fontWeight: 700 }}
    >
      Latest Sermons
    </Title>

    <Row gutter={[24, 24]} justify="center">
      {sermons.map((s) => (
        <Col xs={24} sm={12} key={s.id}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.4 }}
          >
            <Card
              hoverable
              cover={
                <img
                  alt={s.title}
                  src={s.thumbnail}
                  style={{ height: 224, objectFit: "cover" }}
                />
              }
              style={{
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <Title level={4} style={{ marginBottom: 8 }}>
                {s.title}
              </Title>
              <Paragraph style={{ marginBottom: 4, color: "#595959" }}>
                {s.speaker}
              </Paragraph>
              <Text type="secondary">{s.date}</Text>
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  </SectionWrapper>
);

export default SermonsSection;
