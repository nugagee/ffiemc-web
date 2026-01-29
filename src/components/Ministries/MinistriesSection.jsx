import React from "react";
import { motion } from "framer-motion";
import { Row, Col, Card, Typography } from "antd";
import SectionWrapper from "../Layout/SectionWrapper";

const { Title, Paragraph } = Typography;

const ministries = [
  {
    id: 1,
    name: "Youth Ministry",
    description: "Empowering the next generation with biblical values.",
    image: "/images/ministry1.jpg",
  },
  {
    id: 2,
    name: "Women of Faith",
    description: "Building strong women through prayer and mentorship.",
    image: "/images/ministry2.jpg",
  },
  {
    id: 3,
    name: "Men of Valor",
    description: "Raising men who lead with faith and integrity.",
    image: "/images/ministry3.jpg",
  },
];

const MinistriesSection = () => (
  <SectionWrapper id="ministries">
    <Title
      level={2}
      style={{
        textAlign: "center",
        marginBottom: 40,
        fontWeight: 700,
      }}
    >
      Our Ministries
    </Title>

    <Row gutter={[24, 24]} justify="center">
      {ministries.map((m) => (
        <Col xs={24} sm={12} lg={8} key={m.id}>
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
                  alt={m.name}
                  src={m.image}
                  style={{ height: 208, objectFit: "cover" }}
                />
              }
              style={{
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <Title level={4} style={{ marginBottom: 8 }}>
                {m.name}
              </Title>
              <Paragraph style={{ color: "#595959" }}>{m.description}</Paragraph>
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  </SectionWrapper>
);

export default MinistriesSection;
