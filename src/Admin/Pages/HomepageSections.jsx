// admin/pages/HomepageSections.jsx
import { Row, Col } from "antd";
import AdminLayout from "../Layout/AdminLayout";
import StatCard from "../Components/StatCard";
import SectionCard from "../Components/SectionCard";

export default function HomepageSections() {
  return (
    <AdminLayout>
      <Row gutter={24}>
        <Col span={8}>
          <StatCard
            title="Upcoming Events"
            value="3"
            footer="Next: Holy Ghost Fire Conference"
          />
        </Col>
        <Col span={8}>
          <StatCard
            title="Sermons Online"
            value="128"
            footer="+2 added this week"
          />
        </Col>
        <Col span={8}>
          <StatCard
            title="Active Ministries"
            value="8"
            footer="All sections visible"
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
        <Col span={8}>
          <SectionCard
            title="Hero Banner"
            status="Active"
            description="Main headline and background media"
            image="https://storage.googleapis.com/banani-generated-images/generated-images/e825a9c9.jpg"
          />
        </Col>
        {/* Repeat for other sections */}
      </Row>
    </AdminLayout>
  );
}
