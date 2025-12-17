"use client";

import { useEffect, useState, useRef } from "react";
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
  const logsPerPage = 5;

  // Use refs to store previous data to prevent flickering
  const visitorsRef = useRef([]);
  const logsRef = useRef([]);
  const visitorParkingMapRef = useRef({});

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchAllData = async (token) => {
    const headers = getAuthHeaders(token);

    try {
      // Fetch both access logs and visitors
      const [logsResponse, visitorsResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.ACCESS_LOGS, { headers }),
        axios.get(API_ENDPOINTS.VISITORS, { headers }),
      ]);

      // Create a map of visitor IDs to their parking slot details
      const newVisitorParkingMap = {};
      visitorsResponse.data.forEach((visitor) => {
        if (visitor.parking_slot_details) {
          newVisitorParkingMap[visitor.id] =
            visitor.parking_slot_details.slot_number || "-";
        }
      });

      // Update refs with new data
      visitorParkingMapRef.current = newVisitorParkingMap;
      visitorsRef.current = visitorsResponse.data;

      // Process logs to extract information
      const processedLogs = logsResponse.data.map((log) => {
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
            if (newVisitorParkingMap[visitorId]) {
              parkingSlot = newVisitorParkingMap[visitorId];
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
          if (newVisitorParkingMap[visitorId]) {
            parkingSlot = newVisitorParkingMap[visitorId];
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
      const sortedLogs = processedLogs.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Update ref and state
      logsRef.current = sortedLogs;
      setLogs(sortedLogs);
      setVisitors(visitorsResponse.data);
      setFilteredLogs(sortedLogs);
    } catch (error) {
      console.error("Error in fetchAllData:", error);
      throw error;
    }
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

      await fetchAllData(refreshResponse.data.access);
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
        await fetchAllData(access);
      } catch (err) {
        console.error("Fetch error:", err);
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

  // Filter logs based on active tab and search term - using refs to prevent flickering
  useEffect(() => {
    let filtered = logs;

    // Apply tab filter
    if (activeTab === "residents") {
      filtered = filtered.filter((log) => log.type === "RESIDENT");
    } else if (activeTab === "visitors") {
      filtered = filtered.filter((log) => log.type === "VISITOR");
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

  // Get counts for each tab - using current logs state
  const getLogCounts = () => {
    const allCount = logs.length;
    const residentsCount = logs.filter((log) => log.type === "RESIDENT").length;
    const visitorsCount = logs.filter((log) => log.type === "VISITOR").length;

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
    if (!timestamp) {
      return { date: "N/A", time: "N/A" };
    }

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return { date: "Invalid Date", time: "Invalid Time" };
      }

      return {
        date: date.toISOString().split("T")[0],
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      };
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return { date: "Error", time: "Error" };
    }
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
                          <td>{log.type || "N/A"}</td>
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
                              {log.action || "N/A"}
                            </span>
                          </td>
                          <td>
                            {log.parking_slot === "-"
                              ? "Not Assigned"
                              : log.parking_slot || "-"}
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
