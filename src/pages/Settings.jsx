"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { load_user, logout } from "../actions/auth";
import { API_ENDPOINTS, AUTH_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Settings.css";
import BouncingSpinner from "../components/BouncingSpinner";

const Settings = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchUserData = async () => {
    if (!isAuthenticated) {
      setError("Please login to view settings");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(API_ENDPOINTS.USER_PROFILE, {
        headers: getAuthHeaders(access),
      });
      setUserData(response.data);
      setNameValue(response.data.name || "");
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();

    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchUserData();
      }
    }, 30000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  const formatRole = (role) => {
    const roleMap = {
      system_admin: "System Administrator",
      user_admin: "User Administrator",
      personnel: "Personnel",
    };
    return roleMap[role] || role;
  };

  const handleResetPassword = async () => {
    if (!userData?.email) {
      setResetError("No email found for this account");
      return;
    }

    setResetLoading(true);
    setResetError("");
    setResetSuccess("");

    try {
      await axios.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
        email: userData.email,
      });

      setResetSuccess("Password reset email sent! Please check your inbox.");
    } catch (err) {
      console.error("Error resetting password:", err);
      setResetError(
        err.response?.data?.detail || "Failed to send reset password email"
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleNameEdit = () => {
    setEditName(true);
    setNameError("");
    setNameSuccess("");
  };

  const handleNameCancel = () => {
    setEditName(false);
    setNameValue(userData.name || "");
    setNameError("");
    setNameSuccess("");
  };

  const handleNameSave = async () => {
    if (!nameValue.trim()) {
      setNameError("Name cannot be empty");
      return;
    }

    setNameLoading(true);
    setNameError("");
    setNameSuccess("");

    try {
      const response = await axios.patch(
        API_ENDPOINTS.USER_PROFILE,
        { name: nameValue.trim() },
        { headers: getAuthHeaders(access) }
      );

      setUserData(response.data);
      setNameSuccess("Name updated successfully!");
      setEditName(false);

      // Refresh user data in auth state
      dispatch(load_user());
    } catch (err) {
      console.error("Error updating name:", err);
      setNameError(
        err.response?.data?.name?.[0] ||
          err.response?.data?.detail ||
          "Failed to update name"
      );
    } finally {
      setNameLoading(false);
    }
  };

  const handleNameChange = (e) => {
    setNameValue(e.target.value);
    if (nameError) setNameError("");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${month}-${day}-${year}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view settings</h2>
        <a href="/login" className="login-button">
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <Header title="Settings" />

        <div className="dashboard-main no-top-padding">
          <div className="settings-container">
            <div className="settings-header">
              <div className="settings-title">
                <i className="fas fa-cog green-icon"></i>
                <h2>Account Settings</h2>
              </div>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : !userData ? (
              <div className="no-data">No user data found</div>
            ) : (
              <div className="settings-content">
                <div className="settings-card">
                  <div className="settings-section">
                    <h3 className="settings-section-title">
                      <i className="fas fa-user"></i>
                      Personal Information
                    </h3>

                    <div className="settings-form">
                      <div className="settings-form-row">
                        <div className="settings-form-group">
                          <label htmlFor="name">Full Name</label>
                          <div className="name-input-container">
                            <input
                              type="text"
                              id="name"
                              value={nameValue}
                              onChange={handleNameChange}
                              readOnly={!editName}
                              className={
                                editName ? "editable-input" : "readonly-input"
                              }
                              placeholder="Enter your full name"
                            />
                            {!editName ? (
                              <button
                                className="name-edit-button"
                                onClick={handleNameEdit}
                                title="Edit name"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            ) : (
                              <div className="name-edit-actions">
                                <button
                                  className="name-save-button"
                                  onClick={handleNameSave}
                                  disabled={nameLoading}
                                  title="Save name"
                                >
                                  {nameLoading ? (
                                    <div className="spinner white">
                                      <div className="bounce1"></div>
                                      <div className="bounce2"></div>
                                      <div className="bounce3"></div>
                                    </div>
                                  ) : (
                                    <i className="fas fa-check"></i>
                                  )}
                                </button>
                                <button
                                  className="name-cancel-button"
                                  onClick={handleNameCancel}
                                  disabled={nameLoading}
                                  title="Cancel edit"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            )}
                          </div>
                          {nameError && (
                            <div className="field-error">{nameError}</div>
                          )}
                          {nameSuccess && (
                            <div className="field-success">{nameSuccess}</div>
                          )}
                        </div>

                        <div className="settings-form-group">
                          <label htmlFor="email">Email Address</label>
                          <input
                            type="email"
                            id="email"
                            value={userData.email || "N/A"}
                            readOnly
                            className="readonly-input"
                          />
                        </div>
                      </div>

                      <div className="settings-form-row">
                        <div className="settings-form-group">
                          <label htmlFor="role">Role</label>
                          <input
                            type="text"
                            id="role"
                            value={formatRole(userData.role) || "N/A"}
                            readOnly
                            className="readonly-input"
                          />
                        </div>

                        <div className="settings-form-group">
                          <label htmlFor="dateJoined">Date Joined</label>
                          <input
                            type="text"
                            id="dateJoined"
                            value={
                              userData.date_joined
                                ? formatDate(userData.date_joined)
                                : "N/A"
                            }
                            readOnly
                            className="readonly-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h3 className="settings-section-title">
                      <i className="fas fa-shield-alt"></i>
                      Security
                    </h3>

                    <div className="security-actions">
                      {resetError && (
                        <div className="settings-form-error">{resetError}</div>
                      )}
                      {resetSuccess && (
                        <div className="settings-form-success">
                          {resetSuccess}
                        </div>
                      )}

                      <div className="settings-form-buttons-row">
                        <button
                          className="settings-reset-button"
                          onClick={handleResetPassword}
                          disabled={resetLoading}
                        >
                          {resetLoading ? (
                            <div className="spinner white">
                              <div className="bounce1"></div>
                              <div className="bounce2"></div>
                              <div className="bounce3"></div>
                            </div>
                          ) : (
                            <>
                              <i className="fas fa-key"></i>
                              Reset Password
                            </>
                          )}
                        </button>

                        <button
                          className="settings-logout-button"
                          onClick={handleLogout}
                        >
                          <i className="fas fa-sign-out-alt"></i>
                          Log Out
                        </button>
                      </div>

                      {resetSuccess && (
                        <div className="password-reset-info">
                          <i className="fas fa-info-circle"></i>
                          <span>
                            We have sent an email with password reset
                            instructions to your email address. Please check
                            your inbox and follow the link to reset your
                            password.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
