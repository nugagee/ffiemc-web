import React from "react";
import { Row, Col, Typography, Button, Card } from "antd";
import { HeartOutlined, TeamOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import logo from "../../assets/img/Logo png.png";
import { Timer } from "lucide-react";
import { Content } from "antd/es/layout/layout";
import "../Hero/hero.css";

const { Title, Text, Paragraph } = Typography;

const Scheduleection = () => {
  return (
    <div
    className="schedule-mobile"
    style={{
      padding: "0",
      // width: "100%",
      // position: "absolute",
      // bottom: 15,
    }}
  >
    <Card className="schedule-section"  bordered style={{ textAlign: "center", borderRadius: 16 }}>
      <Title level={5}>Join Us for Worship</Title>
      <Text level={9} type="secondary">
        All are welcome to experience God's love
      </Text>
      <Row className="schedule-cards" gutter={[16, 16]}>
        {[
                 ["Sunday", "8:00 AM - 9:00 AM", "Sitting at Jesus' Feet"],
                 ["Sunday", "9:00 AM - 12:00 PM", "Main Service"],
                 ["Monday", "5:00 PM - 7:00 PM", "Bible Study"],
                 ["Wednesday", "9:00 AM - 2:00 PM", "Women's Program (Mo Wo Fin)"],
        ].map((item, i) => (
          <Col xs={24} md={6} key={i}>
            <Timer style={{ color: "var(--color-accent)" }} size={20} />
            <Title level={5}>{item[2]}</Title>
            <Title level={5} style={{ margin: "5px 0" }} type="secondary">
              {item[0]}
            </Title>
            <Text style={{ color: "var(--color-accent)" }}>
              {item[1]}
            </Text>
          </Col>
        ))}
      </Row>
    </Card>
  </div>
  );
};

export default Scheduleection;
