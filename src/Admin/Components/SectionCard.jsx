// admin/components/SectionCard.jsx
import { Card, Button, Tag } from "antd";

export default function SectionCard({
  title,
  description,
  image,
  status,
  actionText = "Edit Content",
}) {
  return (
    <Card
      hoverable
      cover={<img src={image} alt={title} />}
      style={{ height: "100%" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h4>{title}</h4>
        <Tag color={status === "Active" ? "green" : "default"}>
          {status}
        </Tag>
      </div>
      <p>{description}</p>
      <Button block>{actionText}</Button>
    </Card>
  );
}
