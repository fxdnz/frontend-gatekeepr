"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import { API_ENDPOINTS, AUTH_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Residents.css";
import BouncingSpinner from "../components/BouncingSpinner";

const Residents = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    rfid_uid: "",
    plate_number: "",
    unit_number: "",
    phone: "",
    parking_slot: "",
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentResidentId, setCurrentResidentId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dropdown data states
  const [availableRfids, setAvailableRfids] = useState([]);
  const [availableParkingSlots, setAvailableParkingSlots] = useState([]);
  const [allRfids, setAllRfids] = useState([]);
  const [allParkingSlots, setAllParkingSlots] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchResidents = async () => {
    if (!isAuthenticated) {
      setError("Please login to view residents");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(API_ENDPOINTS.RESIDENTS, {
        headers: getAuthHeaders(access),
      });

      // Sort by ID in descending order (latest first)
      const sortedResidents = response.data.sort((a, b) => b.id - a.id);
      setResidents(sortedResidents);
    } catch (err) {
      console.error("Error fetching residents:", err);
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

        const retryResponse = await axios.get(API_ENDPOINTS.RESIDENTS, {
          headers: getAuthHeaders(refreshResponse.data.access),
        });
        setResidents(retryResponse.data);
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

  const fetchAllRFIDs = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.RFID, {
        headers: getAuthHeaders(access),
      });
      setAllRfids(response.data);

      const available = response.data.filter(
        (rfid) => !rfid.issued_to && !rfid.temporary_owner && rfid.active
      );
      setAvailableRfids(available);
    } catch (err) {
      console.error("Error fetching RFIDs:", err);
    }
  };

  const fetchAllParkingSlots = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PARKING, {
        headers: getAuthHeaders(access),
      });
      setAllParkingSlots(response.data);

      const available = response.data.filter(
        (slot) =>
          !slot.issued_to &&
          !slot.temporary_owner &&
          slot.status === "AVAILABLE"
      );
      setAvailableParkingSlots(available);
    } catch (err) {
      console.error("Error fetching parking slots:", err);
    }
  };

  useEffect(() => {
    fetchResidents();
    if (isAuthenticated && access) {
      fetchAllRFIDs();
      fetchAllParkingSlots();
    }

    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchResidents();
        fetchAllRFIDs();
        fetchAllParkingSlots();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  // Filter residents based on search term
  const filteredResidents = residents.filter((resident) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (resident.rfid_uid_display &&
        resident.rfid_uid_display.toLowerCase().includes(searchLower)) ||
      (resident.plate_number &&
        resident.plate_number.toLowerCase().includes(searchLower)) ||
      (resident.name && resident.name.toLowerCase().includes(searchLower)) ||
      (resident.phone && resident.phone.includes(searchTerm)) ||
      (resident.unit_number &&
        resident.unit_number.toLowerCase().includes(searchLower)) ||
      (resident.parking_slot_display &&
        resident.parking_slot_display.toLowerCase().includes(searchLower)) ||
      (resident.parking_slot_type &&
        resident.parking_slot_type.toLowerCase().includes(searchLower))
    );
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "phone") {
      const numbersOnly = value.replace(/[^\d]/g, "");
      setFormData({
        ...formData,
        [name]: numbersOnly,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleEditResident = (resident) => {
    setIsEditMode(true);
    setCurrentResidentId(resident.id);
    setFormData({
      first_name: resident.first_name,
      last_name: resident.last_name,
      rfid_uid: resident.rfid_uid,
      plate_number: resident.plate_number,
      unit_number: resident.unit_number,
      phone: resident.phone,
      parking_slot: resident.parking_slot,
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteResident = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_ENDPOINTS.RESIDENTS}${currentResidentId}/`, {
        headers: getAuthHeaders(access),
      });

      setResidents(
        residents.filter((resident) => resident.id !== currentResidentId)
      );
      setShowDeleteModal(false);
      setShowFormModal(false);
      setCurrentResidentId(null);

      // Refresh dropdown data
      fetchAllRFIDs();
      fetchAllParkingSlots();
    } catch (err) {
      console.error("Error deleting resident:", err);
      alert("Failed to delete resident. Please try again.");
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

    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (formData.phone.length < 10) {
      errors.phone = "Phone number must be at least 10 digits";
    }

    if (!formData.unit_number.trim()) {
      errors.unit_number = "Unit number is required";
    }

    if (!formData.plate_number.trim()) {
      errors.plate_number = "Plate number is required";
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
      ...formData,
      first_name: capitalizeFirstLetter(formData.first_name.trim()),
      last_name: capitalizeFirstLetter(formData.last_name.trim()),
      rfid_uid: formData.rfid_uid || null,
      parking_slot: formData.parking_slot || null,
    };

    try {
      let response;

      if (isEditMode) {
        response = await axios.put(
          `${API_ENDPOINTS.RESIDENTS}${currentResidentId}/`,
          formattedData,
          {
            headers: getAuthHeaders(access),
          }
        );

        setResidents(
          residents.map((resident) =>
            resident.id === currentResidentId ? response.data : resident
          )
        );
        setFormSuccess("Resident updated successfully!");
      } else {
        response = await axios.post(API_ENDPOINTS.RESIDENTS, formattedData, {
          headers: getAuthHeaders(access),
        });

        setResidents([...residents, response.data]);
        setFormSuccess("Resident registered successfully!");
      }

      // Refresh dropdown data after successful submission
      fetchAllRFIDs();
      fetchAllParkingSlots();

      setTimeout(() => {
        setShowFormModal(false);
        setFormSuccess("");
        setIsEditMode(false);
        setCurrentResidentId(null);
        setFormData({
          first_name: "",
          last_name: "",
          rfid_uid: "",
          plate_number: "",
          unit_number: "",
          phone: "",
          parking_slot: "",
        });
        setFieldErrors({});
      }, 2000);
    } catch (err) {
      console.error("Error saving resident:", err);
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
              "Failed to save resident. Please try again."
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

  const handleAddResident = () => {
    setIsEditMode(false);
    setCurrentResidentId(null);
    setFormData({
      first_name: "",
      last_name: "",
      rfid_uid: "",
      plate_number: "",
      unit_number: "",
      phone: "",
      parking_slot: "",
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  // Get current resident's RFID and parking slot for display in dropdowns
  const getCurrentResidentRfid = () => {
    if (!isEditMode || !currentResidentId) return null;
    return allRfids.find((rfid) => rfid.id === formData.rfid_uid);
  };

  const getCurrentResidentParkingSlot = () => {
    if (!isEditMode || !currentResidentId) return null;
    return allParkingSlots.find((slot) => slot.id === formData.parking_slot);
  };

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResidents = filteredResidents.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredResidents.length / itemsPerPage);

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
      <div className="login-required">
        <h2>Please login to view residents</h2>
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
        <Header title="Residents" />

        <div className="dashboard-main no-top-padding">
          <div className="residents-container">
            <div className="residents-header">
              <div className="residents-title">
                <i className="fas fa-users green-icon"></i>
                <h2>Residents</h2>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search residents..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                <i className="fas fa-search"></i>
              </div>
              <div className="residents-actions">
                <button className="register-button" onClick={handleAddResident}>
                  <i className="fas fa-user-plus"></i> Register Resident
                </button>
              </div>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : filteredResidents.length === 0 ? (
              <div className="no-data">
                {searchTerm
                  ? "No residents found matching your search"
                  : "No residents found"}
              </div>
            ) : (
              <>
                <table className="residents-table">
                  <thead>
                    <tr>
                      <th>RFID UID</th>
                      <th>Plate Number</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Unit Number</th>
                      <th>Parking Slot</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResidents.map((resident) => (
                      <tr
                        key={resident.id}
                        className="clickable-row"
                        onClick={() => handleEditResident(resident)}
                      >
                        <td>{resident.rfid_uid_display}</td>
                        <td>{resident.plate_number}</td>
                        <td>{resident.name}</td>
                        <td>{resident.phone}</td>
                        <td>{resident.unit_number}</td>
                        <td>
                          {resident.parking_slot_display !== "N/A"
                            ? `${resident.parking_slot_display} - ${resident.parking_slot_type}`
                            : "N/A"}
                        </td>
                        <td
                          className="action-buttons"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="update-dot-button"
                            onClick={() => handleEditResident(resident)}
                            title="Update resident"
                          >
                            <i className="fas fa-ellipsis-h"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pagination-controls">
                  <div className="pagination-main">
                    <button
                      className="pagination-button"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="pagination-button"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                  <span className="resident-count">
                    {filteredResidents.length} residents
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Registration/Edit Modal */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <h2>
                  {isEditMode ? "Update Resident" : "Resident Registration"}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => setShowFormModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              {/* First Name & Last Name - Same Row */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className={fieldErrors.first_name ? "error-input" : ""}
                  />
                  {fieldErrors.first_name && (
                    <div className="field-error">{fieldErrors.first_name}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="last_name">Last name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className={fieldErrors.last_name ? "error-input" : ""}
                  />
                  {fieldErrors.last_name && (
                    <div className="field-error">{fieldErrors.last_name}</div>
                  )}
                </div>
              </div>

              {/* Phone & Unit Number - Same Row */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="09123456789"
                    maxLength="11"
                    className={fieldErrors.phone ? "error-input" : ""}
                  />
                  {fieldErrors.phone && (
                    <div className="field-error">{fieldErrors.phone}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="unit_number">Unit number</label>
                  <input
                    type="text"
                    id="unit_number"
                    name="unit_number"
                    value={formData.unit_number}
                    onChange={handleInputChange}
                    placeholder="APT - 801"
                    className={fieldErrors.unit_number ? "error-input" : ""}
                  />
                  {fieldErrors.unit_number && (
                    <div className="field-error">{fieldErrors.unit_number}</div>
                  )}
                </div>
              </div>

              {/* RFID & Parking Slot - Same Row */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rfid_uid">RFID UID</label>
                  <select
                    id="rfid_uid"
                    name="rfid_uid"
                    value={formData.rfid_uid}
                    onChange={handleInputChange}
                  >
                    <option value="">No RFID</option>
                    {/* Show current RFID if editing */}
                    {isEditMode && getCurrentResidentRfid() && (
                      <option value={getCurrentResidentRfid().id}>
                        {getCurrentResidentRfid().uid} - Current
                      </option>
                    )}
                    {/* Show ALL RFIDs, but mark unavailable ones */}
                    {allRfids.map((rfid) => {
                      const isAvailable =
                        !rfid.issued_to && !rfid.temporary_owner && rfid.active;
                      const isCurrent =
                        isEditMode &&
                        getCurrentResidentRfid() &&
                        rfid.id === getCurrentResidentRfid().id;

                      // Don't show current RFID twice
                      if (isCurrent) return null;

                      return (
                        <option
                          key={rfid.id}
                          value={rfid.id}
                          disabled={!isAvailable}
                        >
                          {rfid.uid}
                          {rfid.is_temporary ? " - Temporary" : " - Permanent"}
                          {!isAvailable && " - Unavailable"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="parking_slot">Parking slot</label>
                  <select
                    id="parking_slot"
                    name="parking_slot"
                    value={formData.parking_slot}
                    onChange={handleInputChange}
                  >
                    <option value="">No parking slot</option>
                    {/* Show current parking slot if editing */}
                    {isEditMode && getCurrentResidentParkingSlot() && (
                      <option value={getCurrentResidentParkingSlot().id}>
                        {getCurrentResidentParkingSlot().slot_number} - Current
                      </option>
                    )}
                    {/* Show ALL parking slots, but mark unavailable ones */}
                    {allParkingSlots.map((slot) => {
                      const isAvailable =
                        !slot.issued_to &&
                        !slot.temporary_owner &&
                        slot.status === "AVAILABLE";
                      const isCurrent =
                        isEditMode &&
                        getCurrentResidentParkingSlot() &&
                        slot.id === getCurrentResidentParkingSlot().id;

                      // Don't show current slot twice
                      if (isCurrent) return null;

                      return (
                        <option
                          key={slot.id}
                          value={slot.id}
                          disabled={!isAvailable}
                        >
                          {slot.slot_number} - {slot.type}
                          {!isAvailable && " Unavailable"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Plate Number - Full Width */}
              <div className="form-group form-group-full">
                <label htmlFor="plate_number">Plate number</label>
                <input
                  type="text"
                  id="plate_number"
                  name="plate_number"
                  value={formData.plate_number}
                  onChange={handleInputChange}
                  placeholder="ABC 1234"
                  className={fieldErrors.plate_number ? "error-input" : ""}
                />
                {fieldErrors.plate_number && (
                  <div className="field-error">{fieldErrors.plate_number}</div>
                )}
              </div>

              <div className="form-actions">
                <div className="form-buttons-row">
                  <button
                    type="submit"
                    className="update-modal-button"
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
                      "Register"
                    )}
                  </button>

                  {/* Delete button only shown in edit mode */}
                  {isEditMode && (
                    <button
                      type="button"
                      className="delete-modal-button"
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
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-exclamation-triangle warning-icon"></i>
                <h2>Confirm Deletion</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="delete-message">
              <p>
                Are you sure you want to delete this resident? This action
                cannot be undone.
              </p>
              <div className="delete-warning">
                <i className="fas fa-info-circle"></i>
                <span>
                  Deleting a resident will also delete all their access logs.
                  Make sure to generate reports first before deleting.
                </span>
              </div>
            </div>

            <div className="delete-actions">
              <button
                className="delete-confirm-button"
                onClick={handleDeleteResident}
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
                className="delete-cancel-button"
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

export default Residents;
