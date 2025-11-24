/* eslint-disable no-unused-vars */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Home.css";
import BouncingSpinner from "../components/BouncingSpinner";
import Webcam from "react-webcam";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

// Hardcoded Gemini API key (NOT RECOMMENDED FOR PRODUCTION)
const GEMINI_API_KEY = "AIzaSyAhFjdWTmnlrR-Zx86MrqKESnAcvSzjeGw";
const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const Home = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    drivers_license: "",
    address: "",
    plate_number: "",
    purpose: "",
  });
  const [visitorError, setVisitorError] = useState("");
  const [visitorSuccess, setVisitorSuccess] = useState("");
  const [visitorLoading, setVisitorLoading] = useState(false);

  const [showIDVerificationModal, setShowIDVerificationModal] = useState(false);
  const [licenseFile, setLicenseFile] = useState(null);
  const [extractedData, setExtractedData] = useState({});
  const [idForm, setIdForm] = useState({ plate_number: "", purpose: "" });
  const [idError, setIdError] = useState("");
  const [idSuccess, setIdSuccess] = useState("");
  const [idLoading, setIdLoading] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  useEffect(() => {
    const fetchAccessLogs = async () => {
      if (!isAuthenticated) {
        setError("Please login to view access logs");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(API_ENDPOINTS.ACCESS_LOGS, {
          headers: getAuthHeaders(access),
        });

        const processedLogs = response.data
          .map((log) => ({
            ...log,
            plate_number: log.plate_number || "-",
            parking_slot: log.parking?.slot_number || "-",
            type: log.type || log.user_type || "RESIDENT",
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setLogs(processedLogs);
      } catch (err) {
        setError("Failed to fetch logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccessLogs();
    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchAccessLogs();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  const handleVisitorInputChange = (e) => {
    const { name, value } = e.target;
    setVisitorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    setVisitorError("");
    setVisitorSuccess("");
    setVisitorLoading(true);

    try {
      await axios.post(API_ENDPOINTS.VISITORS, visitorForm, {
        headers: getAuthHeaders(access),
      });

      setVisitorSuccess("Visitor logged successfully.");
      setVisitorForm({
        name: "",
        drivers_license: "",
        address: "",
        plate_number: "",
        purpose: "",
      });

      setTimeout(() => {
        setShowVisitorModal(false);
        setVisitorSuccess("");
      }, 2000);
    } catch (error) {
      setVisitorError("Failed to log visitor.");
    } finally {
      setVisitorLoading(false);
    }
  };

  const formatTimeStamp = (timestamp) => {
    const date = new Date(timestamp);
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

  // ID Verification Functions
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  };

  const extractDriverLicenseInfo = async (base64Image, mimeType) => {
    const prompt =
      "Extract the following information from this Philippine driver's license image: last_name, first_name, middle_name, sex, home_address, license_number. Return the response in JSON format.";

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

    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const textResponse = data.candidates[0].content.parts[0].text.trim();
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
      return jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(textResponse);
    } else {
      return { error: "No recognizable content from Gemini API." };
    }
  };

  const handleProcessLicense = async () => {
    if (!licenseFile && !webcamActive) {
      setIdError("Please select a driver's license image or enable webcam.");
      return;
    }

    setIdError("");
    setIdSuccess("");
    setIdLoading(true);

    try {
      let base64Image, mimeType;
      if (licenseFile) {
        if (!licenseFile.type.startsWith("image/")) {
          throw new Error("Please upload an image file (e.g., JPG, PNG).");
        }
        base64Image = await convertImageToBase64(licenseFile);
        mimeType = licenseFile.type;
      } else if (webcamActive && webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) {
          throw new Error("Failed to capture webcam image.");
        }
        base64Image = screenshot.split(",")[1];
        mimeType = "image/jpeg";
      }

      const extracted = await extractDriverLicenseInfo(base64Image, mimeType);
      console.log("Extracted Data Set:", extracted); // Debug log
      setExtractedData(extracted || {});
      setIdForm({ plate_number: "", purpose: "" });
    } catch (error) {
      setIdError(`Failed to process license: ${error.message}`);
    } finally {
      setIdLoading(false);
    }
  };

  const handleIdFormChange = (e) => {
    const { name, value } = e.target;
    setIdForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!idForm.purpose) {
      setIdError("Please fill in the purpose field.");
      return;
    }

    setIdError("");
    setIdSuccess("");
    setIdLoading(true);

    if (!access) {
      setIdError("Authentication token is missing. Please log in again.");
      setIdLoading(false);
      return;
    }

    const fullName =
      extractedData && extractedData.first_name
        ? [
            extractedData.first_name,
            extractedData.middle_name,
            extractedData.last_name,
          ]
            .filter(Boolean)
            .join(" ")
        : "Unknown";

    const visitorData = {
      name: fullName,
      drivers_license: extractedData?.license_number || "",
      address: extractedData?.home_address || "",
      plate_number: idForm.plate_number || "",
      purpose: idForm.purpose,
    };

    let response;
    try {
      response = await axios.post(API_ENDPOINTS.VISITORS, visitorData, {
        headers: getAuthHeaders(access),
      });
      setIdSuccess("Visitor registered successfully.");
      setLicenseFile(null);
      setExtractedData({});
      setIdForm({ plate_number: "", purpose: "" });
      setWebcamActive(false);
    } catch (error) {
      setIdError(
        `Failed to register visitor: ${error.message || "Unknown error"}`
      );
    }

    if (response) {
      setTimeout(() => {
        setShowIDVerificationModal(false);
        setIdSuccess("");
      }, 2000);
    }
    setIdLoading(false);
  };

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment",
  };

  const toggleWebcam = useCallback(() => {
    if (webcamActive) {
      // If webcam is currently active, turn it off
      setWebcamActive(false);
      setIdError(""); // Clear any previous errors
    } else {
      // If webcam is not active, turn it on
      setWebcamActive(true);
      setIdError(""); // Clear any previous errors

      // Optional: Test webcam access when turning it on
      navigator.mediaDevices
        .getUserMedia({ video: videoConstraints })
        .then(() => {
          // Webcam access successful - no need to do anything as setWebcamActive(true) already handled
          console.log("Webcam access granted");
        })
        .catch((err) => {
          console.error("Webcam access failed:", err);
          setIdError("Failed to access webcam: " + err.message);
          setWebcamActive(false); // Turn off webcam state if access fails
        });
    }
  }, [webcamActive, videoConstraints]);

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view the dashboard</h2>
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
        <div className="dashboard-main">
          <div className="recent-activities">
            {/* <div className="recent-activities-header">
              <div className="recent-activities-title">
                <i className="fas fa-history green-icon"></i>
                <h2>Recent Activities</h2>
              </div>
              <div className="header-buttons">
                <button
                  className="register-button"
                  onClick={() => setShowVisitorModal(true)}
                >
                  <i className="fas fa-user-plus"></i> Log Visitor
                </button>
                <button
                  className="verify-id-button"
                  onClick={() => setShowIDVerificationModal(true)}
                >
                  <i className="fas fa-id-card"></i> Verify ID
                </button>
              </div>
            </div> */}
            <div
              className="bentobox-container"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              <div
                className="left-bento"
                style={{
                  flex: 1.5,
                  margin: "10px",
                  marginRight: "0px",
                  marginLeft: "0px",
                  borderRadius: "8px",

                  display: "flex", // ➜ added
                  flexDirection: "column", // ➜ added
                }}
              >
                <div
                  className="statcard-container"
                  style={{
                    flex: 1,
                    margin: "0 20px 0px 20px",
                    borderRadius: "8px",
                    display: "flex", // ➜ horizontal layout
                    gap: "15px", // ➜ space between cards
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: "#2A2A2A",
                      borderRadius: "8px",
                      display: "flex", // ➜ added
                      flexDirection: "column", // ➜ added
                    }}
                  >
                    <div
                      className="stat-header"
                      style={{
                        display: "flex",
                        flex: 1,
                        margin: "10px 15px 5px 15px",
                        alignItems: "center",
                        alignContent: "center",
                      }}
                    >
                      <i
                        className="fa fa-xs fa-square green-icon"
                        style={{ margin: 0, padding: 0, paddingRight: "10px" }}
                      ></i>

                      {/* Title */}
                      <span style={{ fontSize: "12px" }}>VEHICLES PARKED</span>
                    </div>
                    <div
                      className="stat-body"
                      style={{
                        flex: 4,
                        backgroundColor: "#424242",
                        margin: "0px 15px 15px 15px",
                        borderRadius: "2px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          padding: "10px",
                          flex: 2,
                          flexDirection: "column",
                          marginLeft: "10px",
                        }}
                      >
                        <span style={{ fontSize: "50px", fontWeight: "bold" }}>
                          46{" "}
                          {/* This should be the number of occupied parking in parking */}
                        </span>
                        <span style={{ fontSize: "12px" }}>
                          Parking Occupied
                        </span>
                      </div>
                      <div
                        className="animation-container"
                        style={{
                          flex: 1,
                          backgroundColor: "#424242",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div className="scrolling-lines-1">
                          <div className="line"></div>
                          <div className="line"></div>
                          <div className="line"></div>
                        </div>

                        <style>{`
                          .scrolling-lines-1 {
                            display: flex;
                            flex-direction: column;
                            gap: 20px;
                            position: absolute;
                            top: 0;
                            animation: scrollLines-1 3s linear infinite;
                          }

                          .line {
                            width: 20px;      /* fixed width */
                            height: 40px;     /* fixed height */
                            background-color: red;
                            border-radius: 2px;
                          }

                          @keyframes scrollLines-1 {
                            0% {
                              transform: translateY(-60px);
                            }
                            100% {
                              transform: translateY(); /* scroll up by height + gap */
                            }
                          }
                        `}</style>
                      </div>
                    </div>
                  </div>

                  {/* --- Stat Card 2 --- */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: "#2A2A2A",
                      borderRadius: "8px",
                      display: "flex", // ➜ added
                      flexDirection: "column", // ➜ added
                    }}
                  >
                    <div
                      className="stat-header"
                      style={{
                        display: "flex",
                        flex: 1,
                        margin: "10px 15px 5px 15px",
                        alignItems: "center",
                        alignContent: "center",
                      }}
                    >
                      <i
                        className="fa fa-xs fa-square green-icon"
                        style={{ margin: 0, padding: 0, paddingRight: "10px" }}
                      ></i>

                      {/* Title */}
                      <span style={{ fontSize: "12px" }}>RESIDENT PARKING</span>
                    </div>
                    <div
                      className="stat-body"
                      style={{
                        flex: 4,
                        backgroundColor: "#424242",
                        margin: "0px 15px 15px 15px",
                        borderRadius: "2px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          padding: "10px",
                          flex: 2,
                          flexDirection: "column",
                          marginLeft: "10px",
                        }}
                      >
                        <span style={{ fontSize: "50px", fontWeight: "bold" }}>
                          46{" "}
                          {/* This should be the number of available parking that is not free parking */}
                        </span>
                        <span style={{ fontSize: "12px" }}>
                          Available Parking
                        </span>
                      </div>
                      <div
                        className="animation-container"
                        style={{
                          flex: 1,
                          backgroundColor: "#424242",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
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

                        <style>{`
                          .scrolling-lines {
                            display: flex;
                            flex-direction: column;
                            gap: 20px;
                            position: absolute;
                            top: 0;
                            animation: scrollLines-2 3s linear infinite;
                          }

                          .line {
                            width: 20px;      /* fixed width */
                            height: 40px;     /* fixed height */
                            background-color: green;
                            border-radius: 2px;
                          }

                          @keyframes scrollLines-2 {
                            0% {
                              transform: translateY(0);
                            }
                            100% {
                              transform: translateY(-60px); /* scroll up by height + gap */
                            }
                          }
                        `}</style>
                      </div>
                    </div>
                  </div>

                  {/* --- Stat Card 3 --- */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: "#2A2A2A",
                      borderRadius: "8px",
                      display: "flex", // ➜ added
                      flexDirection: "column", // ➜ added
                    }}
                  >
                    <div
                      className="stat-header"
                      style={{
                        display: "flex",
                        flex: 1,
                        margin: "10px 15px 5px 15px",
                        alignItems: "center",
                        alignContent: "center",
                      }}
                    >
                      <i
                        className="fa fa-xs fa-square green-icon"
                        style={{ margin: 0, padding: 0, paddingRight: "10px" }}
                      ></i>

                      {/* Title */}
                      <span style={{ fontSize: "12px" }}>VISITOR PARKING</span>
                    </div>
                    <div
                      className="stat-body"
                      style={{
                        flex: 4,
                        backgroundColor: "#424242",
                        margin: "0px 15px 15px 15px",
                        borderRadius: "2px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          padding: "10px",
                          flex: 2,
                          flexDirection: "column",
                          marginLeft: "10px",
                        }}
                      >
                        <span style={{ fontSize: "50px", fontWeight: "bold" }}>
                          46{" "}
                          {/* This should be the number of available free parking */}
                        </span>
                        <span style={{ fontSize: "12px" }}>Free Parking</span>
                      </div>
                      <div
                        className="animation-container"
                        style={{
                          flex: 1,
                          backgroundColor: "#424242",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
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

                        <style>{`
                          .scrolling-lines-3 {
                            display: flex;
                            flex-direction: column;
                            gap: 20px;
                            position: absolute;
                            top: 0;
                            animation: scrollLines 3s linear infinite;
                          }

                          .line {
                            width: 20px;      /* fixed width */
                            height: 40px;     /* fixed height */
                            background-color: red;
                            border-radius: 2px;
                          }

                          @keyframes scrollLines {
                            0% {
                              transform: translateY(-60px);
                            }
                            100% {
                              transform: translateY(); /* scroll up by height + gap */
                            }
                          }
                        `}</style>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="visitorlogs-container"
                  style={{
                    backgroundColor: "#2A2A2A",
                    flex: 2.5,
                    margin: "20px",
                    marginBottom: "2px",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    className="visitorlogs-header"
                    style={{
                      backgroundColor: "red",
                      flex: 1,
                      display: "flex",
                    }}
                  >
                    {/*this should contain the icon and title for visitor logs and the button to log visitor - now i when button clicked i want to make a another modal for it that the user can choose if manual log or ocr, then just use the modals here for manual log and ocr to open*/}
                  </div>
                  <div
                    className="visitorlogs-body"
                    style={{ backgroundColor: "white", flex: 5.5 }}
                  >
                    {/*this will contain the visitor logs include only timestamp, name, plate number, parking slot, activity (entry or exit) - only list the recent 4 visitor logs for the table*/}
                  </div>
                </div>
              </div>

              <div
                className="right-bento"
                style={{
                  backgroundColor: "#2A2A2A",
                  flex: 1,
                  margin: "10px",
                  marginLeft: "0px",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className="recentactivity-header"
                  style={{
                    backgroundColor: "red",
                    flex: 1,
                    display: "flex",
                  }}
                >
                  {/*this should contain the icon, title, and the button for generating report, generate report the we generate report from report.jsx but i want the background always be white*/}
                </div>
                <div
                  className="recentactivity-body"
                  style={{ backgroundColor: "white", flex: 8 }}
                >
                  {/*this will contain the all logs include only timestamp, name, type(resident/visitor), activity (entry/exit) - only list the recent 9 logs for the table*/}
                </div>
              </div>
            </div>

            {/* {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : logs.length === 0 ? (
              <div className="no-data">No access logs found</div>
            ) : (
              <table className="activities-table">
                <thead>
                  <tr>
                    <th>Time stamp</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Plate Number</th>
                    <th>Activity</th>
                    <th>Parking Slot</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const { date, time } = formatTimeStamp(log.timestamp);
                    return (
                      <tr key={log.id}>
                        <td>
                          <div className="time-main">{date}</div>
                          <div className="time-sub">{time}</div>
                        </td>
                        <td>{log.type}</td>
                        <td>{log.name || "N/A"}</td>
                        <td>{log.plate_number}</td>
                        <td>
                          <span
                            className={`activity-tag ${
                              log.action?.toLowerCase() === "entry"
                                ? "entry"
                                : "exit"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td>{log.parking_slot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )} */}
          </div>
        </div>
      </div>

      {showVisitorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-user-shield users-green"></i>
                <h2>Log Visitor</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setShowVisitorModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            {visitorError && <div className="form-error">{visitorError}</div>}
            {visitorSuccess && (
              <div className="form-success">{visitorSuccess}</div>
            )}
            <form onSubmit={handleVisitorSubmit}>
              {[
                "name",
                "drivers_license",
                "address",
                "plate_number",
                "purpose",
              ].map((field) => (
                <div className="form-group" key={field}>
                  <label htmlFor={field}>
                    {field
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                  <input
                    type="text"
                    id={field}
                    name={field}
                    value={visitorForm[field]}
                    onChange={handleVisitorInputChange}
                    placeholder={`Enter ${field.replace("_", " ")}`}
                    required
                  />
                </div>
              ))}
              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-button"
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
                  className="clear-button"
                  onClick={() =>
                    setVisitorForm({
                      name: "",
                      drivers_license: "",
                      address: "",
                      plate_number: "",
                      purpose: "",
                    })
                  }
                  disabled={visitorLoading}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showIDVerificationModal && (
        <div className="modal-overlay">
          <div className="modal-content id-verification-modal">
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-id-card users-green"></i>
                <h2>Verify ID</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setShowIDVerificationModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            {idError && <div className="form-error">{idError}</div>}
            {idSuccess && <div className="form-success">{idSuccess}</div>}
            <div className="id-verification-content">
              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <button
                    type="button"
                    className="register-button"
                    onClick={() =>
                      document.getElementById("licenseFile").click()
                    }
                    disabled={idLoading}
                  >
                    <i className="fas fa-upload"></i> Choose File
                  </button>
                  <button
                    type="button"
                    className="register-button"
                    onClick={toggleWebcam}
                    disabled={idLoading}
                  >
                    <i className="fas fa-camera"></i>{" "}
                    {webcamActive ? "Stop Webcam" : "Start Webcam"}
                  </button>
                </div>
                <input
                  type="file"
                  id="licenseFile"
                  accept="image/*"
                  onChange={(e) => setLicenseFile(e.target.files[0])}
                  className="hidden-file-input"
                />

                {/* Image Preview Section */}
                {licenseFile && (
                  <div className="image-preview-container">
                    <div>
                      <img
                        src={
                          URL.createObjectURL(licenseFile) || "/placeholder.svg"
                        }
                        alt="License Preview"
                        className="image-preview"
                      />
                      <div className="image-info">
                        <strong>File:</strong> {licenseFile.name} (
                        {(licenseFile.size / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                  </div>
                )}

                {licenseFile && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      type="button"
                      className="register-button process-license-button"
                      onClick={handleProcessLicense}
                      disabled={idLoading}
                    >
                      {idLoading ? (
                        <div className="spinner white">
                          <div className="bounce1"></div>
                          <div className="bounce2"></div>
                          <div className="bounce3"></div>
                        </div>
                      ) : (
                        "Process License"
                      )}
                    </button>
                  </div>
                )}

                {webcamActive && (
                  <div>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        border: "2px solid #ccc",
                        borderRadius: "4px",
                      }}
                    />
                    <div className="capture-button-container">
                      <button
                        type="button"
                        className="capture-process-button"
                        onClick={handleProcessLicense}
                        disabled={idLoading}
                      >
                        {idLoading ? (
                          <span className="btn-loading">
                            <span className="btn-spinner">
                              <span className="bounce1"></span>
                              <span className="bounce2"></span>
                              <span className="bounce3"></span>
                            </span>
                            Capturing...
                          </span>
                        ) : (
                          "Capture and Process"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {extractedData && Object.keys(extractedData).length > 0 && (
                <div className="extracted-data-scrollable">
                  <div className="extracted-data">
                    <h3>ID Information</h3>
                    {extractedData.error ? (
                      <p className="error">{extractedData.error}</p>
                    ) : (
                      <>
                        <p>
                          <strong>Name:</strong>{" "}
                          {[
                            extractedData.first_name,
                            extractedData.middle_name,
                            extractedData.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        <p>
                          <strong>Driver's License:</strong>{" "}
                          {extractedData.license_number || "N/A"}
                        </p>
                        <p>
                          <strong>Address:</strong>{" "}
                          {extractedData.home_address || "N/A"}
                        </p>
                      </>
                    )}
                  </div>
                  <form onSubmit={handleIdSubmit}>
                    <div className="form-group">
                      <label htmlFor="plate_number">Plate Number</label>
                      <input
                        type="text"
                        id="plate_number"
                        name="plate_number"
                        value={idForm.plate_number}
                        onChange={handleIdFormChange}
                        placeholder="e.g., ABC 1234"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="purpose">Purpose</label>
                      <input
                        type="text"
                        id="purpose"
                        name="purpose"
                        value={idForm.purpose}
                        onChange={handleIdFormChange}
                        placeholder="e.g., Delivery, Meeting"
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="submit-button"
                        disabled={idLoading}
                      >
                        {idLoading ? (
                          <div className="spinner white">
                            <div className="bounce1"></div>
                            <div className="bounce2"></div>
                            <div className="bounce3"></div>
                          </div>
                        ) : (
                          "Register Visitor"
                        )}
                      </button>
                      <button
                        type="button"
                        className="clear-button"
                        onClick={() => {
                          setLicenseFile(null);
                          setExtractedData({});
                          setIdForm({ plate_number: "", purpose: "" });
                          setWebcamActive(false);
                        }}
                        disabled={idLoading}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
