import { useParams } from "react-router-dom";

const MinistryDetailsPage = () => {
  const { id } = useParams();

  return (
    <div style={{ padding: 60 }}>
      <h1>Ministry: {id}</h1>
      <p>Detailed ministry page content here.</p>
    </div>
  );
};

export default MinistryDetailsPage;
