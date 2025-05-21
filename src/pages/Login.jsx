"use client";

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
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

  const { email, password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    login(email, password);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Redirect if authenticated
  if (isAuthenticated) {
    return <Navigate to="/" />;
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
            <img src="/gatekeepr-logo.png" alt="gatekeepr" />
          </div>

          <h1 className="welcome-text">Welcome Back</h1>

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
              />
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
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <i className="eye-icon">👁️</i>
                  ) : (
                    <i className="eye-icon">👁️‍🗨️</i>
                  )}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <label htmlFor="remember">Remember me</label>
              </div>
              <Link to="/reset-password" className="forgot-password">
                Forgot Password
              </Link>
            </div>

            <button className="sign-in-button" type="submit">
              Sign in
            </button>
            <div className="create-account">
              <p>
                Doesn't have an account?{" "}
                <Link to="/signup" className="create-account-link">
                  Create account
                </Link>
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

export default connect(mapStateToProps, { login })(Login);
