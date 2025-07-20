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

// Hardcoded Gemini API key (NOT RECOMMENDED FOR PRODUCTION)
const GEMINI_API_KEY = 'AIzaSyAhFjdWTmnlrR-Zx86MrqKESnAcvSzjeGw';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
        const response = await axios.get(
          `https://gatekeepr-backend.onrender.com/api/v1/access-logs/`,
          {
            headers: {
              Authorization: `JWT ${access}`,
              "Content-Type": "application/json",
            },
          }
        );

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
      await axios.post(
        "https://gatekeepr-backend.onrender.com/api/v1/visitors/",
        visitorForm,
        {
          headers: {
            Authorization: `JWT ${access}`,
            "Content-Type": "application/json",
          },
        }
      );

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
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  };

  const extractDriverLicenseInfo = async (base64Image, mimeType) => {
    const prompt = 'Extract the following information from this Philippine driver\'s license image: last_name, first_name, middle_name, sex, home_address, license_number. Return the response in JSON format.';

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(payload)
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
      return { error: 'No recognizable content from Gemini API.' };
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
        if (!licenseFile.type.startsWith('image/')) {
          throw new Error('Please upload an image file (e.g., JPG, PNG).');
        }
        base64Image = await convertImageToBase64(licenseFile);
        mimeType = licenseFile.type;
      } else if (webcamActive && webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) {
          throw new Error('Failed to capture webcam image.');
        }
        base64Image = screenshot.split(',')[1];
        mimeType = 'image/jpeg';
      }

      const extracted = await extractDriverLicenseInfo(base64Image, mimeType);
      console.log('Extracted Data Set:', extracted); // Debug log
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

    const fullName = extractedData && extractedData.first_name
      ? [extractedData.first_name, extractedData.middle_name, extractedData.last_name].filter(Boolean).join(' ')
      : 'Unknown';

    const visitorData = {
      name: fullName,
      drivers_license: extractedData?.license_number || '',
      address: extractedData?.home_address || '',
      plate_number: idForm.plate_number || '',
      purpose: idForm.purpose
    };

    let response;
    try {
      response = await axios.post(
        "https://gatekeepr-backend.onrender.com/api/v1/visitors/",
        visitorData,
        {
          headers: {
            Authorization: `JWT ${access}`,
            "Content-Type": "application/json",
          },
        }
      );
      setIdSuccess("Visitor registered successfully.");
      setLicenseFile(null);
      setExtractedData({});
      setIdForm({ plate_number: "", purpose: "" });
      setWebcamActive(false);
    } catch (error) {
      setIdError(`Failed to register visitor: ${error.message || 'Unknown error'}`);
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
    facingMode: "environment"
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
      navigator.mediaDevices.getUserMedia({ video: videoConstraints })
        .then(() => {
          // Webcam access successful - no need to do anything as setWebcamActive(true) already handled
          console.log("Webcam access granted");
        })
        .catch(err => {
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
        <div className="dashboard-main no-top-padding">
          <div className="recent-activities">
            <div className="recent-activities-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
                <img src="/recent-green.png" className="recent-act-logo" alt="Logo" />
                <h2>Recent Activities</h2>
              </div>
              <div className="header-buttons">
                <button className="register-button" onClick={() => setShowVisitorModal(true)}>
                  <i className="fas fa-user-plus"></i> Log Visitor
                </button>
                <button className="verify-id-button" onClick={() => setShowIDVerificationModal(true)}>
                  <i className="fas fa-id-card"></i> Verify ID
                </button>
              </div>
            </div>

            {loading ? (
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
                          <span className={`activity-tag ${log.action?.toLowerCase() === "entry" ? "entry" : "exit"}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.parking_slot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
              <button className="close-button" onClick={() => setShowVisitorModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            {visitorError && <div className="form-error">{visitorError}</div>}
            {visitorSuccess && <div className="form-success">{visitorSuccess}</div>}
            <form onSubmit={handleVisitorSubmit}>
              {["name", "drivers_license", "address", "plate_number", "purpose"].map((field) => (
                <div className="form-group" key={field}>
                  <label htmlFor={field}>
                    {field.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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
                <button type="submit" className="submit-button" disabled={visitorLoading}>
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
              <button className="close-button" onClick={() => setShowIDVerificationModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            {idError && <div className="form-error">{idError}</div>}
            {idSuccess && <div className="form-success">{idSuccess}</div>}
            <div className="id-verification-content">
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '10px' }}>
              <button
                type="button"
                className="register-button"
                onClick={() => document.getElementById('licenseFile').click()}
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
                <i className="fas fa-camera"></i> {webcamActive ? "Stop Webcam" : "Start Webcam"}
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
                    src={URL.createObjectURL(licenseFile)}
                    alt="License Preview"
                    className="image-preview"
                  />
                  <div className="image-info">
                    <strong>File:</strong> {licenseFile.name} ({(licenseFile.size / 1024).toFixed(1)} KB)
                  </div>
                </div>
              </div>
            )}
            
            {licenseFile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
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
                  style={{ width: '100%', marginTop: '10px', border: '2px solid #ccc', borderRadius: '4px' }}
                />
                <div className="capture-button-container">
                  <button
                    type="button"
                    className="capture-process-button"
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
                      "Capture and Process"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
              {extractedData && Object.keys(extractedData).length > 0 && (
                <div>
                  <div className="extracted-data">
                    <h3>ID Information</h3>
                    {extractedData.error ? (
                      <p className="error">{extractedData.error}</p>
                    ) : (
                      <>
                        <p><strong>Name:</strong> {[extractedData.first_name, extractedData.middle_name, extractedData.last_name].filter(Boolean).join(' ')}</p>
                        <p><strong>Driver's License:</strong> {extractedData.license_number || 'N/A'}</p>
                        <p><strong>Address:</strong> {extractedData.home_address || 'N/A'}</p>
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
                      <button type="submit" className="submit-button" disabled={idLoading}>
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