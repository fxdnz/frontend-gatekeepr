// Report.jsx - Updated with proper data mapping and columns
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
    if (document.querySelector(`script[src=\"${src}\"]`)) return resolve();
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
  const [filterLoading, setFilterLoading] = useState(false);

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

        // Process access logs
        setLogs(
          logsRes.data
            .map((log) => ({
              ...log,
              source: "ACCESS",
              timestamp: log.timestamp,
              type: log.type, // RESIDENT or VISITOR
              full_name: log.name,
              plate_number: log.plate_number || "-",
              activity: log.action, // ENTRY or EXIT
              purpose: log.purpose || "-",
              parking_slot: log.parking_slot || "-",
              rfid_uid: log.resident?.rfid_uid_display || "-",
              first_name:
                log.resident?.first_name || log.visitor_log?.first_name || "-",
              last_name:
                log.resident?.last_name || log.visitor_log?.last_name || "-",
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );

        // Process visitors
        setVisitors(
          visitorsRes.data
            .map((visitor) => ({
              ...visitor,
              source: "VISITOR",
              timestamp: visitor.timestamp,
              type: "VISITOR",
              full_name: `${visitor.first_name} ${visitor.last_name}`,
              plate_number: visitor.plate_number || "-",
              activity: "ENTRY", // Visitors typically have entry actions
              purpose: visitor.purpose || "-",
              parking_slot: visitor.parking_slot?.slot_number || "-",
              rfid_uid: visitor.rfid?.uid || "-",
              first_name: visitor.first_name,
              last_name: visitor.last_name,
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );
      } catch (err) {
        console.error(err);
        setError("Failed to fetch report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [access, isAuthenticated]);

  const combined = [...logs, ...visitors].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const filtered = combined.filter((item) => {
    if (filterType !== "ALL" && item.type !== filterType) return false;
    if (dateFrom && new Date(item.timestamp) < new Date(dateFrom)) return false;
    if (dateTo && new Date(item.timestamp) > new Date(dateTo + "T23:59:59"))
      return false;
    return true;
  });

  // Separate lists for rendering
  const allFiltered = filtered;
  const visitorsFiltered = filtered.filter((i) => i.type === "VISITOR");
  const residentsFiltered = filtered.filter((i) => i.type === "RESIDENT");

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch (e) {
      return ts;
    }
  };

  const generatePDF = async () => {
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

  const handleApplyFilters = () => {
    setFilterLoading(true);
    // Simulate filter loading
    setTimeout(() => {
      setFilterLoading(false);
    }, 500);
  };

  const handleClearFilters = () => {
    setFilterType("ALL");
    setDateFrom("");
    setDateTo("");
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
                  disabled={loading || pdfGenerating}
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
                </div>

                {/* Show only the filtered table based on filterType */}
                {filterType === "ALL" && (
                  <div className="report-section full-width-table">
                    <h4 className="section-title">
                      All Records ({allFiltered.length})
                    </h4>
                    <table className="activities-table report-table full-width">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Type</th>
                          <th>Full Name</th>
                          <th>Plate Number</th>
                          <th>Activity</th>
                          <th>Purpose</th>
                          <th>Parking Slot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center" }}>
                              No records found for the selected filters.
                            </td>
                          </tr>
                        ) : (
                          allFiltered.map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td>{formatTime(row.timestamp)}</td>
                              <td>{row.type}</td>
                              <td>{row.full_name || "N/A"}</td>
                              <td>{row.plate_number || "-"}</td>
                              <td>{row.activity || "-"}</td>
                              <td>{row.purpose || "-"}</td>
                              <td>{row.parking_slot || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {filterType === "VISITOR" && (
                  <div className="report-section full-width-table">
                    <h4 className="section-title">
                      Visitors ({visitorsFiltered.length})
                    </h4>
                    <table className="activities-table report-table full-width">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Type</th>
                          <th>RFID UID</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Plate Number</th>
                          <th>Activity</th>
                          <th>Purpose</th>
                          <th>Parking Slot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorsFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ textAlign: "center" }}>
                              No visitor records.
                            </td>
                          </tr>
                        ) : (
                          visitorsFiltered.map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td>{formatTime(row.timestamp)}</td>
                              <td>{row.type}</td>
                              <td>{row.rfid_uid || "-"}</td>
                              <td>{row.first_name || "N/A"}</td>
                              <td>{row.last_name || "N/A"}</td>
                              <td>{row.plate_number || "-"}</td>
                              <td>{row.activity || "-"}</td>
                              <td>{row.purpose || "-"}</td>
                              <td>{row.parking_slot || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {filterType === "RESIDENT" && (
                  <div className="report-section full-width-table">
                    <h4 className="section-title">
                      Residents ({residentsFiltered.length})
                    </h4>
                    <table className="activities-table report-table full-width">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Type</th>
                          <th>RFID UID</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Plate Number</th>
                          <th>Activity</th>
                          <th>Parking Slot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residentsFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: "center" }}>
                              No resident access records.
                            </td>
                          </tr>
                        ) : (
                          residentsFiltered.map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td>{formatTime(row.timestamp)}</td>
                              <td>{row.type}</td>
                              <td>{row.rfid_uid || "-"}</td>
                              <td>{row.first_name || "N/A"}</td>
                              <td>{row.last_name || "N/A"}</td>
                              <td>{row.plate_number || "-"}</td>
                              <td>{row.activity || "-"}</td>
                              <td>{row.parking_slot || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
