import { Layout, Drawer } from "antd";
import { useState } from "react";
import Sidebar from "./Sidebar";

const { Header, Sider, Content } = Layout;

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        bodyStyle={{ padding: 0 }}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </Drawer>

      {/* Desktop Sidebar */}
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        width={260}
        className="admin-sider"
      >
        <Sidebar />
      </Sider>

      <Layout>
        <Header className="admin-header" style={{background: "#ff000029"}}>
          <span onClick={() => setOpen(true)} className="mobile-menu-btn">
            ☰
          </span>
          Admin Portal
        </Header>

        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
