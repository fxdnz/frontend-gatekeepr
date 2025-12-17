// Report.jsx - Updated with Logs.jsx working logic
"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { API_ENDPOINTS } from "../config/api";
import "./Report.css";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import BouncingSpinner from "../components/BouncingSpinner";

const loadExternalScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });

const Report = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const [logs, setLogs] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Use refs to store data like in Logs.jsx
  const visitorsRef = useRef([]);
  const logsRef = useRef([]);
  const visitorParkingMapRef = useRef({});

  const reportRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return setError("Please login to view reports");

      setLoading(true);
      setError(null);

      try {
        const headers = {
          headers: {
            Authorization: `JWT ${access}`,
            "Content-Type": "application/json",
          },
        };

        const [logsRes, visitorsRes] = await Promise.all([
          axios.get(API_ENDPOINTS.ACCESS_LOGS, headers),
          axios.get(API_ENDPOINTS.VISITORS, headers),
        ]);

        // Create a map of visitor IDs to their parking slot details (from Logs.jsx)
        const newVisitorParkingMap = {};
        visitorsRes.data.forEach((visitor) => {
          if (visitor.parking_slot_details) {
            newVisitorParkingMap[visitor.id] =
              visitor.parking_slot_details.slot_number || "-";
          }
        });

        // Update refs with new data (from Logs.jsx)
        visitorParkingMapRef.current = newVisitorParkingMap;
        visitorsRef.current = visitorsRes.data;

        // Process logs to extract information (from Logs.jsx)
        const processedLogs = logsRes.data.map((log) => {
          let name = "N/A";
          let plateNumber = "-";
          let parkingSlot = "-";
          let first_name = "";
          let last_name = "";

          // Extract information based on type (from Logs.jsx)
          if (log.type === "RESIDENT" && log.resident_details) {
            // Get name from resident_details
            name =
              log.resident_details.name ||
              `${log.resident_details.first_name || ""} ${
                log.resident_details.last_name || ""
              }`.trim() ||
              "Resident";

            first_name = log.resident_details.first_name || "";
            last_name = log.resident_details.last_name || "";

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

              first_name = log.visitor_log_details.first_name || "";
              last_name = log.visitor_log_details.last_name || "";

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

          // Get parking slot - check multiple sources in priority order (from Logs.jsx):
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
            id: log.id,
            timestamp: log.timestamp,
            type: log.type || "N/A",
            full_name: name || "N/A",
            first_name: first_name,
            last_name: last_name,
            plate_number: plateNumber || "-",
            activity: log.action || "N/A",
            purpose: log.purpose || "-",
            parking_slot: parkingSlot || "-",
            source: "ACCESS_LOG",
          };
        });

        // Sort by timestamp (newest first) - like in Logs.jsx
        const sortedLogs = processedLogs.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Update ref and state
        logsRef.current = sortedLogs;
        setLogs(sortedLogs);

        // Process visitors like in Logs.jsx format
        const processedVisitors = visitorsRes.data
          .map((visitor) => {
            const visitorName =
              visitor.name ||
              `${visitor.first_name || ""} ${visitor.last_name || ""}`.trim() ||
              "Visitor";

            return {
              id: visitor.id,
              timestamp: visitor.timestamp || visitor.created_at,
              type: "VISITOR",
              full_name: visitorName,
              first_name: visitor.first_name || "",
              last_name: visitor.last_name || "",
              plate_number: visitor.plate_number || "-",
              activity: "ENTRY", // Visitors typically have entry actions
              purpose: visitor.purpose || "-",
              parking_slot: visitor.parking_slot_details?.slot_number || "-",
              source: "VISITOR_REGISTRATION",
            };
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setVisitors(processedVisitors);

        // Initial combined data with newest first
        const combined = [...sortedLogs, ...processedVisitors].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setFilteredData(combined);
      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("Failed to fetch report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [access, isAuthenticated]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    const combined = [...logs, ...visitors].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    ); // Ensure newest first

    const filtered = combined.filter((item) => {
      if (filterType !== "ALL" && item.type !== filterType) return false;

      if (!item.timestamp) return true; // Skip date filtering if no timestamp

      const itemDate = new Date(item.timestamp);
      if (isNaN(itemDate.getTime())) return true; // Skip if invalid date

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (itemDate < fromDate) return false;
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (itemDate > toDate) return false;
      }

      return true;
    });

    setFilteredData(filtered);
  }, [logs, visitors, filterType, dateFrom, dateTo]);

  // Format time like in Logs.jsx
  const formatTime = (timestamp) => {
    if (!timestamp) {
      return { date: "N/A", time: "N/A", full: "N/A" };
    }

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return {
          date: "Invalid Date",
          time: "Invalid Time",
          full: "Invalid Date",
        };
      }

      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return {
        date: formattedDate,
        time: formattedTime,
        full: `${formattedDate} ${formattedTime}`,
      };
    } catch (e) {
      console.error("Error formatting timestamp:", timestamp, e);
      return { date: "Error", time: "Error", full: timestamp };
    }
  };

  const generatePDF = async () => {
    if (filteredData.length === 0) {
      alert("No data to generate PDF");
      return;
    }

    setPdfGenerating(true);
    try {
      await loadExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
      );
      await loadExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      );

      if (!reportRef.current) return;

      const originalElement = reportRef.current;

      // Clone the element
      const element = originalElement.cloneNode(true);

      // Remove height restrictions and make visible
      element.style.height = "auto";
      element.style.maxHeight = "none";
      element.style.overflow = "visible";
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.top = "0";
      element.style.width = originalElement.offsetWidth + "px";

      // Add to DOM temporarily
      document.body.appendChild(element);

      const scale = 2;
      const canvas = await window.html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      const imgProps = { width: canvas.width, height: canvas.height };
      const pdfWidth = pageWidth - 40;
      const ratio = imgProps.width / imgProps.height;
      const pdfHeight = pdfWidth / ratio;

      pdf.addImage(imgData, "PNG", 20, 20, pdfWidth, pdfHeight);
      pdf.save(
        `gatekeepr-report-${new Date().toISOString().split("T")[0]}.pdf`
      );

      // Clean up
      document.body.removeChild(element);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Please check your connection.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleClearFilters = () => {
    setFilterType("ALL");
    setDateFrom("");
    setDateTo("");
  };

  // Get filtered data by type for display
  const getDisplayData = () => {
    switch (filterType) {
      case "VISITOR":
        return filteredData.filter((i) => i.type === "VISITOR");
      case "RESIDENT":
        return filteredData.filter((i) => i.type === "RESIDENT");
      default:
        return filteredData;
    }
  };

  const displayData = getDisplayData();

  const getTableHeaders = () => {
    switch (filterType) {
      case "VISITOR":
        return (
          <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Full Name</th>
            <th>Plate Number</th>
            <th>Activity</th>
            <th>Purpose</th>
            <th>Parking Slot</th>
          </tr>
        );
      case "RESIDENT":
        return (
          <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Full Name</th>
            <th>Plate Number</th>
            <th>Activity</th>
            <th>Parking Slot</th>
          </tr>
        );
      default:
        return (
          <tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Full Name</th>
            <th>Plate Number</th>
            <th>Activity</th>
            <th>Purpose</th>
            <th>Parking Slot</th>
          </tr>
        );
    }
  };

  const renderTableRows = () => {
    if (displayData.length === 0) {
      const colSpan = filterType === "RESIDENT" ? 6 : 7;
      return (
        <tr>
          <td colSpan={colSpan} style={{ textAlign: "center" }}>
            No records found for the selected filters.
          </td>
        </tr>
      );
    }

    return displayData.map((row, idx) => {
      const { full } = formatTime(row.timestamp);

      if (filterType === "RESIDENT") {
        return (
          <tr key={row.id || idx}>
            <td>{full}</td>
            <td>{row.type}</td>
            <td>{row.full_name || "N/A"}</td>
            <td>{row.plate_number || "-"}</td>
            <td>{row.activity || "-"}</td>
            <td>
              {row.parking_slot === "-" || !row.parking_slot
                ? "Not Assigned"
                : row.parking_slot}
            </td>
          </tr>
        );
      } else {
        return (
          <tr key={row.id || idx}>
            <td>{full}</td>
            <td>{row.type}</td>
            <td>{row.full_name || "N/A"}</td>
            <td>{row.plate_number || "-"}</td>
            <td>{row.activity || "-"}</td>
            <td>{row.purpose || "-"}</td>
            <td>
              {row.parking_slot === "-" || !row.parking_slot
                ? "Not Assigned"
                : row.parking_slot}
            </td>
          </tr>
        );
      }
    });
  };

  const getSectionTitle = () => {
    switch (filterType) {
      case "ALL":
        return `All Records (${displayData.length})`;
      case "VISITOR":
        return `Visitors (${displayData.length})`;
      case "RESIDENT":
        return `Residents (${displayData.length})`;
      default:
        return `Records (${displayData.length})`;
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <Header />
        <div className="dashboard-main no-top-padding">
          <div className="report-container">
            <div
              className="report-container-header"
              style={{ justifyContent: "space-between" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <i className="fas fa-file-pdf green-icon"></i>
                <h2>Reports</h2>
              </div>
              <div className="header-buttons">
                <button
                  className="register-button"
                  onClick={generatePDF}
                  disabled={
                    loading || pdfGenerating || displayData.length === 0
                  }
                >
                  {pdfGenerating ? (
                    <span className="btn-loading">
                      <span className="btn-spinner">
                        <span className="bounce1"></span>
                        <span className="bounce2"></span>
                        <span className="bounce3"></span>
                      </span>
                      Generating...
                    </span>
                  ) : (
                    <>
                      <i className="fas fa-file-pdf"></i> Generate PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="report-filters">
              <label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="ALL">All logs</option>
                  <option value="RESIDENT">Residents</option>
                  <option value="VISITOR">Visitors</option>
                </select>
              </label>
              <label>
                From:
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                />
              </label>
              <label>
                To:
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onClick={(e) => e.target.showPicker()}
                />
              </label>
              <button
                className="clear-filters-btn"
                onClick={handleClearFilters}
                title="Clear all filters"
              >
                <i className="fas fa-times"></i> Clear
              </button>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <div
                className="report-preview"
                ref={reportRef}
                id="report-container"
              >
                <div className="report-header">
                  <div className="report-header-top">
                    <div className="report-title-section">
                      <h3>Gatekeepr Report</h3>
                      <div className="report-meta">
                        Generated: {new Date().toLocaleString()}
                      </div>
                      <div className="report-user-info-header">
                        <p>
                          <strong>Generated by:</strong> {user?.name || "Admin"}
                        </p>
                        <p>
                          <strong>Role:</strong> Admin
                        </p>
                      </div>
                    </div>
                    <img
                      src="/gatekeepr-logo-black.png"
                      alt="Gatekeepr Logo"
                      className="report-logo"
                    />
                  </div>
                  <div className="report-filters-info">
                    {filterType !== "ALL" && <span>Type: {filterType}</span>}
                    {dateFrom && <span>From: {dateFrom}</span>}
                    {dateTo && <span>To: {dateTo}</span>}
                  </div>
                </div>

                <div className="report-section full-width-table">
                  <h4 className="section-title">{getSectionTitle()}</h4>
                  <table className="activities-table report-table full-width">
                    <thead>{getTableHeaders()}</thead>
                    <tbody>{renderTableRows()}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
