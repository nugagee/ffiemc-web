import { useEffect, useState } from "react";
import { Card, Row, Col, Button, Divider, Skeleton, Modal } from "antd";
import {
  FacebookFilled,
  InstagramFilled,
  TwitterOutlined,
  CustomerServiceFilled,
  TikTokOutlined,
  YoutubeOutlined
} from "@ant-design/icons";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import "./SocialFeedSection.css";
import { db } from "../../services/firebase";
import img1 from "../../assets/img/chu.jpeg";

const platforms = [
  { name: "Facebook", icon: <FacebookFilled />, link: "https://facebook.com" },
  { name: "Instagram", icon: <InstagramFilled />, link: "https://instagram.com" },
  { name: "Twitter", icon: <TwitterOutlined />, link: "https://twitter.com" },
  { name: "TikTok", icon: <TikTokOutlined />, link: "https://tiktok.com" },
  { name: "Audiomack", icon: <CustomerServiceFilled />, link: "https://audiomack.com" },
  { name: "YouTube", icon: <YoutubeOutlined />, link: "https://youtube.com" },
];

export default function SocialFeedSection() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const q = query(
          collection(db, "socialFeeds"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setFeeds(snapshot.docs.map(doc => doc.data()));
      } catch (err) {
        console.error("Failed to fetch feeds", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  return (
    <section className="social-feed">
      {/* HEADER */}
      <div className="social-feed-header">
        <span className="badge">Stay Connected</span>
        <h2>Follow Our Journey</h2>
        <p>Stay updated with our latest activities and messages.</p>
      </div>

      {/* FEEDS */}
      <Row gutter={[24, 24]}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <Card>
                  <Skeleton.Image active />
                  <Skeleton active paragraph={{ rows: 3 }} />
                </Card>
              </Col>
            ))
          : feeds.map((post, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card
                  hoverable
                  className="social-card"
                  cover={
                      <img
                        src={img1}
                        // src={post.thumbnail}
                        alt={post.platform}
                        className="social-card-image"
                      />
                    // post.thumbnail && (
                    //   <img
                    //     src={post.thumbnail}
                    //     alt={post.platform}
                    //     className="social-card-image"
                    //   />
                    // )
                  }
                >
                  {/* Header */}
                  <div className="social-card-header">
                    <div className="platform">
                      {post.platform === "Facebook" && <FacebookFilled />}
                      {post.platform === "Instagram" && <InstagramFilled />}
                      {post.platform === "Audiomack" && <CustomerServiceFilled />}
                      {post.platform === "YouTube" && <YoutubeOutlined />}
                      {post.platform === "TikTok" && <TikTokOutlined />}
                      <span>{post.platform}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="social-card-text">{post.text}</p>

                  <Divider />

                  {/* Footer */}
                  <Button
                    type="primary"
                    block
                    onClick={() => setActiveMedia(post)}
                  >
                    {post.type === "audio" ? "Listen" : "Watch"}
                  </Button>
                </Card>
              </Col>
            ))}
      </Row>

      {/* FOLLOW PLATFORMS */}
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

      {/* MEDIA MODAL */}
      <Modal
        open={!!activeMedia}
        footer={null}
        onCancel={() => setActiveMedia(null)}
        width={900}
        centered
      >
        {activeMedia?.type === "audio" ? (
          <iframe
            src={activeMedia.mediaUrl}
            width="100%"
            height="180"
            frameBorder="0"
            allow="autoplay"
          />
        ) : (
          <iframe
            src={activeMedia?.mediaUrl}
            width="100%"
            height="480"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        )}
      </Modal>
    </section>
  );
}
