"use client";

import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom";
import "./Header.css";

const Header = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);

  // Get current location for dynamic header title
  const location = useLocation();

  // Role mapping for proper formatting
  const roleMap = {
    system_admin: "System Administrator",
    user_admin: "User Administrator",
    personnel: "Personnel",
  };

  // Get formatted role
  const formattedRole = user
    ? roleMap[user.role] || "Unknown Role"
    : "Not logged in";

  // Page title mapping based on route
  const pageTitleMap = {
    "/": "Dashboard",
    "/logs": "Logs",
    "/residents": "Residents",
    "/visitors": "Visitors",
    "/create-users": "Create Users",
    "/rfid": "RFID",
    "/reports": "Reports",
    "/parking": "Parking",
    "/settings": "Settings",
  };

  // Get the current page title
  const currentTitle = pageTitleMap[location.pathname] || "Page Not Found";

  // Update the time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update the useEffect for dark mode to load from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);

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

  // Toggle dark mode and save preference to localStorage
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
  };

  return (
    <div className="header">
      <div className="header-title">{currentTitle}</div>

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
            <div className="user-role">{formattedRole}</div>
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
