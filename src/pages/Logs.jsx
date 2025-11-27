"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import { API_ENDPOINTS, AUTH_ENDPOINTS, getAuthHeaders } from "../config/api";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Logs.css";
import BouncingSpinner from "../components/BouncingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListCheck } from "@fortawesome/free-solid-svg-icons";

const Logs = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 6;

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchLogs = async (token) => {
    const headers = getAuthHeaders(token);

    const [logsResponse, visitorsResponse] = await Promise.all([
      axios.get(API_ENDPOINTS.ACCESS_LOGS, { headers }),
      axios.get(API_ENDPOINTS.VISITORS, { headers }),
    ]);

    const processedLogs = logsResponse.data
      .map((log) => ({
        ...log,
        plate_number: log.plate_number || "-",
        parking_slot: log.parking?.slot_number || "-",
        type: log.type || log.user_type || "RESIDENT",
        name: log.name || "N/A",
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setLogs(processedLogs);
    setVisitors(visitorsResponse.data);
    setFilteredLogs(processedLogs);
  };

  const handleAuthError = async () => {
    try {
      const refreshResponse = await axios.post(AUTH_ENDPOINTS.REFRESH, {
        refresh: localStorage.getItem("refresh"),
      });

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
        setError("Please login to view logs");
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

    // Set up polling for real-time updates (every 5 seconds)
    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchData();
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  // Filter logs based on active tab and search term
  useEffect(() => {
    let filtered = logs;

    // Apply tab filter
    if (activeTab === "residents") {
      filtered = filtered.filter(
        (log) => log.type === "RESIDENT" || log.type === "Resident"
      );
    } else if (activeTab === "visitors") {
      filtered = filtered.filter(
        (log) => log.type === "VISITOR" || log.type === "Visitor"
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.name && log.name.toLowerCase().includes(searchLower)) ||
          (log.plate_number &&
            log.plate_number.toLowerCase().includes(searchLower)) ||
          (log.type && log.type.toLowerCase().includes(searchLower)) ||
          (log.action && log.action.toLowerCase().includes(searchLower)) ||
          (log.parking_slot &&
            log.parking_slot.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // reset to first page when filter changes
  }, [activeTab, logs, searchTerm]);

  // Get counts for each tab
  const getLogCounts = () => {
    const allCount = logs.length;
    const residentsCount = logs.filter(
      (log) => log.type === "RESIDENT" || log.type === "Resident"
    ).length;
    const visitorsCount = logs.filter(
      (log) => log.type === "VISITOR" || log.type === "Visitor"
    ).length;

    return { allCount, residentsCount, visitorsCount };
  };

  const { allCount, residentsCount, visitorsCount } = getLogCounts();

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
          <div className="logs-container">
            <div className="logs-header">
              <div className="logs-title">
                <FontAwesomeIcon icon={faListCheck} className="green-icon" />
                <h2>Access Logs</h2>
              </div>

              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                <i className="fas fa-search"></i>
              </div>

              <div className="logs-actions">
                <div className="tabs">
                  {[
                    { key: "all", label: "All", count: allCount },
                    {
                      key: "residents",
                      label: "Residents",
                      count: residentsCount,
                    },
                    {
                      key: "visitors",
                      label: "Visitors",
                      count: visitorsCount,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      className={`tab-button ${
                        activeTab === tab.key ? "active" : ""
                      }`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="no-data">
                {searchTerm
                  ? "No logs found matching your search"
                  : "No logs found"}
              </div>
            ) : (
              <>
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Time Stamp</th>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Plate Number</th>
                      <th>Activity</th>
                      <th>Parking Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => {
                      const { date, time } = formatTimeStamp(log.timestamp);
                      return (
                        <tr key={log.id} className="clickable-row">
                          <td>
                            <div className="time-main">{date}</div>
                            <div className="time-sub">{time}</div>
                          </td>
                          <td>{log.type}</td>
                          <td>{log.name}</td>
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
                  <span className="logs-count">{filteredLogs.length} logs</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
