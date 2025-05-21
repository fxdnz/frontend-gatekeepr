"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import { reset_password } from "../actions/auth";
import "./AuthPages.css";

const ResetPassword = ({ reset_password, isAuthenticated }) => {
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
  });
  const navigate = useNavigate();

  const { email } = formData;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await reset_password(email);
      setRequestSent(true);
    } catch (err) {
      setError("Failed to send password reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="overlay-text">
          <h1>
            A Residential Vehicle Access Control System Utilizing RFID and OCR
            Technology
          </h1>
          <div className="caption">
            A Capstone Project by BSIT 3rd Year Students | USTP - CDO Campus |
            Team 5ive
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="logo">
            <img src="/gatekeepr-logo.png" alt="gatekeepr" />
          </div>

          <h1 className="welcome-text">Reset Password</h1>
          <p className="welcome-subtext">
            Enter your email address and we'll send you instructions to reset
            your password.
          </p>

          {requestSent && (
            <div className="auth-message auth-success">
              Password reset email has been sent. Please check your inbox and
              follow the instructions.
            </div>
          )}

          {error && <div className="auth-message auth-error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email"
                required
                disabled={loading || requestSent}
              />
            </div>

            <button
              className="auth-button"
              type="submit"
              disabled={loading || requestSent}
            >
              {loading ? (
                <div className="spinner white">
                  <div className="bounce1"></div>
                  <div className="bounce2"></div>
                  <div className="bounce3"></div>
                </div>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="auth-link">
              <p>
                Remember your password? <Link to="/login">Back to Login</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, { reset_password })(ResetPassword);
