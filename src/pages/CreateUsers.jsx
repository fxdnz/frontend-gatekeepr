"use client";

import { useEffect, useState } from "react";
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
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "personnel",
    password: "",
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

      // Sort by ID in descending order (latest first)
      const sortedUsers = response.data.sort((a, b) => b.id - a.id);
      setUsers(sortedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchError = async (err) => {
    if (err.response?.status === 401) {
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
    } else if (err.response) {
      setError(err.response.data?.detail || "An unexpected error occurred.");
    } else if (err.request) {
      setError("No response from server. Please check your network.");
    } else {
      setError("Error: " + err.message);
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

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.first_name &&
        user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
      (user.role && user.role.toLowerCase().includes(searchLower))
    );
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleEditUser = (user) => {
    setIsEditMode(true);
    setCurrentUserId(user.id);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "personnel",
      password: "",
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${AUTH_ENDPOINTS.USERS}${currentUserId}/`, {
        headers: getAuthHeaders(access),
      });

      setUsers(users.filter((user) => user.id !== currentUserId));
      setShowDeleteModal(false);
      setShowFormModal(false);
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
    setFieldErrors({});
    setFormLoading(true);

    // Frontend validation
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!isEditMode && !formData.password.trim()) {
      errors.password = "Password is required for new users";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormLoading(false);
      return;
    }

    // Capitalize first letter of first name and last name
    const capitalizeFirstLetter = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const formattedData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    // Only include password if it's provided (for new users or when updating password)
    if (formData.password.trim()) {
      formattedData.password = formData.password;
    }

    try {
      let response;

      if (isEditMode) {
        response = await axios.put(
          `${AUTH_ENDPOINTS.USERS}${currentUserId}/`,
          formattedData,
          {
            headers: getAuthHeaders(access),
          }
        );

        setUsers(
          users.map((user) =>
            user.id === currentUserId ? response.data : user
          )
        );
        setFormSuccess("User updated successfully!");
      } else {
        response = await axios.post(AUTH_ENDPOINTS.USERS, formattedData, {
          headers: getAuthHeaders(access),
        });

        setUsers([...users, response.data]);
        setFormSuccess("User created successfully!");
      }

      setTimeout(() => {
        setShowFormModal(false);
        setFormSuccess("");
        setIsEditMode(false);
        setCurrentUserId(null);
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          role: "personnel",
          password: "",
        });
        setFieldErrors({});
      }, 2000);
    } catch (err) {
      console.error("Error saving user:", err);
      if (err.response) {
        const errorData = err.response.data;
        if (typeof errorData === "object") {
          const newFieldErrors = {};
          for (const field in errorData) {
            if (Array.isArray(errorData[field])) {
              newFieldErrors[field] = errorData[field][0];
            } else {
              newFieldErrors[field] = errorData[field];
            }
          }
          setFieldErrors(newFieldErrors);
        } else {
          setFormError(
            err.response.data?.detail ||
              "Failed to save user. Please try again."
          );
        }
      } else if (err.request) {
        setFormError("No response from server. Please check your network.");
      } else {
        setFormError("Error: " + err.message);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddUser = () => {
    setIsEditMode(false);
    setCurrentUserId(null);
    setFormData({
      name: "",
      email: "",
      role: "personnel",
      password: "",
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

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
  };

  if (!isAuthenticated) {
    return (
      <div className="createusers-login-required">
        <h2>Please login to view users</h2>
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
        <Header title="Users" />

        <div className="createusers-dashboard-main no-top-padding">
          <div className="createusers-container">
            <div className="createusers-header">
              <div className="createusers-title">
                <i className="fas fa-users-cog createusers-green-icon"></i>
                <h2>System Users</h2>
              </div>
              <div className="createusers-search-bar">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="createusers-search-input"
                />
                <i className="fas fa-search"></i>
              </div>
              <div className="createusers-actions">
                <button
                  className="createusers-register-button"
                  onClick={handleAddUser}
                >
                  <i className="fas fa-user-plus"></i> Create User
                </button>
              </div>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="createusers-error">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="createusers-no-data">
                {searchTerm
                  ? "No users found matching your search"
                  : "No users found"}
              </div>
            ) : (
              <>
                <table className="createusers-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="createusers-clickable-row"
                        onClick={() => handleEditUser(user)}
                      >
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          {user.role === "user_admin"
                            ? "User Administrator"
                            : user.role === "system_admin"
                            ? "System Administrator"
                            : "Personnel"}
                        </td>
                        <td>
                          <span
                            className={`createusers-status-badge ${
                              user.is_active ? "active" : "inactive"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td
                          className="createusers-action-buttons"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="createusers-update-dot-button"
                            onClick={() => handleEditUser(user)}
                            title="Update user"
                          >
                            <i className="fas fa-ellipsis-h"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="createusers-pagination-controls">
                  <div className="createusers-pagination-main">
                    <button
                      className="createusers-pagination-button"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="createusers-pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="createusers-pagination-button"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                  <span className="createusers-user-count">
                    {filteredUsers.length} users
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Registration/Edit Modal */}
      {showFormModal && (
        <div className="createusers-modal-overlay">
          <div className="createusers-modal-content">
            <div className="createusers-modal-header">
              <div className="createusers-modal-title">
                <h2>{isEditMode ? "Update User" : "Create User"}</h2>
              </div>
              <button
                className="createusers-close-button"
                onClick={() => setShowFormModal(false)}
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

            <form onSubmit={handleSubmit} className="createusers-modal-form">
              {/* First Name & Last Name - Same Row */}
              <div className="createusers-form-group createusers-form-group-full">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  className={fieldErrors.name ? "createusers-error-input" : ""}
                />
                {fieldErrors.name && (
                  <div className="createusers-field-error">
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              {/* Email - Full Width */}
              <div className="createusers-form-group createusers-form-group-full">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className={fieldErrors.email ? "createusers-error-input" : ""}
                  readOnly={isEditMode} // Make email read-only in edit mode
                />
                {fieldErrors.email && (
                  <div className="createusers-field-error">
                    {fieldErrors.email}
                  </div>
                )}
                {isEditMode && (
                  <div className="createusers-email-note">
                    Email cannot be changed
                  </div>
                )}
              </div>

              {/* Role - Full Width */}
              <div className="createusers-form-group createusers-form-group-full">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="personnel">Personnel</option>
                  <option value="user_admin">User Administrator</option>
                </select>
              </div>

              {/* Password - Full Width */}
              <div className="createusers-form-group createusers-form-group-full">
                <div className="createusers-password-header">
                  <label htmlFor="password">
                    Password {!isEditMode && "(required)"}
                  </label>
                  <button
                    type="button"
                    className="createusers-generate-password-button"
                    onClick={generateRandomPassword}
                  >
                    <i className="fas fa-magic"></i> Generate
                  </button>
                </div>
                <input
                  type="text"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={
                    isEditMode
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                  className={
                    fieldErrors.password ? "createusers-error-input" : ""
                  }
                />
                {fieldErrors.password && (
                  <div className="createusers-field-error">
                    {fieldErrors.password}
                  </div>
                )}
                {!isEditMode && (
                  <div className="createusers-password-hint">
                    Password must be at least 8 characters long
                  </div>
                )}
              </div>

              <div className="createusers-form-actions">
                <div className="createusers-form-buttons-row">
                  <button
                    type="submit"
                    className="createusers-update-modal-button"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <div className="createusers-spinner white">
                        <div className="createusers-bounce1"></div>
                        <div className="createusers-bounce2"></div>
                        <div className="createusers-bounce3"></div>
                      </div>
                    ) : isEditMode ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </button>

                  {/* Delete button only shown in edit mode */}
                  {isEditMode && (
                    <button
                      type="button"
                      className="createusers-delete-modal-button"
                      onClick={handleDeleteClick}
                      disabled={formLoading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="createusers-modal-overlay">
          <div className="createusers-modal-content createusers-delete-modal">
            <div className="createusers-modal-header">
              <div className="createusers-modal-title">
                <i className="fas fa-exclamation-triangle createusers-warning-icon"></i>
                <h2>Confirm Deletion</h2>
              </div>
              <button
                className="createusers-close-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="createusers-delete-message">
              <p>
                Are you sure you want to delete this user? This action cannot be
                undone.
              </p>
              <div className="createusers-delete-warning">
                <i className="fas fa-info-circle"></i>
                <span>
                  Deleting a user will remove all their access and permissions.
                </span>
              </div>
            </div>

            <div className="createusers-delete-actions">
              <button
                className="createusers-delete-confirm-button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <div className="createusers-spinner white">
                    <div className="createusers-bounce1"></div>
                    <div className="createusers-bounce2"></div>
                    <div className="createusers-bounce3"></div>
                  </div>
                ) : (
                  "Delete"
                )}
              </button>
              <button
                className="createusers-delete-cancel-button"
                onClick={() => setShowDeleteModal(false)}
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

export default CreateUsers;
