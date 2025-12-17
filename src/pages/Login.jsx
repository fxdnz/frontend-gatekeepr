"use client";

import { useState, useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { connect } from "react-redux";
import { login } from "../actions/auth";
import "./Login.css";

const Login = ({ login, isAuthenticated }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  const { email, password } = formData;

  // Check for dark mode on component mount and when mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.body.classList.contains("dark-mode");
      setIsDarkMode(isDark);
    };

    // Initial check
    checkDarkMode();

    // Observe for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;

    // Clear field errors when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) {
      setFormError("");
    }

    setFormData({ ...formData, [name]: value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});
    setFormError("");

    // Frontend validation
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Handle login errors
      if (err.response) {
        const errorData = err.response.data;

        // Handle different error response formats
        if (typeof errorData === "object") {
          // Check for field-specific errors
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
            // Handle non-field specific errors like wrong credentials
            setFormError(
              errorData.detail ||
                errorData.message ||
                "Invalid email or password. Please try again."
            );
          }
        } else if (typeof errorData === "string") {
          setFormError(errorData);
        } else {
          setFormError("Invalid email or password. Please try again.");
        }
      } else if (err.request) {
        setFormError(
          "No response from server. Please check your network connection."
        );
      } else {
        setFormError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const location = useLocation();

  // Redirect if authenticated
  if (isAuthenticated) {
    const { state } = location;
    const redirectPath = state?.from || "/";
    return <Navigate to={redirectPath} />;
  }

  return (
    <div className="login-container">
      <div className="login-left">
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
      <div className="login-right">
        <div className="login-form-container">
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

          <h1 className="welcome-text">Welcome Back</h1>

          <form onSubmit={onSubmit}>
            {/* Form-level error message - positioned above email */}
            {formError && (
              <div className="form-error">
                <i className="fas fa-exclamation-circle"></i>
                {formError}
              </div>
            )}

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
                disabled={isLoading}
                className={fieldErrors.email ? "error-input" : ""}
              />
              {fieldErrors.email && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={onChange}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className={fieldErrors.password ? "error-input" : ""}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <i className="fas fa-eye"></i>
                  ) : (
                    <i className="fas fa-eye-slash"></i>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <div className="form-footer">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  disabled={isLoading}
                />
                <label htmlFor="remember">Remember me</label>
              </div>
              <Link to="/reset-password" className="forgot-password">
                Forgot Password
              </Link>
            </div>

            <button
              className={`auth-button ${isLoading ? "loading" : ""}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner white">
                  <div className="bounce1"></div>
                  <div className="bounce2"></div>
                  <div className="bounce3"></div>
                </div>
              ) : (
                "Sign in"
              )}
            </button>
            <div className="create-account">
              <p>Doesn't have an account? Contact your Administrator</p>
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

export default connect(mapStateToProps, { login })(Login);
