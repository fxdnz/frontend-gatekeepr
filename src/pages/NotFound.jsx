import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ErrorPages.css";

const NotFound = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.body.classList.contains("dark-mode");
      setDarkMode(isDark);
      console.log("Dark mode detected:", isDark); // Debug log
    };

    // Initial check
    checkDarkMode();

    // Set up observer for class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also check on interval as backup
    const interval = setInterval(checkDarkMode, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`error-container ${darkMode ? "dark-mode" : ""}`}>
      <div className="error-content enhanced-error">
        <div className="error-header">
          <div className="error-title-section">
            <i className="fas fa-exclamation-triangle error-main-icon"></i>
            <h1 className="error-main-title">Page Not Found</h1>
          </div>
        </div>

        <div className={`error-code ${darkMode ? "dark" : "light"}`}>404</div>

        <div className="error-details">
          <p className="error-description">
            The page you're looking for doesn't exist or has been moved. This
            could be due to an outdated link or a typo in the URL.
          </p>

          <div className="error-suggestions">
            <div className="suggestion-item">
              <i className="fas fa-check-circle suggestion-icon"></i>
              <span>Check the URL for typos</span>
            </div>
            <div className="suggestion-item">
              <i className="fas fa-check-circle suggestion-icon"></i>
              <span>Navigate using the sidebar menu</span>
            </div>
            <div className="suggestion-item">
              <i className="fas fa-check-circle suggestion-icon"></i>
              <span>Return to the dashboard</span>
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
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-redo"></i>
            Reload Page
          </button>
        </div>

        <div className="error-footer">
          <p>If this issue persists, please contact support</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
