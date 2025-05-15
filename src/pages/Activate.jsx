import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { connect } from "react-redux";
import { verify } from "../actions/auth";

const Activate = ({ verify }) => {
  const { uid, token } = useParams();
  const [verified, setVerified] = useState(false);

  const verify_account = (e) => {
    verify(uid, token);
    setVerified(true);
  };

  if (verified) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container">
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ marginTop: "200px" }}
      >
        <h1>Activate Your Account</h1>
        <button
          onClick={verify_account}
          style={{ marginTop: "50px" }}
          type="button"
          className="btn btn-primary"
        >
          Activate
        </button>
      </div>
    </div>
  );
};

export default connect(null, { verify })(Activate);
