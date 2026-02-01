import { Card, Row, Col, Button, Divider } from "antd";
import "./SocialFeedSection.css";
import {
  FacebookFilled,
  InstagramFilled,
  TwitterOutlined,
  CustomerServiceFilled,
  TikTokOutlined,
} from "@ant-design/icons";
import img1 from "../../assets/img/chu.jpeg";

const socialPosts = [
  {
    platform: "Facebook",
    time: "2 hours ago",
    image: img1,
    text: "Join us this Sunday for a powerful message on 'Walking in Divine Purpose'.",
    icon: <FacebookFilled />,
  },
  {
    platform: "Instagram",
    time: "5 hours ago",
    image: img1,
    text: "Our youth are on fire for God! 🔥 Last night was powerful.",
    icon: <InstagramFilled />,
  },
  {
    platform: "Twitter",
    time: "1 day ago",
    image: img1,
    text: "Prayer changes everything! Join our Wednesday prayer meeting.",
    icon: <TwitterOutlined />,
  },
  {
    platform: "TikTok",
    time: "2 days ago",
    image: img1,
    text: "Pastor’s wisdom in 60 seconds 💡 Your situation is not your destination.",
    icon: <TikTokOutlined />,
  },
  {
    platform: "Audiomack",
    time: "3 days ago",
    image: img1,
    text: "🎵 New sermon audio: The Power of Persistent Faith.",
    icon: <CustomerServiceFilled />,
  },
  {
    platform: "Facebook",
    time: "4 days ago",
    image: img1,
    text: "Testimony Thursday! God restored her family.",
    icon: <FacebookFilled />,
  },
];

const platforms = [
  {
    name: "Facebook",
    icon: <FacebookFilled />,
    link: "https://facebook.com",
  },
  {
    name: "Instagram",
    icon: <InstagramFilled />,
    link: "https://instagram.com",
  },
  {
    name: "Twitter",
    icon: <TwitterOutlined />,
    link: "https://twitter.com",
  },
  {
    name: "TikTok",
    icon: <TikTokOutlined />,
    link: "https://tiktok.com",
  },
  {
    name: "Audiomack",
    icon: <CustomerServiceFilled />,
    link: "https://audiomack.com",
  },
];

export default function SocialFeedSection() {
  return (
    <section className="social-feed">
      <div className="social-feed-header">
        <span className="badge">Stay Connected</span>
        <h2>Follow Our Journey</h2>
        <p>
          Stay updated with our latest activities, messages, and community
          highlights.
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {socialPosts.map((post, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              hoverable
              className="social-card"
              cover={
                post.image ? (
                  <img
                    src={post.image}
                    alt={post.platform}
                    className="social-card-image"
                  />
                ) : null
              }
            >
              {/* Header */}
              <div className="social-card-header">
                <div className="platform">
                  <span className="platform-icon">{post.icon}</span>
                  <span>{post.platform}</span>
                </div>
                <span className="time">{post.time}</span>
              </div>

              {/* Content */}
              <p className="social-card-text">{post.text}</p>

              <Divider />

              {/* Footer */}
              <div className="social-card-footer">
                <div className="stats">
                  <span>👍 {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  <span>↗ {post.shares}</span>
                </div>

                <Button type="link" className="view-post-btn">
                  View Post
                </Button>
              </div>
            </Card>
          </Col>
        ))}

        <div className="social-platforms">
          <p className="platform-title">Follow us on all platforms</p>

          <Row justify="center" gutter={[16, 16]}>
            {platforms.map((platform, index) => (
              <Col key={index}>
                <a href={platform.link} target="_blank" rel="noreferrer">
                  <Card className="platform-card" bordered={false}>
                    <span className="platform-icon">{platform.icon}</span>
                    <span className="platform-name">{platform.name}</span>
                  </Card>
                </a>
              </Col>
            ))}
          </Row>
        </div>
      </Row>
    </section>
  );
}
