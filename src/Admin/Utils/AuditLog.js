import { Table } from "antd";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "../../firebase/firestore";

export default function AuditLogs() {
  const [snap, loading] = useCollection(
    query(collection(db, "activityLogs"), orderBy("createdAt", "desc"))
  );

  const data = snap?.docs.map(doc => ({
    key: doc.id,
    ...doc.data(),
  }));

  return (
    <Table
      loading={loading}
      dataSource={data}
      columns={[
        { title: "User", dataIndex: ["performedBy", "name"] },
        { title: "Action", dataIndex: "action" },
        { title: "Description", dataIndex: "description" },
        { title: "Date", dataIndex: "createdAt",
          render: t => t?.toDate().toLocaleString() },
      ]}
    />
  );
}
