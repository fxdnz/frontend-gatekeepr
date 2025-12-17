"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import axios from "axios";
import { load_user } from "../actions/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Home.css";
import Webcam from "react-webcam";

const GEMINI_API_KEY = "AIzaSyA3Ok39YpzUOfK11SCR6G0NqEWLselT_zE";
const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const Home = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [parkingData, setParkingData] = useState({
    occupied: 0,
    available: 0,
    free: 0,
  });

  const [visitorLogs, setVisitorLogs] = useState([]);
  const [recentActivityLogs, setRecentActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showLogVisitorChoiceModal, setShowLogVisitorChoiceModal] =
    useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showOCRScanModal, setShowOCRScanModal] = useState(false);

  // Visitor form states
  const [visitorForm, setVisitorForm] = useState({
    first_name: "",
    last_name: "",
    drivers_license: "",
    address: "",
    plate_number: "",
    purpose: "",
    rfid_id: "", // Changed from rfid to rfid_id
    parking_slot_id: "", // Changed from parking_slot to parking_slot_id
  });

  const [visitorError, setVisitorError] = useState("");
  const [visitorSuccess, setVisitorSuccess] = useState("");
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // OCR States
  const [licenseFile, setLicenseFile] = useState(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamRef = useRef(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [availableRfids, setAvailableRfids] = useState([]);
  const [availableParkingSlots, setAvailableParkingSlots] = useState([]);

  // Use refs to store visitors for parking lookup
  const visitorsRef = useRef([]);

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

  const fetchData = async (token) => {
    const headers = getAuthHeaders(token);
    try {
      const [parkingRes, logsRes, rfidsRes, parkingSlotsRes, visitorsRes] =
        await Promise.all([
          axios.get(API_ENDPOINTS.PARKING, { headers }),
          axios.get(API_ENDPOINTS.ACCESS_LOGS, { headers }),
          axios.get(API_ENDPOINTS.RFID, { headers }),
          axios.get(API_ENDPOINTS.PARKING, { headers }),
          axios.get(API_ENDPOINTS.VISITORS, { headers }),
        ]);

      const parkingStats = parkingRes.data;
      setParkingData({
        occupied:
          parkingStats.filter((s) => s.status === "OCCUPIED").length || 0,
        available:
          parkingStats.filter(
            (s) => s.status === "AVAILABLE" && s.type !== "FREE"
          ).length || 0,
        free:
          parkingStats.filter(
            (s) => s.type === "FREE" && s.status === "AVAILABLE"
          ).length || 0,
      });

      // Store visitors for parking lookup
      visitorsRef.current = visitorsRes.data;

      // Create a map of visitor IDs to their parking slot details
      const visitorParkingMap = {};
      visitorsRes.data.forEach((visitor) => {
        if (visitor.parking_slot_details) {
          visitorParkingMap[visitor.id] =
            visitor.parking_slot_details.slot_number || "-";
        }
      });

      // Process logs to extract information from resident_details and visitor_log_details
      const allLogs = logsRes.data.map((log) => {
        let name = "N/A";
        let plateNumber = "-";
        let parkingSlot = "-";

        // Extract information based on type
        if (log.type === "RESIDENT" && log.resident_details) {
          // Get name from resident_details
          name =
            log.resident_details.name ||
            `${log.resident_details.first_name || ""} ${
              log.resident_details.last_name || ""
            }`.trim() ||
            "Resident";

          // Get plate number from resident_details
          plateNumber = log.resident_details.plate_number || "-";
        } else if (log.type === "VISITOR") {
          // Check if log has visitor_log_details
          if (log.visitor_log_details) {
            const visitorId = log.visitor_log_details.id;
            // Get name from visitor_log_details
            name =
              log.visitor_log_details.name ||
              `${log.visitor_log_details.first_name || ""} ${
                log.visitor_log_details.last_name || ""
              }`.trim() ||
              "Visitor";

            // Get plate number from visitor_log_details
            plateNumber = log.visitor_log_details.plate_number || "-";

            // Get parking slot from visitor parking map
            if (visitorParkingMap[visitorId]) {
              parkingSlot = visitorParkingMap[visitorId];
            }
          }
        } else {
          // Fallback for logs without details
          name = log.type === "RESIDENT" ? "Resident" : "Visitor";
        }

        // Get parking slot - check multiple sources in priority order:

        // 1. First, check if log has parking_details directly
        if (log.parking_details) {
          parkingSlot = log.parking_details.slot_number || "-";
        }
        // 2. For visitors, if parking still not found and we have visitorId, check map again
        else if (
          log.type === "VISITOR" &&
          log.visitor_log_details &&
          parkingSlot === "-"
        ) {
          const visitorId = log.visitor_log_details.id;
          if (visitorParkingMap[visitorId]) {
            parkingSlot = visitorParkingMap[visitorId];
          }
        }

        return {
          ...log,
          name: name || "N/A",
          plate_number: plateNumber || "-",
          parking_slot: parkingSlot || "-",
          action: log.action || "N/A",
          type: log.type || "N/A",
        };
      });

      // Sort by timestamp (newest first)
      const sortedLogs = allLogs.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Filter and set visitor logs (first 4)
      const visitors = sortedLogs.filter((log) => log.type === "VISITOR");
      setVisitorLogs(visitors.slice(0, 4));

      // Set recent activity logs (first 7)
      setRecentActivityLogs(sortedLogs.slice(0, 7));

      // For RFID: include temporary RFID that are currently unassigned
      const availableRFIDs = rfidsRes.data.filter(
        (rfid) =>
          rfid.is_temporary &&
          rfid.active &&
          !rfid.temporary_owner &&
          !rfid.issued_to
      );
      setAvailableRfids(availableRFIDs);

      // For parking slots: include FREE slots that are AVAILABLE
      const availableSlots = parkingSlotsRes.data.filter(
        (slot) =>
          slot.type === "FREE" &&
          slot.status === "AVAILABLE" &&
          !slot.temporary_owner &&
          !slot.issued_to
      );
      setAvailableParkingSlots(availableSlots);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      if (!isAuthenticated) {
        setError("Please login to view dashboard");
        setLoading(false);
        return;
      }

      try {
        await fetchData(access);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchData(access);
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

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

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setVisitorLoading(true);
    setVisitorError("");
    setVisitorSuccess("");

    try {
      const headers = getAuthHeaders(access);

      // Prepare data for API - use rfid_id and parking_slot_id
      const formData = {
        ...visitorForm,
        rfid_id: visitorForm.rfid_id || null,
        parking_slot_id: visitorForm.parking_slot_id || null,
      };

      // Create new visitor
      const response = await axios.post(API_ENDPOINTS.VISITORS, formData, {
        headers,
      });

      setVisitorSuccess("Visitor logged successfully!");

      // Reset form
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
      setFormErrors({});

      setTimeout(() => {
        setShowVisitorModal(false);
        setVisitorSuccess("");
        fetchData(access);
      }, 1500);
    } catch (err) {
      console.error("Form submission error:", err.response?.data);
      setVisitorError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.response?.data?.rfid_id?.[0] ||
          err.response?.data?.parking_slot_id?.[0] ||
          "Failed to log visitor"
      );
    } finally {
      setVisitorLoading(false);
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
      setShowVisitorModal(true);
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

  const formatTimeStamp = (timestamp) => {
    if (!timestamp) return { date: "N/A", time: "N/A" };

    const date = new Date(timestamp);
    if (isNaN(date.getTime()))
      return { date: "Invalid Date", time: "Invalid Time" };

    return {
      date: date.toISOString().split("T")[0],
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
  };

  // Reset form when closing modal
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
    setFormErrors({});
    setVisitorError("");
    setVisitorSuccess("");
    setShowVisitorModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view dashboard</h2>
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
        <Header />
        <div className="dashboard-main no-top-padding">
          <div className="recent-activities">
            <div className="bentobox-container">
              {/* Left Bento - Stat Cards */}
              <div className="left-bento">
                <div className="statcard-container">
                  {/* Stat Card 1 - Vehicles Parked */}
                  <div className="stat-card">
                    <div className="stat-header">
                      <i className="fa fa-xs fa-square green-icon"></i>
                      <span>Vehicles Parked</span>
                    </div>
                    <div className="stat-body">
                      <div className="stat-content">
                        <span className="stat-number">
                          {parkingData.occupied}
                        </span>
                        <span className="stat-label">Parking Occupied</span>
                      </div>
                      <div className="animation-container">
                        <div className="scrolling-lines-1">
                          <div
                            className="line"
                            style={{ backgroundColor: "#ff3b30" }}
                          ></div>
                          <div
                            className="line"
                            style={{ backgroundColor: "#ff3b30" }}
                          ></div>
                          <div
                            className="line"
                            style={{ backgroundColor: "#ff3b30" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stat Card 2 - Resident Parking */}
                  <div className="stat-card">
                    <div className="stat-header">
                      <i className="fa fa-xs fa-square green-icon"></i>
                      <span>Resident Parking</span>
                    </div>
                    <div className="stat-body">
                      <div className="stat-content">
                        <span className="stat-number">
                          {parkingData.available}
                        </span>
                        <span className="stat-label">Available Parking</span>
                      </div>
                      <div className="animation-container">
                        <div className="scrolling-lines">
                          <div
                            className="line"
                            style={{ backgroundColor: "#00BF63" }}
                          ></div>
                          <div
                            className="line"
                            style={{ backgroundColor: "#00BF63" }}
                          ></div>
                          <div
                            className="line"
                            style={{ backgroundColor: "#00BF63" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stat Card 3 - Visitor Parking */}
                  <div className="stat-card">
                    <div className="stat-header">
                      <i className="fa fa-xs fa-square green-icon"></i>
                      <span>Visitor Parking</span>
                    </div>
                    <div className="stat-body">
                      <div className="stat-content">
                        <span className="stat-number">{parkingData.free}</span>
                        <span className="stat-label">Free Parking</span>
                      </div>
                      <div className="animation-container">
                        <div className="scrolling-lines-3">
                          <div
                            className="line"
                            style={{ backgroundColor: "#FF751F" }}
                          ></div>
                          <div
                            className="line"
                            style={{ backgroundColor: "#FF751F" }}
                          ></div>
                          <div
                            className="line"
                            style={{ backgroundColor: "#FF751F" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="visitors-section">
                  <div className="visitorlogs-header">
                    <div className="visitorlogs-title">
                      <i className="fas fa-car green-icon"></i>
                      <h3>Visitors</h3>
                    </div>
                    <button
                      onClick={() => setShowLogVisitorChoiceModal(true)}
                      className="register-button-home"
                    >
                      <i className="fas fa-user-plus"></i> Log Visitor
                    </button>
                  </div>

                  <table className="logs-table-dashboard">
                    <thead>
                      <tr>
                        <th>Time stamp</th>
                        <th>Name</th>
                        <th>Plate Number</th>
                        <th>Parking Slot</th>
                        <th>Activity</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visitorLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No visitor logs yet</td>
                        </tr>
                      ) : (
                        visitorLogs.map((log) => {
                          const { date, time } = formatTimeStamp(log.timestamp);
                          return (
                            <tr key={log.id}>
                              <td>
                                <div className="time-main">{date}</div>
                                <div className="time-sub">{time}</div>
                              </td>
                              <td>{log.name || "N/A"}</td>
                              <td>{log.plate_number || "-"}</td>
                              <td>
                                {log.parking_slot === "-"
                                  ? "Not Assigned"
                                  : log.parking_slot || "-"}
                              </td>
                              <td>
                                <span
                                  className={`activity-tag-dashboard ${
                                    log.action?.toLowerCase() === "entry"
                                      ? "entry"
                                      : "exit"
                                  }`}
                                >
                                  {log.action || "N/A"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="right-bento">
                <div className="recentactivity-header">
                  <div className="recentactivity-title">
                    <i className="fas fa-history green-icon"></i>
                    <h3>Recent Activities</h3>
                  </div>
                  <Link to="/reports" className="reports-button">
                    <i className="fas fa-chart-bar"></i> Reports
                  </Link>
                </div>

                <table className="logs-table-dashboard">
                  <thead>
                    <tr>
                      <th>Time stamp</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No activities yet</td>
                      </tr>
                    ) : (
                      recentActivityLogs.map((log) => {
                        const { date, time } = formatTimeStamp(log.timestamp);
                        return (
                          <tr key={log.id}>
                            <td>
                              <div className="time-main-dashboard">{date}</div>
                              <div className="time-sub">{time}</div>
                            </td>
                            <td>{log.name || "N/A"}</td>
                            <td>{log.type || "N/A"}</td>
                            <td>
                              <span
                                className={`activity-tag-dashboard ${
                                  log.action?.toLowerCase() === "entry"
                                    ? "entry"
                                    : "exit"
                                }`}
                              >
                                {log.action || "N/A"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Visitor Choice Modal */}
      {showLogVisitorChoiceModal && (
        <div className="home-modal-overlay">
          <div className="home-modal-content choice-modal">
            <div className="home-modal-header">
              <div className="home-modal-title">
                <i className="fas fa-user-plus green-icon"></i>
                <h2>Log New Visitor</h2>
              </div>
              <button
                className="home-close-button"
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
                  setShowVisitorModal(true);
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

      {/* Visitor Modal */}
      {showVisitorModal && (
        <div className="home-modal-overlay">
          <div className="home-modal-content">
            <div className="home-modal-header">
              <div className="home-modal-title">
                <button
                  className="home-back-button"
                  onClick={() => {
                    handleCloseFormModal();
                    setShowLogVisitorChoiceModal(true);
                  }}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <i className="fas fa-user-shield users-green"></i>
                <h2>Log Visitor</h2>
              </div>
              <button
                className="home-close-button"
                onClick={handleCloseFormModal}
              >
                ×
              </button>
            </div>

            {visitorError && <div className="form-error">{visitorError}</div>}
            {visitorSuccess && (
              <div className="form-success">{visitorSuccess}</div>
            )}

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
                    className={formErrors.first_name ? "error-input" : ""}
                  />
                  {formErrors.first_name && (
                    <div className="field-error">{formErrors.first_name}</div>
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
                    className={formErrors.last_name ? "error-input" : ""}
                  />
                  {formErrors.last_name && (
                    <div className="field-error">{formErrors.last_name}</div>
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
                    className={formErrors.drivers_license ? "error-input" : ""}
                  />
                  {formErrors.drivers_license && (
                    <div className="field-error">
                      {formErrors.drivers_license}
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
                    className={formErrors.plate_number ? "error-input" : ""}
                  />
                  {formErrors.plate_number && (
                    <div className="field-error">{formErrors.plate_number}</div>
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
                  className={formErrors.address ? "error-input" : ""}
                />
                {formErrors.address && (
                  <div className="field-error">{formErrors.address}</div>
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
                  className={formErrors.purpose ? "error-input" : ""}
                />
                {formErrors.purpose && (
                  <div className="field-error">{formErrors.purpose}</div>
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
                    {availableRfids.map((rfid) => (
                      <option key={rfid.id} value={rfid.id}>
                        {rfid.uid} - Temporary
                        {rfid.temporary_owner ? " (Assigned)" : ""}
                      </option>
                    ))}
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
                    {availableParkingSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.slot_number} ({slot.type}) -{" "}
                        {slot.location_display || slot.location}
                        {slot.temporary_owner ? " (Occupied)" : ""}
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
                    disabled={visitorLoading}
                  >
                    {visitorLoading ? (
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
                        rfid_id: "",
                        parking_slot_id: "",
                      });
                      setFormErrors({});
                    }}
                    disabled={visitorLoading}
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
        <div className="home-modal-overlay">
          <div className="home-modal-content choice-modal">
            <div className="home-modal-header">
              <div className="home-modal-title">
                <button
                  className="home-back-button"
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
                className="home-close-button"
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

export default Home;
