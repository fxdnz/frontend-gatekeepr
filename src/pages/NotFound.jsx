import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ErrorPages.css";

const NotFound = () => {
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
      <div className="error-content">
        <div className="error-logo">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <div className="error-code">404</div>
        <h1 className="error-title">Page Not Found</h1>
        <p className="error-message">
          The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
        <div className="error-actions">
          <button className="error-button primary" onClick={() => navigate("/")}>
            <i className="fas fa-home"></i> Go to Dashboard
          </button>
          <button className="error-button secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
