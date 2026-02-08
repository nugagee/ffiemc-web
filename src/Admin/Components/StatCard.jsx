// admin/components/StatCard.jsx
import { Card, Typography } from "antd";

const { Text } = Typography;

export default function StatCard({ title, value, footer, icon }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <Text type="secondary">{title}</Text>
          <h2>{value}</h2>
        </div>
        {icon}
      </div>
      <Text type="secondary">{footer}</Text>
    </Card>
  );
}
