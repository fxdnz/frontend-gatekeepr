"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { connect } from "react-redux";
import { reset_password_confirm } from "../actions/auth";
import "./AuthPages.css";

const ResetPasswordConfirm = ({ reset_password_confirm, isAuthenticated }) => {
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    new_password: "",
    re_new_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  const { new_password, re_new_password } = formData;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Redirect to login after successful password reset
  useEffect(() => {
    if (requestSent) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [requestSent, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Check password strength when new_password changes
    if (name === "new_password") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength("");
      return;
    }

    // Simple password strength check
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const score = [
      hasLowerCase,
      hasUpperCase,
      hasNumbers,
      hasSpecialChars,
      isLongEnough,
    ].filter(Boolean).length;

    if (score <= 2) {
      setPasswordStrength("weak");
    } else if (score <= 4) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (new_password !== re_new_password) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await reset_password_confirm(uid, token, new_password, re_new_password);
      setRequestSent(true);
    } catch (err) {
      setError("Failed to reset password. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const passwordsMatch =
    new_password && re_new_password && new_password === re_new_password;

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

          <h1 className="welcome-text">Create New Password</h1>
          <p className="welcome-subtext">
            Please enter your new password below.
          </p>

          {requestSent && (
            <div className="auth-message auth-success">
              Your password has been reset successfully! You will be redirected
              to the login page in a few seconds.
            </div>
          )}

          {error && <div className="auth-message auth-error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="new_password"
                  name="new_password"
                  value={new_password}
                  onChange={onChange}
                  placeholder="Enter your new password"
                  required
                  disabled={loading || requestSent}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={loading || requestSent}
                >
                  {showPassword ? (
                    <i className="fas fa-eye"></i>
                  ) : (
                    <i className="fas fa-eye-slash"></i>
                  )}
                </button>
              </div>
              {passwordStrength && (
                <div className={`password-strength ${passwordStrength}`}>
                  <div className="strength-text">
                    Password strength:{" "}
                    {passwordStrength.charAt(0).toUpperCase() +
                      passwordStrength.slice(1)}
                  </div>
                  <div className="password-strength-meter">
                    <div></div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="re_new_password">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="re_new_password"
                  name="re_new_password"
                  value={re_new_password}
                  onChange={onChange}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading || requestSent}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={loading || requestSent}
                >
                  {showConfirmPassword ? (
                    <i className="fas fa-eye"></i>
                  ) : (
                    <i className="fas fa-eye-slash"></i>
                  )}
                </button>
              </div>
              {re_new_password && (
                <div
                  className={`password-match ${
                    passwordsMatch ? "match" : "no-match"
                  }`}
                >
                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"}
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
                "Reset Password"
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

export default connect(mapStateToProps, { reset_password_confirm })(
  ResetPasswordConfirm
);
