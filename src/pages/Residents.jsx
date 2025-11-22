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
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rfid_uid: "",
    plate_number: "",
    unit_number: "",
    phone: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // New states for edit mode and delete confirmation
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentResidentId, setCurrentResidentId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

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
      setResidents(response.data);
    } catch (err) {
      console.error("Error fetching residents:", err);

      if (err.response) {
        if (err.response.status === 500) {
          setError(
            "Server error while fetching residents. Please try again later."
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

            const retryResponse = await axios.get(API_ENDPOINTS.RESIDENTS, {
              headers: getAuthHeaders(refreshResponse.data.access),
            });
            setResidents(retryResponse.data);
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
    fetchResidents();

    // Set up polling for real-time updates (every 10 seconds)
    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchResidents();
      }
    }, 5000); // 5 seconds

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Function to open edit modal
  const handleEditResident = (resident) => {
    setIsEditMode(true);
    setCurrentResidentId(resident.id);
    setFormData({
      name: resident.name,
      rfid_uid: resident.rfid_uid,
      plate_number: resident.plate_number,
      unit_number: resident.unit_number,
      phone: resident.phone,
    });
    setShowModal(true);
  };

  // Function to open delete confirmation modal
  const handleDeleteClick = (resident) => {
    setCurrentResidentId(resident.id);
    setShowDeleteModal(true);
  };

  // Function to delete resident
  const handleDeleteResident = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_ENDPOINTS.RESIDENTS}${currentResidentId}/`, {
        headers: getAuthHeaders(access),
      });

      // Remove the deleted resident from the state
      setResidents(
        residents.filter((resident) => resident.id !== currentResidentId)
      );
      setShowDeleteModal(false);
      setCurrentResidentId(null);
    } catch (err) {
      console.error("Error deleting resident:", err);
      alert("Failed to delete resident. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Updated submit handler to handle both create and update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    try {
      let response;

      if (isEditMode) {
        // Update existing resident
        response = await axios.put(
          `${API_ENDPOINTS.RESIDENTS}${currentResidentId}/`,
          formData,
          {
            headers: getAuthHeaders(access),
          }
        );

        // Update the resident in the list
        setResidents(
          residents.map((resident) =>
            resident.id === currentResidentId ? response.data : resident
          )
        );
        setFormSuccess("Resident updated successfully!");
      } else {
        // Create new resident
        response = await axios.post(API_ENDPOINTS.RESIDENTS, formData, {
          headers: getAuthHeaders(access),
        });

        // Add the new resident to the list
        setResidents([...residents, response.data]);
        setFormSuccess("Resident registered successfully!");
      }

      // Clear the form
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess("");
        setIsEditMode(false);
        setCurrentResidentId(null);
        setFormData({
          name: "",
          rfid_uid: "",
          plate_number: "",
          unit_number: "",
          phone: "",
        });
      }, 2000);
    } catch (err) {
      console.error("Error saving resident:", err);
      if (err.response) {
        setFormError(
          err.response.data?.detail ||
            "Failed to save resident. Please try again."
        );
      } else if (err.request) {
        setFormError("No response from server. Please check your network.");
      } else {
        setFormError("Error: " + err.message);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      name: "",
      rfid_uid: "",
      plate_number: "",
      unit_number: "",
      phone: "",
    });
    setFormError("");
    setFormSuccess("");
  };

  // Function to open the modal for creating a new resident
  const handleAddResident = () => {
    setIsEditMode(false);
    setCurrentResidentId(null);
    setFormData({
      name: "",
      rfid_uid: "",
      plate_number: "",
      unit_number: "",
      phone: "",
    });
    setShowModal(true);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [residents]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResidents = residents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(residents.length / itemsPerPage);

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
              <button className="register-button" onClick={handleAddResident}>
                <i className="fas fa-user-plus"></i> Register Resident
              </button>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : residents.length === 0 ? (
              <div className="no-data">No residents found</div>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResidents.map((resident) => (
                      <tr key={resident.id}>
                        <td>{resident.rfid_uid}</td>
                        <td>{resident.plate_number}</td>
                        <td>{resident.name}</td>
                        <td>{resident.phone}</td>
                        <td>{resident.unit_number}</td>
                        <td className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => handleEditResident(resident)}
                            title="Edit resident"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDeleteClick(resident)}
                            title="Delete resident"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pagination-controls">
                  <button
                    className="pagination-button"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-button"
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

      {/* Registration/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-users users-green"></i>
                <h2>
                  {isEditMode ? "Edit Resident" : "Resident Registration"}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09x-xxx-xxxx"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="unit_number">Unit Number</label>
                <input
                  type="text"
                  id="unit_number"
                  name="unit_number"
                  value={formData.unit_number}
                  onChange={handleInputChange}
                  placeholder="APT - 801"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="rfid_uid">RFID UID</label>
                <input
                  type="text"
                  id="rfid_uid"
                  name="rfid_uid"
                  value={formData.rfid_uid}
                  onChange={handleInputChange}
                  placeholder="Enter RFID UID"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="plate_number">Plate Number</label>
                <input
                  type="text"
                  id="plate_number"
                  name="plate_number"
                  value={formData.plate_number}
                  onChange={handleInputChange}
                  placeholder="ABC 1234"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-button"
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
                    "Submit"
                  )}
                </button>
                <button
                  type="button"
                  className="clear-button"
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
              Are you sure you want to delete this resident? This action cannot
              be undone.
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
