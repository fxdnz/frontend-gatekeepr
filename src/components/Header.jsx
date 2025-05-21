"use client";

import { useState, useEffect } from "react";
import { connect } from "react-redux";
import "./Header.css";

const Header = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);

  // Update the time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update the useEffect for dark mode to load from localStorage
  useEffect(() => {
    // Load dark mode preference from localStorage on initial load
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);

    // Apply dark mode class to body when darkMode state changes
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Format the date in a readable format
  const formatDate = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Format the time in HH:MM:SS format
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Update the toggleDarkMode function to save to localStorage
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
  };

  return (
    <div className="header">
      <div className="header-title">Dashboard</div>

      <div className="header-datetime">
        <div className="date">{formatDate(currentTime)}</div>
        <div className="time">{formatTime(currentTime)}</div>
      </div>

      <div className="header-actions">
        {/* Dark Mode Toggle */}
        <div
          className={`theme-toggle ${darkMode ? "active" : ""}`}
          onClick={toggleDarkMode}
          title="Toggle dark mode"
        >
          <i className={`fas ${darkMode ? "fa-sun" : "fa-moon"}`}></i>
        </div>

        {/* User Profile */}
        <div className="user-profile">
          <div className="avatar">
            <i className="fas fa-user user-icon"></i>
          </div>
          <div className="user-info">
            <div className="user-name">{user ? user.name : "Guest"}</div>
            <div className="user-role">{user ? "Admin" : "Not logged in"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  user: state.auth.user,
});

export default connect(mapStateToProps)(Header);
