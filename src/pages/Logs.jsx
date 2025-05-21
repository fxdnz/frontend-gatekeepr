"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Logs.css";
import LoadingSpinner from "../components/BouncingSpinner";

const Logs = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [filteredLogs, setFilteredLogs] = useState([]);

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchLogs = async (token) => {
    const headers = {
      Authorization: `JWT ${token}`,
      "Content-Type": "application/json",
    };

    const [logsResponse, visitorsResponse] = await Promise.all([
      axios.get(`https://gatekeepr-backend.onrender.com/api/v1/access-logs/`, {
        headers,
      }),
      axios.get(`https://gatekeepr-backend.onrender.com/api/v1/visitors/`, {
        headers,
      }),
    ]);

    const processedLogs = logsResponse.data
      .map((log) => ({
        ...log,
        plate_number: log.plate_number || "-",
        parking_slot: log.parking?.slot_number || "-",
        type: log.type || log.user_type || "RESIDENT",
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // most recent first

    setLogs(processedLogs);
    setVisitors(visitorsResponse.data);
    setFilteredLogs(processedLogs);
  };

  const handleAuthError = async () => {
    try {
      const refreshResponse = await axios.post(
        `https://gatekeepr-backend.onrender.com/auth/jwt/refresh/`,
        {
          refresh: localStorage.getItem("refresh"),
        }
      );

      localStorage.setItem("access", refreshResponse.data.access);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: refreshResponse.data,
      });

      await fetchLogs(refreshResponse.data.access);
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError);
      dispatch({ type: "LOGIN_FAIL" });
      setError("Session expired. Please login again.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setError("Please login to view access logs");
        setLoading(false);
        return;
      }

      try {
        await fetchLogs(access);
      } catch (err) {
        if (err.response?.status === 401) {
          await handleAuthError();
        } else if (err.response?.status === 500) {
          setError("Server error while fetching data. Please try again later.");
        } else if (err.request) {
          setError("No response from server. Please check your network.");
        } else {
          setError(err.message || "An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up polling for real-time updates (every 10 seconds)
    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchData();
      }
    }, 5000); // 5 seconds

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  useEffect(() => {
    if (activeTab === "all") {
      setFilteredLogs(logs);
    } else if (activeTab === "residents") {
      setFilteredLogs(
        logs.filter((log) => log.type === "RESIDENT" || log.type === "Resident")
      );
    } else if (activeTab === "visitors") {
      setFilteredLogs(
        logs.filter((log) => log.type === "VISITOR" || log.type === "Visitor")
      );
    }
  }, [activeTab, logs]);

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

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view logs</h2>
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
        <Header title="Logs" />
        <div className="dashboard-main no-top-padding">
          <div className="detailed-activities">
            <div className="detailed-activities-header">
              <div className="detailed-title">
                <img
                  src="/recent-green.png"
                  className="detailed-act-logo"
                  alt="Logo"
                />
                <h2>Detailed Activities</h2>
              </div>

              <div className="tabs">
                {["all", "residents", "visitors"].map((tab) => (
                  <button
                    key={tab}
                    className={`tab-button ${
                      activeTab === tab ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="no-data">No logs found</div>
            ) : (
              <table className="logs-table">
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
                  {filteredLogs.map((log) => {
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
