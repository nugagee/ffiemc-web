import { Row, Col, Card, Statistic, Skeleton, List } from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Dashboard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
  
    useEffect(() => {
      const q = query(
        collection(db, "activityLogs"),
        orderBy("createdAt", "desc"),
        limit(6)
      );
  
      const unsub = onSnapshot(q, (snap) => {
        setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
  
      return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "stats", "dashboard"), (docSnap) => {
          setStats(docSnap.data());
        });
        return () => unsub();
      }, []);


  return (
    <>
      <h2>Admin Dashboard</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Total Admins"
              value={stats?.totalAdmins || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Pending Content"
              value={stats?.pendingContent || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Approved Posts"
              value={stats?.approvedPosts || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Live Pages"
              value={stats?.livePages || 0}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <h3>Recent Activity</h3>
        <ul>
          <li>Admin John approved a sermon</li>
          <li>Editor Mary updated homepage banner</li>
          <li>Admin created a new ministry</li>
        </ul>
      </Card>
       {/* Stats section comes next */}

       <Card title="Recent Activity" style={{ marginTop: 24 }}>
        {loading ? (
          <Skeleton active />
        ) : (
          <List
            dataSource={logs}
            renderItem={(log) => (
              <List.Item>
                <strong>{log.performedBy.name}</strong> — {log.description}
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  );
}
