import React, { useEffect, useState, useRef } from "react";
import { Layout, Row, Col, Typography, Button, Card } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Timer } from "lucide-react";
import hero1 from "../../assets/img/hero/home4.jpeg";
import hero2 from "../../assets/img/hero/home3.jpeg";
import hero3 from "../../assets/img/hero/home2.jpeg";

const { Content } = Layout;
const { Title, Text } = Typography;

const slidesData = [
  {
    id: 1,
    image: hero1,
    eyebrow: "Fire-Fire International Evangelical Church",
    title: "Igniting Hearts, Transforming Lives",
    subtitle: "Experience God's Love in Our Community",
    subtitle2:
      "Join us as we spread the fire of God's love and build His kingdom together.",
    ctaPrimary: { text: "Join Our Family", href: "#plan" },
    ctaSecondary: { text: "Watch Live", href: "#watch" },
  },
  {
    id: 2,
    image: hero2,
    eyebrow: "Join Us This Sunday",
    title: "Teaching One by One Another",
    subtitle: "Growing Together in Faith.",
    subtitle2:
      "Discover the power of personal discipleship and community fellowship.",
    ctaPrimary: { text: "Visit This Sunday", href: "#visit" },
    ctaSecondary: { text: "Watch Sermon", href: "#watch" },
  },
  {
    id: 3,
    image: hero3,
    eyebrow: "You're Welcome Here",
    title: "Come as You Are",
    subtitle:
      "We’re a community where everyone can belong — come and find a home.",
    subtitle2:
      "Experience worship, biblical teaching, and warm fellowship with us.",
    ctaPrimary: { text: "Plan Your Visit", href: "#directions" },
    ctaSecondary: { text: "Live Stream", href: "#live" },
  },
];

const HeroSection = ({
  slides = slidesData,
  autoplay = true,
  autoplayInterval = 6000,
}) => {
  const [index, setIndex] = useState(0);
  const autoplayRef = useRef(null);
  const count = slides.length;

  useEffect(() => {
    if (!autoplay) return;
    autoplayRef.current = setInterval(
      () => setIndex((i) => (i + 1) % count),
      autoplayInterval
    );
    return () => clearInterval(autoplayRef.current);
  }, [autoplay, autoplayInterval, count]);

  const goPrev = () => setIndex((i) => (i - 1 + count) % count);
  const goNext = () => setIndex((i) => (i + 1) % count);

  return (
    <Layout>
      <Content style={{ position: "relative", height: "95vh", overflow: "hidden" }}>
        <AnimatePresence>
          {slides.map(
            (slide, i) =>
              i === index && (
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${slide.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(90deg, rgba(212,69,39,0.85), rgba(0,0,0,0.35))",
                    }}
                  />

                  <Row
                    align="middle"
                    style={{ height: "100%", position: "relative", padding: "0 8%", marginTop: -10 }}
                  >
                    <Col xs={24} md={14}>
                      <Text
                        style={{
                          color: "#fff",
                          padding: "6px 14px",
                          borderRadius: 20,
                          background: "rgba(255,255,255,0.15)",
                          display: "inline-block",
                          marginBottom: 16,
                        }}
                      >
                        {slide.eyebrow}
                      </Text>

                      <Title style={{ color: "#fff", fontSize: 40, margin: "15px 0" }}>
                        {slide.title}
                      </Title>

                      <Text style={{ color: "#f5f5f5", fontSize: 18 }}>
                        {slide.subtitle}
                      </Text>
                      <br />
                      <Text style={{ color: "#f5f5f5", fontSize: 18 }}>
                        {slide.subtitle2}
                      </Text>

                      <div style={{ marginTop: 32 }}>
                        <Button
                          type="primary"
                          size="large"
                          href={slide.ctaPrimary.href}
                          style={{
                            marginRight: 16,
                            borderRadius: 30,
                            padding: "0 28px",
                          }}
                        >
                          {slide.ctaPrimary.text}
                        </Button>

                        <Button
                          size="large"
                          ghost
                          href={slide.ctaSecondary.href}
                          icon={<Play size={16} />}
                          style={{ borderRadius: 30 }}
                        >
                          {slide.ctaSecondary.text}
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </motion.div>
              )
          )}
        </AnimatePresence>
          {/* Schedule Cards */}
      <Content style={{ padding: "0 8%", width: "100%",  position: "absolute", bottom: 15 }}>
        <Card bordered style={{ textAlign: "center", borderRadius: 16 }}>
        <Title level={5} >Join Us for Worship</Title>
        <Text level={9} type="secondary">All are welcome to experience God's love</Text>
        <Row gutter={[16, 16]}>

          {[
            ["Sunday", "8:00 AM - 9:00 AM", "Sitting at Jesus' Feet"],
            ["Sunday", "9:00 AM - 12:00 PM", "Main Service"],
            ["Monday", "5:00 PM - 7:00 PM", "Bible Study"],
            ["Wednesday", "6:00 PM - 8:00 PM", "Mid-week Service"],
          ].map((item, i) => (
            <Col xs={24} md={6} key={i}>
                <Timer style={{ color: "var(--color-accent)" }} size={20} />
                <Title level={5} >{item[2]}</Title>
                <Title level={5} style={{ margin: "5px 0"}} type="secondary">{item[0]}</Title>
                <Text style={{ color: "var(--color-accent)" }}>{item[1]}</Text>
            </Col>
          ))}
        </Row>
              </Card>
      </Content>

        {/* Navigation */}
        <Button
          shape="circle"
          onClick={goPrev}
          style={{ position: "absolute", left: 20, top: "50%" }}
          icon={<ChevronLeft />}
        />
        <Button
          shape="circle"
          onClick={goNext}
          style={{ position: "absolute", right: 20, top: "50%" }}
          icon={<ChevronRight />}
        />
      </Content>

    
    </Layout>
  );
};

export default HeroSection;
