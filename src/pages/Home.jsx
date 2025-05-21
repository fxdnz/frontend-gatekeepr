"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Home.css";

const Home = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showVisitorModal, setShowVisitorModal] = useState(false); // Modal toggle
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    drivers_license: "",
    address: "",
    plate_number: "",
    purpose: "",
  });
  const [visitorError, setVisitorError] = useState("");
  const [visitorSuccess, setVisitorSuccess] = useState("");

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
        setLogs(response.data);
      } catch (err) {
        setError("Failed to fetch logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccessLogs();
  }, [access, isAuthenticated, dispatch]);

  const handleVisitorInputChange = (e) => {
    const { name, value } = e.target;
    setVisitorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    setVisitorError("");
    setVisitorSuccess("");

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
    }
  };

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
            <div
              className="recent-activities-header"
              style={{ justifyContent: "space-between" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <img
                  src="/recent-green.png"
                  className="recent-act-logo"
                  alt="Logo"
                />
                <h2>Recent Activities</h2>
              </div>
              <button
                className="register-button"
                onClick={() => setShowVisitorModal(true)}
              >
                <i className="fas fa-user-plus"></i> Log Visitor
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading access logs...</div>
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
                  {[...logs]
                    .sort(
                      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                    )
                    .map((log) => {
                      const date = new Date(log.timestamp);
                      const formattedDate = date.toISOString().split("T")[0];
                      const formattedTime = date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      });

                      return (
                        <tr key={log.id}>
                          <td>
                            <div className="time-main">{formattedDate}</div>
                            <div className="time-sub">{formattedTime}</div>
                          </td>
                          <td>{log.user_type || "RESIDENT"}</td>
                          <td>{log.name || "N/A"}</td>
                          <td>{log.plate_number || "-"}</td>
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
                          <td>{log.parking?.slot_number || "-"}</td>
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
                <button type="submit" className="submit-button">
                  Submit
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
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
