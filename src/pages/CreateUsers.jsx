"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import { AUTH_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./CreateUsers.css";
import BouncingSpinner from "../components/BouncingSpinner";

const CreateUsers = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "personnel",
    password: "",
    is_active: true,
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const ROLE_DISPLAY_NAMES = {
    system_admin: "System Administrator",
    user_admin: "User Administrator",
    personnel: "Personnel",
  };

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchUsers = async () => {
    if (!isAuthenticated) {
      setError("Please login to view users");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(AUTH_ENDPOINTS.USERS, {
        headers: getAuthHeaders(access),
      });
      setUsers(response.data);
    } catch (err) {
      console.error("Error fetching users:", err);

      if (err.response) {
        if (err.response.status === 500) {
          setError(
            "Server error while fetching users. Please try again later."
          );
        } else if (err.response.status === 401) {
          try {
            const refreshResponse = await axios.post(AUTH_ENDPOINTS.REFRESH, {
              refresh: localStorage.getItem("refresh"),
            });

            localStorage.setItem("access", refreshResponse.data.access);
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: refreshResponse.data,
            });

            const retryResponse = await axios.get(AUTH_ENDPOINTS.USERS, {
              headers: getAuthHeaders(refreshResponse.data.access),
            });
            setUsers(retryResponse.data);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            dispatch({ type: "LOGIN_FAIL" });
            setError("Session expired. Please login again.");
          }
        } else {
          setError(
            err.response.data?.detail || "An unexpected error occurred."
          );
        }
      } else if (err.request) {
        setError("No response from server. Please check your network.");
      } else {
        setError("Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchUsers();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  const generateRandomPassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    const allChars = uppercase + lowercase + numbers + special;

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    const passwordArray = password.split("");
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordArray[i], passwordArray[j]] = [
        passwordArray[j],
        passwordArray[i],
      ];
    }

    const generatedPassword = passwordArray.join("");
    setFormData({
      ...formData,
      password: generatedPassword,
    });
    checkPasswordStrength(generatedPassword);
  };

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength("");
      return;
    }

    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const score = [
      hasLowerCase,
      hasUpperCase,
      hasNumbers,
      hasSpecialChars,
      isLongEnough,
    ].filter(Boolean).length;

    if (score <= 2) {
      setPasswordStrength("weak");
    } else if (score <= 4) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const handleAddUser = () => {
    setFormData({
      name: "",
      email: "",
      role: "personnel",
      password: "",
      is_active: true,
    });
    setEditingUserId(null);
    setFormError("");
    setFormSuccess("");
    setPasswordStrength("");
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEditClick = (userToEdit) => {
    setEditingUserId(userToEdit.id);
    setFormData({
      name: userToEdit.name || "",
      email: userToEdit.email || "",
      role: userToEdit.role || "personnel",
      password: "",
      is_active: userToEdit.is_active || true,
    });
    setFormError("");
    setFormSuccess("");
    setPasswordStrength("");
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleDeleteClick = (user) => {
    setCurrentUserId(user.id);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${AUTH_ENDPOINTS.USERS}${currentUserId}/`, {
        headers: getAuthHeaders(access),
      });

      setUsers(users.filter((user) => user.id !== currentUserId));
      setShowDeleteConfirmModal(false);
      setShowEditModal(false);
      setCurrentUserId(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        is_active: formData.is_active,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      let response;
      if (editingUserId) {
        response = await axios.put(
          `${AUTH_ENDPOINTS.USERS}${editingUserId}/`,
          payload,
          {
            headers: getAuthHeaders(access),
          }
        );
        setUsers(
          users.map((user) =>
            user.id === editingUserId ? response.data : user
          )
        );
        setFormSuccess("User updated successfully!");
      } else {
        const createPayload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        };
        if (!formData.password) {
          setFormError("Password is required for new users");
          setFormLoading(false);
          return;
        }
        response = await axios.post(AUTH_ENDPOINTS.USERS, createPayload, {
          headers: getAuthHeaders(access),
        });
        setUsers([...users, response.data]);
        setFormSuccess("User created successfully!");
      }

      setTimeout(() => {
        if (editingUserId) {
          setShowEditModal(false);
        } else {
          setShowModal(false);
        }
        setFormSuccess("");
        setFormData({
          name: "",
          email: "",
          role: "personnel",
          password: "",
          is_active: true,
        });
        setEditingUserId(null);
        setCurrentUserId(null);
      }, 1500);
    } catch (err) {
      console.error("Error submitting form:", err);
      setFormError(
        err.response?.data?.detail || "An error occurred. Please try again."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      name: "",
      email: "",
      role: "personnel",
      password: "",
      is_active: true,
    });
    setFormError("");
    setFormSuccess("");
    setPasswordStrength("");
    setShowPassword(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [users]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="createusers-login-required">
        <h2>Please login to create users</h2>
        <a href="/login" className="createusers-login-button">
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="createusers-dashboard-container">
      <Sidebar />
      <div className="createusers-dashboard-content">
        <Header title="Create Users" />

        <div className="createusers-dashboard-main">
          <div className="createusers-container">
            <div className="createusers-header">
              <div className="createusers-title">
                <i className="fas fa-users-cog createusers-icon"></i>
                <h2>System Users</h2>
              </div>
              <button
                className="createusers-add-button"
                onClick={handleAddUser}
              >
                <i className="fas fa-user-plus"></i> Create User
              </button>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="createusers-error">{error}</div>
            ) : users.length === 0 ? (
              <div className="createusers-no-data">No users found</div>
            ) : (
              <>
                <div className="createusers-table-wrapper">
                  <table className="createusers-users-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td>{user.name}</td>
                          <td>{ROLE_DISPLAY_NAMES[user.role] || user.role}</td>
                          <td>
                            <span
                              className={`createusers-status-badge ${
                                user.is_active ? "active" : "inactive"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {user.last_login ? (
                              <div className="createusers-last-login">
                                <div>
                                  {new Date(
                                    user.last_login
                                  ).toLocaleDateString()}
                                </div>
                                <div className="createusers-last-login-time">
                                  {new Date(user.last_login).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </div>
                              </div>
                            ) : (
                              "Never"
                            )}
                          </td>
                          <td className="createusers-actions-cell">
                            <button
                              className="createusers-edit-button"
                              onClick={() => handleEditClick(user)}
                              title="Edit user"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="createusers-pagination-controls">
                  <button
                    className="createusers-pagination-button"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  <span className="createusers-pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="createusers-pagination-button"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="createusers-modal-overlay">
          <div className="createusers-modal-content">
            <div className="createusers-modal-header">
              <div className="createusers-modal-title">
                <i className="fas fa-user-plus createusers-modal-icon"></i>
                <h2>Create New User</h2>
              </div>
              <button
                className="createusers-close-button"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {formError && (
              <div className="createusers-form-error">{formError}</div>
            )}
            {formSuccess && (
              <div className="createusers-form-success">{formSuccess}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="createusers-form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="createusers-form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="createusers-form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="personnel">Personnel</option>
                  <option value="user_admin">User Administrator</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>

              <div className="createusers-form-group">
                <div className="createusers-password-label-container">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="createusers-generate-button"
                    onClick={generateRandomPassword}
                    disabled={formLoading}
                    title="Generate random password"
                  >
                    <i className="fas fa-magic"></i> Generate
                  </button>
                </div>
                <div className="createusers-password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    className="createusers-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={formLoading}
                  >
                    {showPassword ? (
                      <i className="fas fa-eye"></i>
                    ) : (
                      <i className="fas fa-eye-slash"></i>
                    )}
                  </button>
                </div>
                {passwordStrength && (
                  <div
                    className={`createusers-password-strength ${passwordStrength}`}
                  >
                    <div className="createusers-strength-text">
                      Password strength:{" "}
                      {passwordStrength.charAt(0).toUpperCase() +
                        passwordStrength.slice(1)}
                    </div>
                    <div className="createusers-password-strength-meter">
                      <div></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="createusers-form-actions">
                <button
                  type="submit"
                  className="createusers-submit-button"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="spinner white">
                      <div className="bounce1"></div>
                      <div className="bounce2"></div>
                      <div className="bounce3"></div>
                    </div>
                  ) : (
                    "Create User"
                  )}
                </button>
                <button
                  type="button"
                  className="createusers-clear-button"
                  onClick={handleClear}
                  disabled={formLoading}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="createusers-modal-overlay">
          <div className="createusers-modal-content">
            <div className="createusers-modal-header">
              <div className="createusers-modal-title">
                <i className="fas fa-user-edit createusers-modal-icon"></i>
                <h2>Edit User</h2>
              </div>
              <button
                className="createusers-close-button"
                onClick={() => setShowEditModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {formError && (
              <div className="createusers-form-error">{formError}</div>
            )}
            {formSuccess && (
              <div className="createusers-form-success">{formSuccess}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="createusers-form-group">
                <label htmlFor="edit-name">Full Name</label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="createusers-form-group">
                <label htmlFor="edit-email">Email (Read-only)</label>
                <input
                  type="email"
                  id="edit-email"
                  name="email"
                  value={formData.email}
                  disabled
                  placeholder="john@example.com"
                />
              </div>

              <div className="createusers-form-group">
                <label htmlFor="edit-role">Role</label>
                <select
                  id="edit-role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="personnel">Personnel</option>
                  <option value="user_admin">User Administrator</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>

              <div className="createusers-form-group createusers-checkbox-group">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <label
                  htmlFor="edit-is-active"
                  className="createusers-checkbox-label"
                >
                  Active
                </label>
              </div>

              <div className="createusers-form-group">
                <div className="createusers-password-label-container">
                  <label htmlFor="edit-password">
                    Password (leave blank to keep current)
                  </label>
                  <button
                    type="button"
                    className="createusers-generate-button"
                    onClick={generateRandomPassword}
                    disabled={formLoading}
                    title="Generate random password"
                  >
                    <i className="fas fa-magic"></i> Generate
                  </button>
                </div>
                <div className="createusers-password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="edit-password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    className="createusers-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={formLoading}
                  >
                    {showPassword ? (
                      <i className="fas fa-eye"></i>
                    ) : (
                      <i className="fas fa-eye-slash"></i>
                    )}
                  </button>
                </div>
                {passwordStrength && (
                  <div
                    className={`createusers-password-strength ${passwordStrength}`}
                  >
                    <div className="createusers-strength-text">
                      Password strength:{" "}
                      {passwordStrength.charAt(0).toUpperCase() +
                        passwordStrength.slice(1)}
                    </div>
                    <div className="createusers-password-strength-meter">
                      <div></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="createusers-form-actions">
                <button
                  type="submit"
                  className="createusers-submit-button"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="spinner white">
                      <div className="bounce1"></div>
                      <div className="bounce2"></div>
                      <div className="bounce3"></div>
                    </div>
                  ) : (
                    "Update User"
                  )}
                </button>
                <button
                  type="button"
                  className="createusers-delete-button-modal"
                  onClick={() => handleDeleteClick({ id: editingUserId })}
                  disabled={formLoading}
                >
                  <i className="fas fa-trash"></i> Delete User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && (
        <div className="createusers-modal-overlay">
          <div className="createusers-modal-content createusers-delete-modal">
            <div className="createusers-modal-header">
              <div className="createusers-modal-title">
                <i className="fas fa-exclamation-triangle createusers-warning-icon"></i>
                <h2>Confirm Deletion</h2>
              </div>
              <button
                className="createusers-close-button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleteLoading}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="createusers-delete-message">
              Are you sure you want to delete this user? This action cannot be
              undone.
            </div>

            <div className="createusers-delete-actions">
              <button
                className="createusers-delete-confirm-button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <div className="spinner white">
                    <div className="bounce1"></div>
                    <div className="bounce2"></div>
                    <div className="bounce3"></div>
                  </div>
                ) : (
                  "Delete"
                )}
              </button>
              <button
                className="createusers-delete-cancel-button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  access: state.auth.access,
});

import { connect } from "react-redux";
export default connect(mapStateToProps)(CreateUsers);
