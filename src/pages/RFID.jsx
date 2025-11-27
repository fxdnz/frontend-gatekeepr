"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import { API_ENDPOINTS, AUTH_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./RFID.css";
import BouncingSpinner from "../components/BouncingSpinner";

const RFID = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [rfids, setRfids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    uid: "",
    is_temporary: "permanent",
    active: "active",
    issued_to: "",
    temporary_owner: "",
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRfidId, setCurrentRfidId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dropdown data states
  const [residents, setResidents] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Helper function to get owner display - MOVED BEFORE FILTER
  const getOwnerDisplay = (rfid) => {
    // Check if we have the nested details (from updated serializer)
    if (rfid.issued_to_details && rfid.issued_to_details.name) {
      return {
        name: rfid.issued_to_details.name,
        type: "Resident",
      };
    }
    // Check if we have the direct foreign key but need to find the resident
    else if (rfid.issued_to) {
      const resident = residents.find((res) => res.id === rfid.issued_to);
      if (resident) {
        return {
          name: resident.name || `${resident.first_name} ${resident.last_name}`,
          type: "Resident",
        };
      }
    }

    // Check for visitor with nested details
    if (rfid.temporary_owner_details && rfid.temporary_owner_details.name) {
      return {
        name: rfid.temporary_owner_details.name,
        type: "Visitor",
      };
    }
    // Check if we have the direct foreign key but need to find the visitor
    else if (rfid.temporary_owner) {
      const visitor = visitors.find((vis) => vis.id === rfid.temporary_owner);
      if (visitor) {
        return {
          name: visitor.name || `${visitor.first_name} ${visitor.last_name}`,
          type: "Visitor",
        };
      }
    }

    return null;
  };

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchRfids = async () => {
    if (!isAuthenticated) {
      setError("Please login to view RFIDs");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(API_ENDPOINTS.RFID, {
        headers: getAuthHeaders(access),
      });

      // Sort by ID in descending order (latest first)
      const sortedRfids = response.data.sort((a, b) => b.id - a.id);
      setRfids(sortedRfids);
    } catch (err) {
      console.error("Error fetching RFIDs:", err);
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResidents = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.RESIDENTS, {
        headers: getAuthHeaders(access),
      });
      setResidents(response.data);
    } catch (err) {
      console.error("Error fetching residents:", err);
    }
  };

  const fetchVisitors = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VISITORS, {
        headers: getAuthHeaders(access),
      });
      setVisitors(response.data);
    } catch (err) {
      console.error("Error fetching visitors:", err);
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

        const retryResponse = await axios.get(API_ENDPOINTS.RFID, {
          headers: getAuthHeaders(refreshResponse.data.access),
        });
        setRfids(retryResponse.data);
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
    fetchRfids();
    if (isAuthenticated && access) {
      fetchResidents();
      fetchVisitors();
    }

    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchRfids();
        fetchResidents();
        fetchVisitors();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  // Filter RFIDs based on search term
  const filteredRfids = rfids.filter((rfid) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const owner = getOwnerDisplay(rfid);

    return (
      (rfid.uid && rfid.uid.toLowerCase().includes(searchLower)) ||
      (rfid.is_temporary !== undefined &&
        (rfid.is_temporary ? "temporary" : "permanent").includes(
          searchLower
        )) ||
      (rfid.active !== undefined &&
        (rfid.active ? "active" : "inactive").includes(searchLower)) ||
      (owner && owner.name && owner.name.toLowerCase().includes(searchLower)) ||
      (owner && owner.type && owner.type.toLowerCase().includes(searchLower)) ||
      (rfid.issued_at &&
        new Date(rfid.issued_at)
          .toLocaleDateString()
          .toLowerCase()
          .includes(searchLower))
    );
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // If assigning to resident, clear temporary owner and vice versa
    if (name === "issued_to" && value) {
      setFormData({
        ...formData,
        [name]: value,
        temporary_owner: "",
      });
    } else if (name === "temporary_owner" && value) {
      setFormData({
        ...formData,
        [name]: value,
        issued_to: "",
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleEditRfid = (rfid) => {
    setIsEditMode(true);
    setCurrentRfidId(rfid.id);
    setFormData({
      uid: rfid.uid || "",
      is_temporary: rfid.is_temporary ? "temporary" : "permanent",
      active: rfid.active ? "active" : "inactive",
      issued_to: rfid.issued_to || "",
      temporary_owner: rfid.temporary_owner || "",
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteRfid = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_ENDPOINTS.RFID}${currentRfidId}/`, {
        headers: getAuthHeaders(access),
      });

      setRfids(rfids.filter((rfid) => rfid.id !== currentRfidId));
      setShowDeleteModal(false);
      setShowFormModal(false);
      setCurrentRfidId(null);
    } catch (err) {
      console.error("Error deleting RFID:", err);
      alert("Failed to delete RFID. Please try again.");
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

    if (!formData.uid.trim()) {
      errors.uid = "RFID UID is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormLoading(false);
      return;
    }

    const formattedData = {
      uid: formData.uid.trim(),
      is_temporary: formData.is_temporary === "temporary",
      active: formData.active === "active",
      issued_to: formData.issued_to || null,
      temporary_owner: formData.temporary_owner || null,
    };

    try {
      let response;

      if (isEditMode) {
        response = await axios.put(
          `${API_ENDPOINTS.RFID}${currentRfidId}/`,
          formattedData,
          {
            headers: getAuthHeaders(access),
          }
        );

        setRfids(
          rfids.map((rfid) =>
            rfid.id === currentRfidId ? response.data : rfid
          )
        );
        setFormSuccess("RFID updated successfully!");
      } else {
        response = await axios.post(API_ENDPOINTS.RFID, formattedData, {
          headers: getAuthHeaders(access),
        });

        setRfids([...rfids, response.data]);
        setFormSuccess("RFID created successfully!");
      }

      setTimeout(() => {
        setShowFormModal(false);
        setFormSuccess("");
        setIsEditMode(false);
        setCurrentRfidId(null);
        setFormData({
          uid: "",
          is_temporary: "permanent",
          active: "active",
          issued_to: "",
          temporary_owner: "",
        });
        setFieldErrors({});
      }, 2000);
    } catch (err) {
      console.error("Error saving RFID:", err);
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
              "Failed to save RFID. Please try again."
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

  const handleAddRfid = () => {
    setIsEditMode(false);
    setCurrentRfidId(null);
    setFormData({
      uid: "",
      is_temporary: "permanent",
      active: "active",
      issued_to: "",
      temporary_owner: "",
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  // Get available residents (not assigned to any RFID)
  const getAvailableResidents = () => {
    const assignedResidentIds = new Set(
      rfids
        .filter((rfid) => rfid.issued_to && rfid.id !== currentRfidId)
        .map((rfid) => rfid.issued_to)
    );

    return residents.filter(
      (resident) => !assignedResidentIds.has(resident.id)
    );
  };

  // Get available visitors (not assigned to any RFID)
  const getAvailableVisitors = () => {
    const assignedVisitorIds = new Set(
      rfids
        .filter((rfid) => rfid.temporary_owner && rfid.id !== currentRfidId)
        .map((rfid) => rfid.temporary_owner)
    );

    return visitors.filter((visitor) => !assignedVisitorIds.has(visitor.id));
  };

  // Get current resident/visitor for display in dropdowns
  const getCurrentResident = () => {
    if (!isEditMode || !currentRfidId) return null;
    const currentRfid = rfids.find((rfid) => rfid.id === currentRfidId);
    if (!currentRfid) return null;

    return residents.find((resident) => resident.id === currentRfid.issued_to);
  };

  const getCurrentVisitor = () => {
    if (!isEditMode || !currentRfidId) return null;
    const currentRfid = rfids.find((rfid) => rfid.id === currentRfidId);
    if (!currentRfid) return null;

    const visitorId = currentRfid.temporary_owner;
    if (!visitorId) return null;

    return visitors.find(
      (visitor) =>
        visitor.id === visitorId ||
        visitor.id?.toString() === visitorId?.toString()
    );
  };

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRfids = filteredRfids.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRfids.length / itemsPerPage);

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

  if (!isAuthenticated) {
    return (
      <div className="rfid-page-login-required">
        <h2>Please login to view RFIDs</h2>
        <a href="/login" className="rfid-page-login-button">
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <Header title="RFID Management" />

        <div className="dashboard-main no-top-padding">
          <div className="rfid-page-container">
            <div className="rfid-page-header">
              <div className="rfid-page-title">
                <i className="fas fa-microchip rfid-page-green-icon"></i>
                <h2>RFID Tags</h2>
              </div>
              <div className="rfid-page-search-bar">
                <input
                  type="text"
                  placeholder="Search RFIDs..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="rfid-page-search-input"
                />
                <i className="fas fa-search"></i>
              </div>
              <div className="rfid-page-actions">
                <button
                  className="rfid-page-add-button"
                  onClick={handleAddRfid}
                >
                  <i className="fas fa-plus"></i> Add RFID
                </button>
              </div>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="rfid-page-error">{error}</div>
            ) : (
              <>
                <table className="rfid-page-table">
                  <thead>
                    <tr>
                      <th>UID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Issued To</th>
                      <th>Issued At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRfids.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="rfid-page-no-data">
                          {searchTerm
                            ? "No RFIDs found matching your search"
                            : "No RFIDs found"}
                        </td>
                      </tr>
                    ) : (
                      currentRfids.map((rfid) => {
                        const owner = getOwnerDisplay(rfid);
                        return (
                          <tr
                            key={rfid.id}
                            className="rfid-page-clickable-row"
                            onClick={() => handleEditRfid(rfid)}
                          >
                            <td>{rfid.uid}</td>
                            <td>
                              <span
                                className={`rfid-page-type-badge ${
                                  rfid.is_temporary ? "temporary" : "permanent"
                                }`}
                              >
                                {rfid.is_temporary ? "Temporary" : "Permanent"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`rfid-page-status-badge ${
                                  rfid.active ? "active" : "inactive"
                                }`}
                              >
                                {rfid.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              {owner ? (
                                <div className="rfid-page-owner-display">
                                  <div className="rfid-page-owner-name">
                                    {owner.name}
                                  </div>
                                  <div className="rfid-page-owner-type">
                                    {owner.type}
                                  </div>
                                </div>
                              ) : (
                                "Unassigned"
                              )}
                            </td>
                            <td>
                              {rfid.issued_at
                                ? new Date(rfid.issued_at).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td
                              className="rfid-page-action-buttons"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="rfid-page-update-dot-button"
                                onClick={() => handleEditRfid(rfid)}
                                title="Update RFID"
                              >
                                <i className="fas fa-ellipsis-h"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {filteredRfids.length > itemsPerPage && (
                  <div className="rfid-page-pagination-controls">
                    <div className="rfid-page-pagination-main">
                      <button
                        className="rfid-page-pagination-button"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <span className="rfid-page-pagination-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        className="rfid-page-pagination-button"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                    <span className="rfid-page-item-count">
                      {filteredRfids.length} RFIDs
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Registration/Edit Modal */}
      {showFormModal && (
        <div className="rfid-page-modal-overlay">
          <div className="rfid-page-modal-content">
            <div className="rfid-page-modal-header">
              <div className="rfid-page-modal-title">
                <h2>{isEditMode ? "Update RFID" : "Add RFID Tag"}</h2>
              </div>
              <button
                className="rfid-page-close-button"
                onClick={() => setShowFormModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {formError && (
              <div className="rfid-page-form-error">{formError}</div>
            )}
            {formSuccess && (
              <div className="rfid-page-form-success">{formSuccess}</div>
            )}

            <form onSubmit={handleSubmit} className="rfid-page-modal-form">
              {/* UID - Full Width */}
              <div className="rfid-page-form-group rfid-page-form-group-full">
                <label htmlFor="uid">RFID UID</label>
                <input
                  type="text"
                  id="uid"
                  name="uid"
                  value={formData.uid}
                  onChange={handleInputChange}
                  placeholder="Enter RFID UID"
                  className={fieldErrors.uid ? "rfid-page-error-input" : ""}
                />
                {fieldErrors.uid && (
                  <div className="rfid-page-field-error">{fieldErrors.uid}</div>
                )}
              </div>

              {/* Type and Status - Same Row */}
              <div className="rfid-page-form-row">
                <div className="rfid-page-form-group">
                  <label htmlFor="is_temporary">RFID Type</label>
                  <select
                    id="is_temporary"
                    name="is_temporary"
                    value={formData.is_temporary}
                    onChange={handleInputChange}
                  >
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>

                <div className="rfid-page-form-group">
                  <label htmlFor="active">Status</label>
                  <select
                    id="active"
                    name="active"
                    value={formData.active}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Issued To and Temporary Owner - Same Row */}
              <div className="rfid-page-form-row">
                <div className="rfid-page-form-group">
                  <label htmlFor="issued_to">Assign to Resident</label>
                  <select
                    id="issued_to"
                    name="issued_to"
                    value={formData.issued_to}
                    onChange={handleInputChange}
                  >
                    <option value="">No Resident</option>
                    {/* Show current resident if editing */}
                    {isEditMode && getCurrentResident() && (
                      <option value={getCurrentResident().id}>
                        {getCurrentResident().name} - Current
                      </option>
                    )}
                    {/* Show available residents */}
                    {getAvailableResidents().map((resident) => {
                      const isCurrent =
                        isEditMode &&
                        getCurrentResident() &&
                        resident.id === getCurrentResident().id;
                      if (isCurrent) return null;

                      return (
                        <option key={resident.id} value={resident.id}>
                          {resident.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="rfid-page-form-group">
                  <label htmlFor="temporary_owner">Assign to Visitor</label>
                  <select
                    id="temporary_owner"
                    name="temporary_owner"
                    value={formData.temporary_owner}
                    onChange={handleInputChange}
                  >
                    <option value="">No Visitor</option>
                    {/* Show current visitor if editing */}
                    {isEditMode && getCurrentVisitor() && (
                      <option value={getCurrentVisitor().id}>
                        {getCurrentVisitor().name ||
                          `${getCurrentVisitor().first_name} ${
                            getCurrentVisitor().last_name
                          }`}{" "}
                        - Current
                      </option>
                    )}
                    {/* Show available visitors */}
                    {getAvailableVisitors().map((visitor) => {
                      const isCurrent =
                        isEditMode &&
                        getCurrentVisitor() &&
                        visitor.id === getCurrentVisitor().id;
                      if (isCurrent) return null;

                      return (
                        <option key={visitor.id} value={visitor.id}>
                          {visitor.name ||
                            `${visitor.first_name} ${visitor.last_name}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="rfid-page-form-actions">
                <div className="rfid-page-form-buttons-row">
                  <button
                    type="submit"
                    className="rfid-page-update-modal-button"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <div className="spinner white">
                        <div className="bounce1"></div>
                        <div className="bounce2"></div>
                        <div className="bounce3"></div>
                      </div>
                    ) : isEditMode ? (
                      "Update"
                    ) : (
                      "Add RFID"
                    )}
                  </button>

                  {/* Delete button only shown in edit mode */}
                  {isEditMode && (
                    <button
                      type="button"
                      className="rfid-page-delete-modal-button"
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
        <div className="rfid-page-modal-overlay">
          <div className="rfid-page-modal-content rfid-page-delete-modal">
            <div className="rfid-page-modal-header">
              <div className="rfid-page-modal-title">
                <i className="fas fa-exclamation-triangle rfid-page-warning-icon"></i>
                <h2>Confirm Deletion</h2>
              </div>
              <button
                className="rfid-page-close-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="rfid-page-delete-message">
              <p>
                Are you sure you want to delete this RFID tag? This action
                cannot be undone.
              </p>
              <div className="rfid-page-delete-warning">
                <i className="fas fa-info-circle"></i>
                <span>
                  Deleting an RFID tag will remove it from the system. If it's
                  assigned to a user, they will lose access until a new RFID is
                  assigned.
                </span>
              </div>
            </div>

            <div className="rfid-page-delete-actions">
              <button
                className="rfid-page-delete-confirm-button"
                onClick={handleDeleteRfid}
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
                className="rfid-page-delete-cancel-button"
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

export default RFID;
