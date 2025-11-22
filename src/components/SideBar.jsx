"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { connect } from "react-redux";
import { logout, checkAuthenticated, load_user } from "../actions/auth";
import "./SideBar.css";
import { useState, useEffect } from "react";

const Sidebar = ({
  logout,
  isAuthenticated,
  checkAuthenticated,
  load_user,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check dark mode
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

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      await checkAuthenticated();
      await load_user();
      setCheckingAuth(false);
    };

    checkAuth();
  }, [checkAuthenticated, load_user]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!checkingAuth && !isAuthenticated && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [checkingAuth, isAuthenticated, navigate, location.pathname]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img
          src={
            darkMode ? "/gatekeepr-logo-white.png" : "/gatekeepr-logo-black.png"
          }
          alt="gatekeepr"
          className="sidebar-logo"
        />
      </div>

      <div className="sidebar-menu">
        <Link
          to="/"
          className={`sidebar-item ${
            location.pathname === "/" ? "active" : ""
          }`}
        >
          <div className="sidebar-icon">
            <i className="fas fa-chart-pie"></i>
          </div>
          <span>Dashboard</span>
        </Link>

        <Link
          to="/logs"
          className={`sidebar-item ${
            location.pathname === "/logs" ? "active" : ""
          }`}
        >
          <div className="sidebar-icon">
            <i className="fas fa-list"></i>
          </div>
          <span>Logs</span>
        </Link>

        <Link
          to="/residents"
          className={`sidebar-item ${
            location.pathname === "/residents" ? "active" : ""
          }`}
        >
          <div className="sidebar-icon">
            <i className="fas fa-users"></i>
          </div>
          <span>Residents</span>
        </Link>

        <Link
          to="/reports"
          className={`sidebar-item ${
            location.pathname === "/reports" ? "active" : ""
          }`}
        >
          <div className="sidebar-icon">
            <i className="fas fa-file-pdf"></i>
          </div>
          <span>Reports</span>
        </Link>
        <Link
          to="/parking"
          className={`sidebar-item ${
            location.pathname === "/parking" ? "active" : ""
          }`}
        >
          <div className="sidebar-icon">
            <i className="fas fa-car"></i>
          </div>
          <span>Parking</span>
        </Link>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-item" onClick={logout}>
          <div className="sidebar-icon">
            <i className="fas fa-sign-out-alt"></i>
          </div>
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, {
  logout,
  checkAuthenticated,
  load_user,
})(Sidebar);
