import "./BouncingSpinner.css";

const BouncingSpinner = ({ white = false }) => {
  return (
    <div className="bouncing-spinner-container">
      <div className={`bouncing-spinner ${white ? "white" : ""}`}>
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </div>
    </div>
  );
};

export default BouncingSpinner;
