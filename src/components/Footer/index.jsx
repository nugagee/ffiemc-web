import { Link } from "react-router-dom";
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
    <footer id="footer" className="site-footer">
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
              <li><Link to="/about-us" className="footer-link">About Us</Link></li>
              <li><Link to="/services" className="footer-link">Our Services</Link></li>
              <li>Leadership</li>
              <li>Ministries</li>
              <li>Events</li>
              <li><Link to="/contact-us" className="footer-link">Contact</Link></li>
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
                Women's Program (Mo Wo Fin)
                  <br />
                  9:00 AM - 2:00 PM
                </p>
              </div>
            </div>

            {/* <div className="service-item">
              <ClockCircleOutlined />
              <div>
                <strong>Wednesday</strong>
                <p>
                  Mid-week Service
                  <br />
                  6:00 PM - 8:00 PM
                </p>
              </div>
            </div> */}
          </Col>

          {/* Contact */}
          <Col xs={24} md={6}>
            <h4 className="footer-title">Contact Us</h4>

            <div className="contact-item">
              <EnvironmentOutlined />
              <span>
              Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Ibadan, Nigeria</span>
            </div>

            <div className="contact-item">
              <PhoneOutlined />
              <span>+234 816 267 4805</span>
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
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
