"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Visitors.css";
import BouncingSpinner from "../components/BouncingSpinner";
import Webcam from "react-webcam";

const Visitors = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Visitor form states
  const [visitorForm, setVisitorForm] = useState({
    first_name: "",
    last_name: "",
    drivers_license: "",
    address: "",
    plate_number: "",
    purpose: "",
    rfid_id: "",
    parking_slot_id: "",
  });
  const [editingVisitorId, setEditingVisitorId] = useState(null);
  const [currentlyAssignedRfid, setCurrentlyAssignedRfid] = useState(null);
  const [currentlyAssignedParking, setCurrentlyAssignedParking] =
    useState(null);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // OCR States
  const [showLogVisitorChoiceModal, setShowLogVisitorChoiceModal] =
    useState(false);
  const [showOCRScanModal, setShowOCRScanModal] = useState(false);
  const [licenseFile, setLicenseFile] = useState(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamRef = useRef(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");

  // Sign out states
  const [signOutLoading, setSignOutLoading] = useState({});
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [visitorToSignOut, setVisitorToSignOut] = useState(null);
  const [signOutMessage, setSignOutMessage] = useState("");
  const [signOutError, setSignOutError] = useState("");

  // Dropdown data states
  const [availableRfids, setAvailableRfids] = useState([]);
  const [availableParkingSlots, setAvailableParkingSlots] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
  };

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchVisitors = async () => {
    if (!isAuthenticated) {
      setError("Please login to view visitors");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(API_ENDPOINTS.VISITORS, {
        headers: getAuthHeaders(access),
      });

      // Sort by ID in descending order (latest first)
      const sortedVisitors = response.data.sort((a, b) => b.id - a.id);
      setVisitors(sortedVisitors);
    } catch (err) {
      console.error("Error fetching visitors:", err);
      setError("Failed to fetch visitors");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [rfidsRes, parkingSlotsRes] = await Promise.all([
        axios.get(API_ENDPOINTS.RFID, { headers: getAuthHeaders(access) }),
        axios.get(API_ENDPOINTS.PARKING, { headers: getAuthHeaders(access) }),
      ]);

      const availableRFIDs = rfidsRes.data.filter(
        (rfid) =>
          rfid.is_temporary &&
          rfid.active &&
          (!rfid.temporary_owner ||
            (editingVisitorId && rfid.temporary_owner === editingVisitorId))
      );
      setAvailableRfids(availableRFIDs);

      const availableSlots = parkingSlotsRes.data.filter(
        (slot) =>
          slot.type === "FREE" &&
          (slot.status === "AVAILABLE" ||
            (editingVisitorId && slot.temporary_owner === editingVisitorId))
      );
      setAvailableParkingSlots(availableSlots);
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    }
  };

  useEffect(() => {
    fetchVisitors();
    if (isAuthenticated && access) {
      fetchDropdownData();
    }

    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchVisitors();
        fetchDropdownData();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch, editingVisitorId]);

  // Check if a visitor has no assigned parking or RFID
  const hasNoAssignedResources = (visitor) => {
    return !visitor.rfid_details && !visitor.parking_slot_details;
  };

  // Open sign out modal
  const openSignOutModal = (visitor) => {
    if (!hasNoAssignedResources(visitor)) {
      setSignOutError(
        "Visitor has assigned RFID or parking slot. Please unassign resources first."
      );
      setShowSignOutModal(true);
      setVisitorToSignOut(visitor);
      return;
    }

    if (visitor.signed_out) {
      setSignOutError("Visitor is already signed out.");
      setShowSignOutModal(true);
      setVisitorToSignOut(visitor);
      return;
    }

    setVisitorToSignOut(visitor);
    setSignOutError("");
    setSignOutMessage("");
    setShowSignOutModal(true);
  };

  // Handle sign out for visitor
  const handleSignOut = async () => {
    if (!visitorToSignOut) return;

    setSignOutLoading((prev) => ({ ...prev, [visitorToSignOut.id]: true }));
    setSignOutError("");
    setSignOutMessage("");

    try {
      // Use the sign-out endpoint
      const response = await axios.post(
        API_ENDPOINTS.SIGN_OUT_VISITOR,
        { visitor_id: visitorToSignOut.id },
        { headers: getAuthHeaders(access) }
      );

      if (response.status === 200) {
        setSignOutMessage(
          response.data.message || "Visitor signed out successfully!"
        );

        // Refresh visitor data after a short delay
        setTimeout(async () => {
          await fetchVisitors();
          // Close modal after success
          setTimeout(() => {
            setShowSignOutModal(false);
            setVisitorToSignOut(null);
          }, 1500);
        }, 500);
      }
    } catch (err) {
      console.error(
        "Error signing out visitor:",
        err.response?.data || err.message
      );
      setSignOutError(
        err.response?.data?.message ||
          "Failed to sign out visitor. Please try again."
      );
    } finally {
      setSignOutLoading((prev) => ({ ...prev, [visitorToSignOut.id]: false }));
    }
  };

  // Close sign out modal
  const closeSignOutModal = () => {
    setShowSignOutModal(false);
    setVisitorToSignOut(null);
    setSignOutError("");
    setSignOutMessage("");
  };

  // Format input values
  const formatInputValue = (name, value) => {
    if (name === "first_name" || name === "last_name" || name === "purpose") {
      return value.replace(/\b\w/g, (char) => char.toUpperCase());
    } else if (name === "plate_number" || name === "drivers_license") {
      return value.toUpperCase();
    }
    return value;
  };

  const handleVisitorInputChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = formatInputValue(name, value);

    setVisitorForm((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!visitorForm.first_name.trim())
      errors.first_name = "First name is required";
    if (!visitorForm.last_name.trim())
      errors.last_name = "Last name is required";
    if (!visitorForm.drivers_license.trim())
      errors.drivers_license = "Driver's license is required";
    if (!visitorForm.address.trim()) errors.address = "Address is required";
    if (!visitorForm.purpose.trim()) errors.purpose = "Purpose is required";
    if (!visitorForm.plate_number.trim())
      errors.plate_number = "Plate number is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const headers = getAuthHeaders(access);

      const formData = {
        ...visitorForm,
        rfid_id: visitorForm.rfid_id || null,
        parking_slot_id: visitorForm.parking_slot_id || null,
      };

      let response;
      if (editingVisitorId) {
        response = await axios.put(
          `${API_ENDPOINTS.VISITORS}${editingVisitorId}/`,
          formData,
          { headers }
        );
        setFormSuccess("Visitor updated successfully!");
      } else {
        response = await axios.post(API_ENDPOINTS.VISITORS, formData, {
          headers,
        });
        setFormSuccess("Visitor logged successfully!");
      }

      setVisitorForm({
        first_name: "",
        last_name: "",
        drivers_license: "",
        address: "",
        plate_number: "",
        purpose: "",
        rfid_id: "",
        parking_slot_id: "",
      });
      setFieldErrors({});
      setEditingVisitorId(null);
      setCurrentlyAssignedRfid(null);
      setCurrentlyAssignedParking(null);

      setTimeout(() => {
        setShowFormModal(false);
        setFormSuccess("");
        fetchVisitors();
        fetchDropdownData();
      }, 1500);
    } catch (err) {
      console.error("Form submission error:", err.response?.data);
      setFormError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.response?.data?.rfid_id?.[0] ||
          err.response?.data?.parking_slot_id?.[0] ||
          "Failed to save visitor"
      );
    } finally {
      setFormLoading(false);
    }
  };

  // OCR Functions
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  };

  const extractDriverLicenseInfo = async (base64Image, mimeType) => {
    const prompt = `
    Extract the following information from this Philippine driver's license image:
    last_name, first_name, middle_name, sex, home_address, license_number.
    Return the response in JSON format. No extra text, no markdown.
  `.trim();

    try {
      // Use the backend proxy to avoid CORS issues
      const response = await axios.post('http://localhost:8000/api/ocr/', {
        base64_image: base64Image,
        mime_type: mimeType
      }, {
        headers: getAuthHeaders(access)
      });

      return response.data;
    } catch (err) {
      console.error("OCR failed:", err);

      // Handle quota exceeded errors specifically
      const errorMessage = err.response?.data?.error;
      if (typeof errorMessage === 'string' && (errorMessage.includes("quota") || errorMessage.includes("429"))) {
        return {
          error: "OCR service quota exceeded. The free tier has reached its daily limit. Please try again later or use manual entry."
        };
      }

      return { error: errorMessage || err.message };
    }
  };

  const handleProcessLicense = async () => {
    if (!licenseFile && !webcamActive) {
      setOcrError("Please select or capture a driver's license image.");
      return;
    }

    setOcrError("");
    setOcrLoading(true);

    try {
      let base64Image, mimeType;
      if (licenseFile) {
        base64Image = await convertImageToBase64(licenseFile);
        mimeType = licenseFile.type || "image/jpeg";
      } else if (webcamActive && webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) throw new Error("Failed to capture image");
        base64Image = screenshot.split(",")[1];
        mimeType = "image/jpeg";
      }

      const extracted = await extractDriverLicenseInfo(base64Image, mimeType);

      if (extracted.error || !extracted.first_name) {
        setOcrError(
          extracted.error ||
            "Could not read any information. Try a clearer photo."
        );
        return;
      }

      const formattedData = {
        first_name:
          (extracted.first_name || "")
            .toString()
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase()) || "",
        last_name:
          (extracted.last_name || "")
            .toString()
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase()) || "",
        drivers_license: (extracted.license_number || "").toString().trim().toUpperCase() || "",
        address: (extracted.home_address || "").toString().trim() || "",
      };

      setVisitorForm((prev) => ({
        ...prev,
        ...formattedData,
      }));

      setShowOCRScanModal(false);
      setShowFormModal(true);
      setLicenseFile(null);
      setEditingVisitorId(null);
    } catch (error) {
      console.error("OCR Error:", error);
      setOcrError("OCR failed: " + error.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const toggleWebcam = useCallback(() => {
    if (webcamActive) {
      setWebcamActive(false);
      setOcrError("");
    } else {
      setWebcamActive(true);
      setOcrError("");
    }
  }, [webcamActive]);

  const handleAddVisitor = () => {
    setShowLogVisitorChoiceModal(true);
  };

  const handleEditVisitor = async (visitor) => {
    setEditingVisitorId(visitor.id);

    // Use the IDs from the visitor object (now available from API)
    setVisitorForm({
      first_name: visitor.first_name || "",
      last_name: visitor.last_name || "",
      drivers_license: visitor.drivers_license || "",
      address: visitor.address || "",
      plate_number: visitor.plate_number || "",
      purpose: visitor.purpose || "",
      rfid_id: visitor.rfid_id || "", // Use rfid_id from API
      parking_slot_id: visitor.parking_slot_id || "", // Use parking_slot_id from API
    });

    setFieldErrors({});
    await fetchDropdownData();
    setShowFormModal(true);
  };

  const formatTimeStamp = (timestamp) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return {
      date: `${month}-${day}-${year}`,
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
  };

  // Filter visitors based on search term
  const filteredVisitors = visitors.filter((visitor) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (visitor.first_name &&
        visitor.first_name.toLowerCase().includes(searchLower)) ||
      (visitor.last_name &&
        visitor.last_name.toLowerCase().includes(searchLower)) ||
      (visitor.drivers_license &&
        visitor.drivers_license.toLowerCase().includes(searchLower)) ||
      (visitor.address &&
        visitor.address.toLowerCase().includes(searchLower)) ||
      (visitor.plate_number &&
        visitor.plate_number.toLowerCase().includes(searchLower)) ||
      (visitor.purpose &&
        visitor.purpose.toLowerCase().includes(searchLower)) ||
      // Updated: Use rfid_details instead of rfid
      (visitor.rfid_details?.uid &&
        visitor.rfid_details.uid.toLowerCase().includes(searchLower)) ||
      // Updated: Use parking_slot_details instead of parking_slot
      (visitor.parking_slot_details?.slot_number &&
        visitor.parking_slot_details.slot_number
          .toLowerCase()
          .includes(searchLower))
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVisitors = filteredVisitors.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage);

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

  const handleCloseFormModal = () => {
    setVisitorForm({
      first_name: "",
      last_name: "",
      drivers_license: "",
      address: "",
      plate_number: "",
      purpose: "",
      rfid_id: "",
      parking_slot_id: "",
    });
    setEditingVisitorId(null);
    setCurrentlyAssignedRfid(null);
    setCurrentlyAssignedParking(null);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");
    setShowFormModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view visitors</h2>
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
        <Header title="Visitors" />

        <div className="dashboard-main no-top-padding">
          <div className="visitors-container">
            <div className="visitors-header">
              <div className="visitors-title">
                <i className="fas fa-user-friends green-icon"></i>
                <h2>Visitors</h2>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                <i className="fas fa-search"></i>
              </div>
              <div className="visitors-actions">
                <button className="register-button" onClick={handleAddVisitor}>
                  <i className="fas fa-user-plus"></i> Log Visitor
                </button>
              </div>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : filteredVisitors.length === 0 ? (
              <div className="no-data">
                {searchTerm
                  ? "No visitors found matching your search"
                  : "No visitors found"}
              </div>
            ) : (
              <>
                <table className="visitors-table">
                  <thead>
                    <tr>
                      <th>Time Stamp</th>
                      <th>Driver's License</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Address</th>
                      <th>Plate Number</th>
                      <th>Purpose</th>
                      <th>RFID UID</th>
                      <th>Parking Slot</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVisitors.map((visitor) => {
                      const { date, time } = formatTimeStamp(visitor.timestamp);
                      const canSignOut = hasNoAssignedResources(visitor);
                      const isLoading = signOutLoading[visitor.id];
                      const isSignedOut = visitor.signed_out;

                      return (
                        <tr
                          key={visitor.id}
                          className="clickable-row"
                          onClick={() => handleEditVisitor(visitor)}
                        >
                          <td>
                            <div className="time-main">{date}</div>
                            <div className="time-sub">{time}</div>
                          </td>
                          <td>{visitor.drivers_license}</td>
                          <td>{visitor.first_name}</td>
                          <td>{visitor.last_name}</td>
                          <td>{visitor.address}</td>
                          <td>{visitor.plate_number}</td>
                          <td>{visitor.purpose}</td>
                          {/* Updated: Use rfid_details instead of rfid */}
                          <td>{visitor.rfid_details?.uid || "N/A"}</td>
                          {/* Updated: Use parking_slot_details instead of parking_slot */}
                          <td>
                            {visitor.parking_slot_details?.slot_number || "N/A"}
                          </td>
                          <td>
                            {isSignedOut ? (
                              <span className="signed-out-status">
                                <i className="fas fa-check-circle"></i>
                                Signed Out
                              </span>
                            ) : canSignOut ? (
                              <button
                                className="sign-out-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSignOutModal(visitor);
                                }}
                                disabled={isLoading}
                                title="Sign out visitor"
                              >
                                {isLoading ? (
                                  <div
                                    className="spinner"
                                    style={{ margin: 0 }}
                                  >
                                    <div className="bounce1"></div>
                                    <div className="bounce2"></div>
                                    <div className="bounce3"></div>
                                  </div>
                                ) : (
                                  <>
                                    <i className="fas fa-sign-out-alt"></i>
                                    Sign Out
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="has-resources-status">
                                Has assigned resources
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
                  <span className="visitor-count">
                    {filteredVisitors.length} visitors
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="visitors-modal-overlay">
          <div className="visitors-modal-content">
            <div className="visitors-modal-header">
              <div className="visitors-modal-title">
                <i className="fas fa-sign-out-alt users-green"></i>
                <h2>Sign Out Visitor</h2>
              </div>
              <button
                className="visitors-close-button"
                onClick={closeSignOutModal}
                disabled={signOutLoading[visitorToSignOut?.id]}
              >
                ×
              </button>
            </div>

            {signOutError && <div className="form-error">{signOutError}</div>}
            {signOutMessage && (
              <div className="form-success">{signOutMessage}</div>
            )}

            {!signOutMessage && visitorToSignOut && (
              <div className="modal-form">
                <div className="form-group form-group-full">
                  <p className="sign-out-confirmation-text">
                    Are you sure you want to sign out{" "}
                    <strong>
                      {visitorToSignOut.first_name} {visitorToSignOut.last_name}
                    </strong>
                    ?
                  </p>

                  <div className="visitor-details-container">
                    <div className="visitor-detail-row">
                      <span className="visitor-detail-label">
                        Driver's License:
                      </span>
                      <span className="visitor-detail-value">
                        {visitorToSignOut.drivers_license}
                      </span>
                    </div>
                    <div className="visitor-detail-row">
                      <span className="visitor-detail-label">
                        Plate Number:
                      </span>
                      <span className="visitor-detail-value">
                        {visitorToSignOut.plate_number || "N/A"}
                      </span>
                    </div>
                    <div className="visitor-detail-row">
                      <span className="visitor-detail-label">RFID:</span>
                      <span className="visitor-detail-value">
                        {visitorToSignOut.rfid_details?.uid || "N/A"}
                      </span>
                    </div>
                    <div className="visitor-detail-row">
                      <span className="visitor-detail-label">
                        Parking Slot:
                      </span>
                      <span className="visitor-detail-value">
                        {visitorToSignOut.parking_slot_details?.slot_number ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="visitor-detail-row">
                      <span className="visitor-detail-label">Purpose:</span>
                      <span className="visitor-detail-value purpose-text">
                        {visitorToSignOut.purpose}
                      </span>
                    </div>
                  </div>

                  <p className="sign-out-note">
                    This will create an exit log and mark the visitor as signed
                    out. The visitor record will remain in the system.
                  </p>
                </div>

                <div className="form-actions">
                  <div className="form-buttons-row">
                    <button
                      type="button"
                      className="update-modal-button"
                      onClick={handleSignOut}
                      disabled={signOutLoading[visitorToSignOut.id]}
                      style={{
                        backgroundColor: "#00c07f",
                        color: "white",
                        borderColor: "#00c07f",
                      }}
                    >
                      {signOutLoading[visitorToSignOut.id] ? (
                        <div className="spinner white">
                          <div className="bounce1"></div>
                          <div className="bounce2"></div>
                          <div className="bounce3"></div>
                        </div>
                      ) : (
                        "Confirm Sign Out"
                      )}
                    </button>
                    <button
                      type="button"
                      className="delete-modal-button"
                      onClick={closeSignOutModal}
                      disabled={signOutLoading[visitorToSignOut.id]}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {signOutMessage && (
              <div className="form-actions">
                <div className="form-buttons-row">
                  <button
                    type="button"
                    className="update-modal-button"
                    onClick={closeSignOutModal}
                    style={{
                      backgroundColor: "#00c07f",
                      color: "white",
                      borderColor: "#00c07f",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Visitor Choice Modal */}
      {showLogVisitorChoiceModal && (
        <div className="visitors-modal-overlay">
          <div className="visitors-modal-content choice-modal">
            <div className="visitors-modal-header">
              <div className="visitors-modal-title">
                <i className="fas fa-user-plus green-icon"></i>
                <h2>Log New Visitor</h2>
              </div>
              <button
                className="visitors-close-button"
                onClick={() => setShowLogVisitorChoiceModal(false)}
              >
                ×
              </button>
            </div>

            <div className="choice-buttons-container">
              <button
                className="choice-button manual-choice"
                onClick={() => {
                  setShowLogVisitorChoiceModal(false);
                  setShowFormModal(true);
                  setEditingVisitorId(null);
                  setCurrentlyAssignedRfid(null);
                  setCurrentlyAssignedParking(null);
                }}
              >
                <i className="fas fa-keyboard"></i>
                <span>Manual Entry</span>
                <small>Type visitor details</small>
              </button>

              <button
                className="choice-button ocr-choice"
                onClick={() => {
                  setShowLogVisitorChoiceModal(false);
                  setShowOCRScanModal(true);
                  setEditingVisitorId(null);
                  setCurrentlyAssignedRfid(null);
                  setCurrentlyAssignedParking(null);
                }}
              >
                <i className="fas fa-id-card"></i>
                <span>OCR Scan</span>
                <small>Scan Driver's License</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Form Modal */}
      {showFormModal && (
        <div className="visitors-modal-overlay">
          <div className="visitors-modal-content">
            <div className="visitors-modal-header">
              <div className="visitors-modal-title">
                <button
                  className="visitors-back-button"
                  onClick={() => {
                    handleCloseFormModal();
                    setShowLogVisitorChoiceModal(true);
                  }}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <i className="fas fa-user-shield users-green"></i>
                <h2>{editingVisitorId ? "Edit Visitor" : "Log Visitor"}</h2>
              </div>
              <button
                className="visitors-close-button"
                onClick={handleCloseFormModal}
              >
                ×
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            <form onSubmit={handleVisitorSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={visitorForm.first_name}
                    onChange={handleVisitorInputChange}
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
                    value={visitorForm.last_name}
                    onChange={handleVisitorInputChange}
                    placeholder="Last name"
                    className={fieldErrors.last_name ? "error-input" : ""}
                  />
                  {fieldErrors.last_name && (
                    <div className="field-error">{fieldErrors.last_name}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="drivers_license">Drivers License</label>
                  <input
                    type="text"
                    id="drivers_license"
                    name="drivers_license"
                    value={visitorForm.drivers_license}
                    onChange={handleVisitorInputChange}
                    placeholder="Driver's license number"
                    className={fieldErrors.drivers_license ? "error-input" : ""}
                  />
                  {fieldErrors.drivers_license && (
                    <div className="field-error">
                      {fieldErrors.drivers_license}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="plate_number">Plate Number</label>
                  <input
                    type="text"
                    id="plate_number"
                    name="plate_number"
                    value={visitorForm.plate_number}
                    onChange={handleVisitorInputChange}
                    placeholder="ABC 1234"
                    className={fieldErrors.plate_number ? "error-input" : ""}
                  />
                  {fieldErrors.plate_number && (
                    <div className="field-error">
                      {fieldErrors.plate_number}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={visitorForm.address}
                  onChange={handleVisitorInputChange}
                  placeholder="Home address"
                  className={fieldErrors.address ? "error-input" : ""}
                />
                {fieldErrors.address && (
                  <div className="field-error">{fieldErrors.address}</div>
                )}
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="purpose">Purpose</label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={visitorForm.purpose}
                  onChange={handleVisitorInputChange}
                  placeholder="Purpose of visit"
                  className={fieldErrors.purpose ? "error-input" : ""}
                />
                {fieldErrors.purpose && (
                  <div className="field-error">{fieldErrors.purpose}</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rfid_id">RFID</label>
                  <select
                    id="rfid_id"
                    name="rfid_id"
                    value={visitorForm.rfid_id}
                    onChange={handleVisitorInputChange}
                  >
                    <option value="">No RFID</option>
                    {/* Show current RFID if editing */}
                    {editingVisitorId &&
                      visitorForm.rfid_id &&
                      (() => {
                        const currentRfid = availableRfids.find(
                          (r) => r.id === visitorForm.rfid_id
                        );
                        return currentRfid ? (
                          <option key={currentRfid.id} value={currentRfid.id}>
                            {currentRfid.uid} (Current)
                          </option>
                        ) : null;
                      })()}
                    {/* Show available RFIDs */}
                    {availableRfids.map((rfid) => {
                      // Skip if this is the current RFID
                      if (
                        editingVisitorId &&
                        visitorForm.rfid_id &&
                        rfid.id === visitorForm.rfid_id
                      ) {
                        return null;
                      }

                      const isAvailable =
                        !rfid.temporary_owner ||
                        rfid.temporary_owner === editingVisitorId;

                      return (
                        <option
                          key={rfid.id}
                          value={rfid.id}
                          disabled={!isAvailable}
                        >
                          {rfid.uid} - Temporary
                          {!isAvailable && " - Assigned"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="parking_slot_id">Parking Slot</label>
                  <select
                    id="parking_slot_id"
                    name="parking_slot_id"
                    value={visitorForm.parking_slot_id}
                    onChange={handleVisitorInputChange}
                  >
                    <option value="">No parking slot</option>
                    {/* Show current parking slot if editing */}
                    {editingVisitorId &&
                      visitorForm.parking_slot_id &&
                      (() => {
                        const currentSlot = availableParkingSlots.find(
                          (s) => s.id === visitorForm.parking_slot_id
                        );
                        return currentSlot ? (
                          <option key={currentSlot.id} value={currentSlot.id}>
                            {currentSlot.slot_number} (Current)
                          </option>
                        ) : null;
                      })()}
                    {/* Show available parking slots */}
                    {availableParkingSlots.map((slot) => {
                      // Skip if this is the current slot
                      if (
                        editingVisitorId &&
                        visitorForm.parking_slot_id &&
                        slot.id === visitorForm.parking_slot_id
                      ) {
                        return null;
                      }

                      const isAvailable =
                        !slot.temporary_owner ||
                        slot.temporary_owner === editingVisitorId;

                      return (
                        <option
                          key={slot.id}
                          value={slot.id}
                          disabled={!isAvailable}
                        >
                          {slot.slot_number} ({slot.type}) -{" "}
                          {slot.location_display}
                          {!isAvailable && " - Occupied"}
                        </option>
                      );
                    })}
                  </select>
                </div>
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
                    ) : editingVisitorId ? (
                      "Update"
                    ) : (
                      "Submit"
                    )}
                  </button>
                  <button
                    type="button"
                    className="delete-modal-button"
                    onClick={() => {
                      setVisitorForm({
                        first_name: "",
                        last_name: "",
                        drivers_license: "",
                        address: "",
                        plate_number: "",
                        purpose: "",
                        rfid_id: "",
                        parking_slot_id: "",
                      });
                      setFieldErrors({});
                      setEditingVisitorId(null);
                      setCurrentlyAssignedRfid(null);
                      setCurrentlyAssignedParking(null);
                    }}
                    disabled={formLoading}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OCR Scan Modal */}
      {showOCRScanModal && (
        <div className="visitors-modal-overlay">
          <div className="visitors-modal-content choice-modal">
            <div className="visitors-modal-header">
              <div className="visitors-modal-title">
                <button
                  className="visitors-back-button"
                  onClick={() => {
                    if (webcamActive) {
                      setWebcamActive(false);
                    } else if (licenseFile) {
                      setLicenseFile(null);
                    } else {
                      setShowOCRScanModal(false);
                      setShowLogVisitorChoiceModal(true);
                    }
                  }}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <i className="fas fa-id-card users-green"></i>
                <h2>Scan Driver's License</h2>
              </div>
              <button
                className="visitors-close-button"
                onClick={() => {
                  setShowOCRScanModal(false);
                  setWebcamActive(false);
                  setLicenseFile(null);
                  setOcrError("");
                }}
              >
                ×
              </button>
            </div>

            {ocrError && <div className="form-error">{ocrError}</div>}

            <div className="choice-buttons-container">
              {!licenseFile && !webcamActive && (
                <>
                  <button
                    className="choice-button gallery-choice"
                    onClick={() =>
                      document.getElementById("licenseFile").click()
                    }
                  >
                    <i className="fas fa-images"></i>
                    <span>Choose Photo</span>
                    <small>Select from your device</small>
                  </button>

                  <button
                    className="choice-button camera-choice"
                    onClick={() => setWebcamActive(true)}
                  >
                    <i className="fas fa-camera"></i>
                    <span>Use Camera</span>
                    <small>Take a photo now</small>
                  </button>
                </>
              )}

              {webcamActive && !licenseFile && (
                <div className="camera-view-full">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="webcam-feed-full"
                  />
                  <div className="small-action-buttons">
                    <button
                      className="small-action-button capture-button"
                      onClick={() => {
                        const shot = webcamRef.current?.getScreenshot();
                        if (shot) {
                          fetch(shot)
                            .then((r) => r.blob())
                            .then((blob) => {
                              setLicenseFile(
                                new File([blob], "capture.jpg", {
                                  type: "image/jpeg",
                                })
                              );
                              setWebcamActive(false);
                            });
                        }
                      }}
                    >
                      <i className="fas fa-camera"></i>
                      Capture Photo
                    </button>
                  </div>
                </div>
              )}

              {licenseFile && (
                <div className="preview-container-full">
                  <img
                    src={URL.createObjectURL(licenseFile)}
                    alt="License"
                    className="license-preview-full"
                  />
                  <div className="small-action-buttons">
                    <button
                      className="small-action-button process-button"
                      onClick={handleProcessLicense}
                      disabled={ocrLoading}
                    >
                      {ocrLoading ? (
                        <div className="spinner white">
                          <div className="bounce1"></div>
                          <div className="bounce2"></div>
                          <div className="bounce3"></div>
                        </div>
                      ) : (
                        <>
                          <i className="fas fa-magic"></i>
                          Extract Information
                        </>
                      )}
                    </button>

                    <button
                      className="small-action-button retake-button"
                      onClick={() => {
                        setLicenseFile(null);
                        setOcrError("");
                      }}
                    >
                      <i className="fas fa-redo"></i>
                      Retake Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <input
              type="file"
              id="licenseFile"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setLicenseFile(e.target.files[0]);
                  setWebcamActive(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitors;