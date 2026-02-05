import { Skeleton, Card } from "antd";

export function SocialSkeleton() {
  return (
    <Card style={{ borderRadius: 14 }}>
      <Skeleton.Image active style={{ width: "100%", height: 200 }} />
      <Skeleton active paragraph={{ rows: 3 }} />
    </Card>
  );
}
