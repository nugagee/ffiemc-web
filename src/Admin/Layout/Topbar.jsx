// admin/layout/Topbar.jsx
import { Layout, Button, Space } from "antd";
import {
  SaveOutlined,
  ExportOutlined,
} from "@ant-design/icons";

const { Header } = Layout;

export default function Topbar() {
  return (
    <Header
      style={{
        background: "#fff",
        borderBottom: "1px solid #eee",
        paddingInline: 32,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>Dashboard / Homepage Sections</span>

      <Space>
        <Button icon={<ExportOutlined />}>View Live Site</Button>
        <Button type="primary" icon={<SaveOutlined />}>
          Publish Changes
        </Button>
      </Space>
    </Header>
  );
}
