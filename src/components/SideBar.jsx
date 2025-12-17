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
  user,
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

  // Helper function to check if user can access a route based on role
  const canAccess = (allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  // Permission checks for cleaner code
  const isSystemAdmin = user?.role === "system_admin";
  const isUserAdmin = user?.role === "user_admin";
  const isPersonnel = user?.role === "personnel";

  return (
    <div className="sidebar">
      {/* Make the sidebar-header clickable and redirect to home */}
      <Link to="/" className="sidebar-header">
        <img
          src={
            darkMode ? "/gatekeepr-logo-white.png" : "/gatekeepr-logo-black.png"
          }
          alt="gatekeepr"
          className="sidebar-logo"
        />
      </Link>

      <div className="sidebar-menu">
        {/* Dashboard - accessible to all roles */}
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

        {/* Logs - accessible to all roles */}
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

        {/* Residents - only for system_admin and user_admin */}
        {canAccess(["system_admin", "user_admin"]) && (
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
        )}

        {/* Visitors - accessible to all roles */}
        <Link
          to="/visitors"
          className={`sidebar-item ${
            location.pathname === "/visitors" ? "active" : ""
          }`}
        >
          <div className="sidebar-icon">
            <i className="fas fa-user-friends"></i>
          </div>
          <span>Visitors</span>
        </Link>

        {/* Create Users - only for system_admin and user_admin */}
        {canAccess(["system_admin", "user_admin"]) && (
          <Link
            to="/create-users"
            className={`sidebar-item ${
              location.pathname === "/create-users" ? "active" : ""
            }`}
          >
            <div className="sidebar-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <span>Create Users</span>
          </Link>
        )}

        {/* RFID - only for system_admin and user_admin */}
        {canAccess(["system_admin", "user_admin"]) && (
          <Link
            to="/rfid"
            className={`sidebar-item ${
              location.pathname === "/rfid" ? "active" : ""
            }`}
          >
            <div className="sidebar-icon">
              <i className="fas fa-microchip"></i>
            </div>
            <span>RFID</span>
          </Link>
        )}

        {/* Reports - only for system_admin and user_admin */}
        {canAccess(["system_admin", "user_admin"]) && (
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
        )}

        {/* Parking - accessible to all roles */}
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

        {/* Settings - only for system_admin */}
        {canAccess(["system_admin"]) && (
          <Link
            to="/settings"
            className={`sidebar-item ${
              location.pathname === "/settings" ? "active" : ""
            }`}
          >
            <div className="sidebar-icon">
              <i className="fas fa-cog"></i>
            </div>
            <span>Settings</span>
          </Link>
        )}
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
  user: state.auth.user,
});

export default connect(mapStateToProps, {
  logout,
  checkAuthenticated,
  load_user,
})(Sidebar);
