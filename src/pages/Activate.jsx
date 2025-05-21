"use client";

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import { verify } from "../actions/auth";
import "./AuthPages.css";

const Activate = ({ verify, isAuthenticated }) => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoActivating, setAutoActivating] = useState(true);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Auto-activate account on component mount
  useEffect(() => {
    if (autoActivating) {
      activateAccount();
    }
  }, []);

  // Redirect to login after successful activation
  useEffect(() => {
    if (verified) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [verified, navigate]);

  const activateAccount = async () => {
    setLoading(true);
    setError("");
    setAutoActivating(false);

    try {
      await verify(uid, token);
      setVerified(true);
    } catch (err) {
      setError(
        "Account activation failed. The link may be invalid or expired."
      );
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

          <h1 className="welcome-text">Account Activation</h1>

          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div className="spinner">
                <div className="bounce1"></div>
                <div className="bounce2"></div>
                <div className="bounce3"></div>
              </div>
              <p style={{ marginTop: "1rem", color: "#666" }}>
                Activating your account...
              </p>
            </div>
          )}

          {verified && (
            <div className="auth-message auth-success">
              Your account has been successfully activated! You will be
              redirected to the login page in a few seconds.
            </div>
          )}

          {error && (
            <div className="auth-message auth-error">
              {error}
              <p style={{ marginTop: "1rem" }}>
                If you continue to experience issues, please contact support or
                try registering again.
              </p>
            </div>
          )}

          {!loading && !verified && !error && (
            <div className="auth-message auth-success">
              Activating your account...
            </div>
          )}

          {(verified || error) && (
            <div className="auth-link" style={{ marginTop: "2rem" }}>
              <Link to="/login" className="auth-button">
                Go to Login
              </Link>
            </div>
          )}

          {error && (
            <div className="auth-link">
              <p>
                Need a new account? <Link to="/signup">Sign Up</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, { verify })(Activate);
