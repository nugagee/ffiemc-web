// admin/layout/Sidebar.jsx
import { Layout, Menu, Avatar, Typography } from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  MessageOutlined,
  PictureOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  FileTextOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useAuth } from "../Auth/AuthContext";
import { Link } from "react-router-dom";

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ onNavigate }) {
  const { adminData } = useAuth();

  return (
    <Sider breakpoint="lg" collapsedWidth={0} width={260} theme="light">
      <div style={{ padding: 20, fontWeight: 600 }}>🔥 Fire Int’l Admin</div>

      <Menu mode="inline" defaultSelectedKeys={["dashboard"]}>
        {/* <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
          Dashboard
        </Menu.Item> */}
        <Menu.Item icon={<DashboardOutlined />}>
          <Link to="/admin" onClick={onNavigate}>
            Dashboard
          </Link>
        </Menu.Item>
        <Menu.Item icon={<FileTextOutlined />}>
          <Link to="/admin/content" onClick={onNavigate}>
            Content
          </Link>
        </Menu.Item>

        <Menu.Item icon={<SafetyOutlined />}>
          <Link to="/admin/approvals" onClick={onNavigate}>
            Approvals
          </Link>
        </Menu.Item>

        <Menu.Item icon={<UserOutlined />}>
          <Link to="/admin/users" onClick={onNavigate}>
            Admin Users
          </Link>
        </Menu.Item>

        <Menu.ItemGroup title="Content Management">
          <Menu.Item key="home" icon={<HomeOutlined />}>
            Homepage Sections
          </Menu.Item>
          <Menu.Item key="events" icon={<CalendarOutlined />}>
            Events
          </Menu.Item>
          <Menu.Item key="sermons" icon={<CustomerServiceOutlined />}>
            Sermons
          </Menu.Item>
          <Menu.Item key="ministries" icon={<TeamOutlined />}>
            Ministries
          </Menu.Item>
          <Menu.Item key="testimonials" icon={<MessageOutlined />}>
            Testimonials
          </Menu.Item>
          <Menu.Item key="media" icon={<PictureOutlined />}>
            Media Library
          </Menu.Item>
        </Menu.ItemGroup>

        <Menu.ItemGroup title="System">
          {/* {adminData.permissions.manage_users && ( */}
            <>
              <Menu.Item key="settings" icon={<SettingOutlined />}>
                Settings
              </Menu.Item>
              <Menu.Item key="users" icon={<UserOutlined />}>
                Admin Users
              </Menu.Item>
            </>
          {/* )} */}
        </Menu.ItemGroup>
      </Menu>

      <div style={{ padding: 16, borderTop: "1px solid #eee" }}>
        <Avatar size={36} />
        <Text style={{ marginLeft: 8 }}>Pastor Michael</Text>
        <LogoutOutlined style={{ float: "right" }} />
      </div>
    </Sider>
  );
}
