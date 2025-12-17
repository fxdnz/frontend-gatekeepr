import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ErrorPages.css";

const Forbidden = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setDarkMode(document.body.classList.contains("dark-mode"));
    };

    checkDarkMode();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="error-container">
      <div className="error-content enhanced-error forbidden-content">
        <div className="error-header">
          <div className="error-title-section">
            <i className="fas fa-ban error-main-icon forbidden-icon"></i>
            <h1 className="error-main-title">Access Denied</h1>
          </div>
        </div>

        <div className="error-code forbidden-code">403</div>

        <div className="error-details">
          <p className="error-description">
            You don't have permission to access this page. This area is
            restricted to authorized personnel only.
          </p>

          <div className="error-suggestions">
            <div className="suggestion-item">
              <i className="fas fa-user-shield suggestion-icon"></i>
              <span>Contact your administrator for access</span>
            </div>
            <div className="suggestion-item">
              <i className="fas fa-home suggestion-icon"></i>
              <span>Return to your dashboard</span>
            </div>
            <div className="suggestion-item">
              <i className="fas fa-envelope suggestion-icon"></i>
              <span>Request permission if needed</span>
            </div>
          </div>

          <div className="permission-info">
            <div className="info-card">
              <h4>Available Roles for This Page:</h4>
              <div className="role-list">
                <span className="role-tag system-admin">
                  System Administrator
                </span>
                <span className="role-tag user-admin">User Administrator</span>
              </div>
              <p className="info-note">
                Your current role doesn't have sufficient permissions to view
                this content.
              </p>
            </div>
          </div>
        </div>

        <div className="error-actions enhanced-actions">
          <button
            className="error-button primary enhanced-button"
            onClick={() => navigate("/")}
          >
            <i className="fas fa-home"></i>
            Go to Dashboard
          </button>
          <button
            className="error-button secondary enhanced-button"
            onClick={() => navigate(-1)}
          >
            <i className="fas fa-arrow-left"></i>
            Go Back
          </button>
          <button
            className="error-button tertiary enhanced-button"
            onClick={() => navigate("/settings")}
          >
            <i className="fas fa-cog"></i>
            Settings
          </button>
        </div>

        <div className="error-footer">
          <p>Need access? Contact your system administrator</p>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
