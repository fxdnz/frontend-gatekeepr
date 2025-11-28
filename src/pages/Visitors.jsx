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

const GEMINI_API_KEY = "AIzaSyAhFjdWTmnlrR-Zx86MrqKESnAcvSzjeGw";
const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const Visitors = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Visitor form states
  const [visitorForm, setVisitorForm] = useState({
    first_name: "",
    last_name: "",
    drivers_license: "",
    address: "",
    plate_number: "",
    purpose: "",
    rfid: "",
    parking_slot: "",
  });

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
          !rfid.issued_to &&
          !rfid.temporary_owner &&
          rfid.active &&
          rfid.is_temporary
      );
      setAvailableRfids(availableRFIDs);

      const availableSlots = parkingSlotsRes.data.filter(
        (slot) =>
          !slot.issued_to &&
          !slot.temporary_owner &&
          slot.status === "AVAILABLE" &&
          slot.type === "FREE"
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
  }, [access, isAuthenticated, dispatch]);

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
      (visitor.rfid_uid &&
        visitor.rfid_uid.toLowerCase().includes(searchLower)) ||
      (visitor.parking_slot_display &&
        visitor.parking_slot_display.toLowerCase().includes(searchLower))
    );
  });

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
      await axios.post(API_ENDPOINTS.VISITORS, visitorForm, { headers });

      setFormSuccess("Visitor logged successfully!");
      setVisitorForm({
        first_name: "",
        last_name: "",
        drivers_license: "",
        address: "",
        plate_number: "",
        purpose: "",
        rfid: "",
        parking_slot: "",
      });
      setFieldErrors({});

      setTimeout(() => {
        setShowFormModal(false);
        setFormSuccess("");
        fetchVisitors();
        fetchDropdownData();
      }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to log visitor");
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

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(GEMINI_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Gemini API request failed: ${response.statusText} - ${errText}`
        );
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const textResponse = data.candidates[0].content.parts[0].text.trim();
        let cleanText = textResponse
          .replace(/```json|```/g, "")
          .replace(/^{|}$/g, "")
          .trim();

        if (!cleanText.startsWith("{")) {
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanText = jsonMatch[0];
          }
        }

        const parsed = JSON.parse(cleanText);
        return parsed;
      } else {
        throw new Error("No recognizable content from Gemini API.");
      }
    } catch (err) {
      console.error("Gemini OCR failed:", err);
      return { error: err.message };
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

      // Format the extracted data
      const formattedData = {
        first_name:
          extracted.first_name
            ?.trim()
            .replace(/\b\w/g, (char) => char.toUpperCase()) || "",
        last_name:
          extracted.last_name
            ?.trim()
            .replace(/\b\w/g, (char) => char.toUpperCase()) || "",
        drivers_license: extracted.license_number?.trim().toUpperCase() || "",
        address: extracted.home_address?.trim() || "",
      };

      setVisitorForm((prev) => ({
        ...prev,
        ...formattedData,
      }));

      setShowOCRScanModal(false);
      setShowFormModal(true);
      setLicenseFile(null);
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

  const handleEditVisitor = (visitor) => {
    setVisitorForm({
      first_name: visitor.first_name || "",
      last_name: visitor.last_name || "",
      drivers_license: visitor.drivers_license || "",
      address: visitor.address || "",
      plate_number: visitor.plate_number || "",
      purpose: visitor.purpose || "",
      rfid: visitor.rfid?.id || "", // Use the RFID ID for the form
      parking_slot: visitor.parking_slot?.id || "", // Use the parking slot ID for the form
    });
    setFieldErrors({});
    setShowFormModal(true);
  };

  const formatTimeStamp = (timestamp) => {
    const date = new Date(timestamp);

    // Format date as MM-DD-YY
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

  // Reset to page 1 when search term changes
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
                    </tr>
                  </thead>
                  <tbody>
                    {currentVisitors.map((visitor) => {
                      const { date, time } = formatTimeStamp(visitor.timestamp);
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
                          <td>{visitor.rfid?.uid || "N/A"}</td>
                          <td>{visitor.parking_slot?.slot_number || "N/A"}</td>
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
                    setShowFormModal(false);
                    setShowLogVisitorChoiceModal(true);
                  }}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <i className="fas fa-user-shield users-green"></i>
                <h2>Log Visitor</h2>
              </div>
              <button
                className="visitors-close-button"
                onClick={() => setShowFormModal(false)}
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
                  <label htmlFor="rfid">RFID</label>
                  <select
                    id="rfid"
                    name="rfid"
                    value={visitorForm.rfid}
                    onChange={handleVisitorInputChange}
                  >
                    <option value="">No RFID</option>
                    {availableRfids.map((rfid) => (
                      <option key={rfid.id} value={rfid.id}>
                        {rfid.uid} - Temporary
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="parking_slot">Parking Slot</label>
                  <select
                    id="parking_slot"
                    name="parking_slot"
                    value={visitorForm.parking_slot}
                    onChange={handleVisitorInputChange}
                  >
                    <option value="">No parking slot</option>
                    {availableParkingSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.slot_number} ({slot.type}) - {slot.location}
                      </option>
                    ))}
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
                        rfid: "",
                        parking_slot: "",
                      });
                      setFieldErrors({});
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
