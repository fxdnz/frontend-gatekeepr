"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import "./AuthPages.css";

const ResetPassword = ({ isAuthenticated }) => {
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  const { email } = formData;

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.body.classList.contains("dark-mode");
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;

    // Clear field errors when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error) {
      setError("");
    }

    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    // Frontend validation
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const body = JSON.stringify({ email });
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(
        `${API_BASE_URL}/auth/users/reset_password/`,
        {
          method: "POST",
          headers: config.headers,
          body,
        }
      );

      if (response.ok) {
        setRequestSent(true);
      } else {
        const errorData = await response.json();
        if (typeof errorData === "object") {
          const newFieldErrors = {};
          for (const field in errorData) {
            if (Array.isArray(errorData[field])) {
              newFieldErrors[field] = errorData[field][0];
            } else {
              newFieldErrors[field] = errorData[field];
            }
          }
          if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
          } else {
            setError(
              errorData.detail ||
                "Failed to send password reset email. Please check your email and try again."
            );
          }
        } else {
          setError(
            "Failed to send password reset email. Please check your email and try again."
          );
        }
      }
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
            <img
              src={
                isDarkMode
                  ? "/gatekeepr-logo-white.png"
                  : "/gatekeepr-logo-black.png"
              }
              alt="gatekeepr"
            />
          </div>

          <h1 className="welcome-text">Reset Password</h1>
          <p className="welcome-subtext">
            Enter your email address and we'll send you instructions to reset
            your password.
          </p>

          {requestSent && (
            <div className="auth-message auth-success">
              <i className="fas fa-check-circle"></i>
              Password reset email has been sent. Please check your inbox and
              follow the instructions.
            </div>
          )}

          {error && (
            <div className="auth-message auth-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

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
                className={fieldErrors.email ? "error-input" : ""}
              />
              {fieldErrors.email && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {fieldErrors.email}
                </div>
              )}
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

export default connect(mapStateToProps)(ResetPassword);
