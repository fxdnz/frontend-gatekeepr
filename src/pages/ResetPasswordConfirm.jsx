import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { connect } from "react-redux";
import { reset_password_confirm } from "../actions/auth";

const ResetPasswordConfirm = ({ reset_password_confirm }) => {
  const navigate = useNavigate();
  const { uid, token } = useParams();

  const [requestSent, setRequestSent] = useState(false);
  const [formData, setFormData] = useState({
    new_password: "",
    re_new_password: "",
  });

  const { new_password, re_new_password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    reset_password_confirm(uid, token, new_password, re_new_password);
    setRequestSent(true);
  };

  useEffect(() => {
    if (requestSent) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [requestSent, navigate]);

  return (
    <div className="container mt-5">
      <h1>Reset Password</h1>

      {requestSent && (
        <div className="alert alert-success mt-3" role="alert">
          Your password has been reset successfully. Redirecting to homepage...
        </div>
      )}

      {!requestSent && (
        <form onSubmit={onSubmit}>
          <div className="form-group mt-3">
            <input
              className="form-control"
              type="password"
              name="new_password"
              value={new_password}
              onChange={onChange}
              placeholder="New Password"
              required
            />
          </div>
          <div className="form-group mt-3">
            <input
              className="form-control"
              type="password"
              name="re_new_password"
              value={re_new_password}
              onChange={onChange}
              placeholder="Confirm New Password"
              required
            />
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
};

export default connect(null, { reset_password_confirm })(ResetPasswordConfirm);
