"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { connect } from "react-redux";
import "./AuthPages.css";

const ResetPasswordConfirm = ({ isAuthenticated }) => {
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { new_password, re_new_password } = formData;

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

    // Clear field errors when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error) {
      setError("");
    }

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
    setFieldErrors({});

    // Frontend validation
    const errors = {};

    if (!formData.new_password.trim()) {
      errors.new_password = "New password is required";
    } else if (formData.new_password.length < 8) {
      errors.new_password = "Password must be at least 8 characters";
    }

    if (!formData.re_new_password.trim()) {
      errors.re_new_password = "Please confirm your password";
    } else if (new_password !== re_new_password) {
      errors.re_new_password = "Passwords do not match";
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

      const body = JSON.stringify({
        uid,
        token,
        new_password,
        re_new_password,
      });
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(
        `${API_BASE_URL}/auth/users/reset_password_confirm/`,
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
                "Failed to reset password. The link may be invalid or expired."
            );
          }
        } else {
          setError(
            "Failed to reset password. The link may be invalid or expired."
          );
        }
      }
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
            <img
              src={
                isDarkMode
                  ? "/gatekeepr-logo-white.png"
                  : "/gatekeepr-logo-black.png"
              }
              alt="gatekeepr"
            />
          </div>

          <h1 className="welcome-text">Create New Password</h1>
          <p className="welcome-subtext">
            Please enter your new password below.
          </p>

          {requestSent && (
            <div className="auth-message auth-success">
              <i className="fas fa-check-circle"></i>
              Your password has been reset successfully! You will be redirected
              to the login page in a few seconds.
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
                  className={fieldErrors.new_password ? "error-input" : ""}
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
              {fieldErrors.new_password && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {fieldErrors.new_password}
                </div>
              )}
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
                  className={fieldErrors.re_new_password ? "error-input" : ""}
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
              {fieldErrors.re_new_password && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {fieldErrors.re_new_password}
                </div>
              )}
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

export default connect(mapStateToProps, null)(ResetPasswordConfirm);
