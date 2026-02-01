import {
  FacebookFilled,
  TwitterOutlined,
  YoutubeOutlined,
  InstagramOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Row, Col } from "antd";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <Row gutter={[40, 40]}>
          {/* Church Info */}
          <Col xs={24} md={6}>
            <div className="footer-brand">
              <h3>Fire-Fire Int'l</h3>
              <span>Evangelical Church</span>
              <p>Teach one by one another</p>

              <div className="social-icons">
                <FacebookFilled />
                <TwitterOutlined />
                <YoutubeOutlined />
                <InstagramOutlined />
              </div>
            </div>
          </Col>

          {/* Quick Links */}
          <Col xs={24} md={6}>
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li>About Us</li>
              <li>Our Services</li>
              <li>Leadership</li>
              <li>Ministries</li>
              <li>Events</li>
              <li>Contact</li>
            </ul>
          </Col>

          {/* Service Times */}
          <Col xs={24} md={6}>
            <h4 className="footer-title">Service Times</h4>

            <div className="service-item">
              <ClockCircleOutlined />
              <div>
                <strong>Sunday</strong>
                <p>
                  Sitting at the Jesus feet
                  <br />
                  8:00 AM - 9:00 AM
                </p>
              </div>
            </div>

            <div className="service-item">
              <ClockCircleOutlined />
              <div>
                <strong>Sunday</strong>
                <p>
                  Main Service
                  <br />
                  9:00 AM - 12:00 PM
                </p>
              </div>
            </div>

            <div className="service-item">
              <ClockCircleOutlined />
              <div>
                <strong>Monday</strong>
                <p>
                  Bible Study
                  <br />
                  5:00 PM - 7:00 PM
                </p>
              </div>
            </div>

            <div className="service-item">
              <ClockCircleOutlined />
              <div>
                <strong>Wednesday</strong>
                <p>
                  Women's Program
                  <br />
                  12:00 PM - 3:00 PM
                </p>
              </div>
            </div>

            <div className="service-item">
              <ClockCircleOutlined />
              <div>
                <strong>Wednesday</strong>
                <p>
                  Mid-week Service
                  <br />
                  6:00 PM - 8:00 PM
                </p>
              </div>
            </div>
          </Col>

          {/* Contact */}
          <Col xs={24} md={6}>
            <h4 className="footer-title">Contact Us</h4>

            <div className="contact-item">
              <EnvironmentOutlined />
              <span>Fire-Fire Area, Papa Agric Olomi, Ibadan</span>
            </div>

            <div className="contact-item">
              <PhoneOutlined />
              <span>+234 803 123 4567</span>
            </div>

            <div className="contact-item">
              <MailOutlined />
              <span>info@firefireintl.org</span>
            </div>
          </Col>
        </Row>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Fire Evangelical Church. All Rights
          Reserved.
        </span>

        <div className="legal-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
