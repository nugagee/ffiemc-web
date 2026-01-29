import React from "react";
import { Row, Col, Card, Button, Typography } from "antd";

const { Title, Text, Paragraph } = Typography;

const EventsSection = ({ events }) => {
  return (
    <section style={{ padding: "64px 24px" }}>
      <Title level={2} style={{ textAlign: "center", marginBottom: 40 }}>
        Upcoming Events
      </Title>

      <Row gutter={[24, 24]} justify="center">
        {events.map((event, index) => (
          <Col
            key={index}
            xs={24}
            sm={12}
            md={8}
            lg={6}
          >
            <Card
              hoverable
              style={{ height: "100%" }}
              actions={[
                <Button type="link" key="learn-more">
                  Learn More
                </Button>,
              ]}
            >
              <Text type="secondary">{event.date}</Text>
              <Title level={4} style={{ marginTop: 8 }}>
                {event.title}
              </Title>
              <Paragraph>{event.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default EventsSection;
