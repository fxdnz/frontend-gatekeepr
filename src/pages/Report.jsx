"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import "./Report.css";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import BouncingSpinner from "../components/BouncingSpinner";

const ACCESS_LOGS_URL = "https://gatekeepr-backend.onrender.com/api/v1/access-logs/";
const VISITORS_URL = "https://gatekeepr-backend.onrender.com/api/v1/visitors/";

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

  const reportRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return setError("Please login to view reports");
      setLoading(true);
      setError(null);
      try {
        const headers = {
          headers: { Authorization: `JWT ${access}`, "Content-Type": "application/json" },
        };

        const [logsRes, visitorsRes] = await Promise.all([
          axios.get(ACCESS_LOGS_URL, headers),
          axios.get(VISITORS_URL, headers),
        ]);

        setLogs(
          logsRes.data
            .map((l) => ({
              ...l,
              source: "ACCESS",
              plate_number: l.plate_number || "-",
              parking_slot: l.parking?.slot_number || "-",
              name: l.name || l.user || "-",
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );

        setVisitors(
          visitorsRes.data
            .map((v) => ({
              ...v,
              source: "VISITOR",
              timestamp: v.created_at || v.timestamp || new Date().toISOString(),
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

  const combined = [...logs, ...visitors].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filtered = combined.filter((item) => {
    if (filterType !== "ALL" && item.source !== filterType) return false;
    if (dateFrom && new Date(item.timestamp) < new Date(dateFrom)) return false;
    if (dateTo && new Date(item.timestamp) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  // Separate lists for rendering
  const allFiltered = filtered;
  const visitorsFiltered = filtered.filter((i) => i.source === "VISITOR");
  const residentsFiltered = filtered.filter((i) => {
    if (i.source !== "ACCESS") return false;
    const t = (i.type || i.user_type || "").toString().toUpperCase();
    return t.includes("RESIDENT");
  });

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
      // Load external libraries from CDN if not present
      await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      if (!reportRef.current) return;

      const element = reportRef.current;
      const scale = 2;
      // Use global html2canvas and jspdf UMD
      const canvas = await window.html2canvas(element, { scale, useCORS: true, backgroundColor: window.getComputedStyle(element).backgroundColor || '#ffffff' });
      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      // fit image to page while maintaining aspect ratio
      const imgProps = { width: canvas.width, height: canvas.height };
      const pdfWidth = pageWidth - 40; // margins
      const ratio = imgProps.width / imgProps.height;
      const pdfHeight = pdfWidth / ratio;

      pdf.addImage(imgData, "PNG", 20, 20, pdfWidth, pdfHeight);
      pdf.save(`gatekeepr-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Please check your connection.");
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <Header />
        <div className="dashboard-main no-top-padding">
          <div className="recent-activities">
            <div className="recent-activities-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <img src="/recent-green.png" className="recent-act-logo" alt="Logo" />
                <h2>Reports</h2>
              </div>
              <div className="header-buttons">
                <button className="register-button" onClick={generatePDF} disabled={loading || pdfGenerating}>
                  <i className="fas fa-file-pdf"></i>
                  {pdfGenerating ? (
                    <>
                      <span style={{ marginRight: "6px" }}>Generating...</span>
                      <div className="spinner white" style={{ display: "inline-block", marginLeft: "4px" }}>
                        <div className="bounce1"></div>
                        <div className="bounce2"></div>
                        <div className="bounce3"></div>
                      </div>
                    </>
                  ) : (
                    "Generate PDF"
                  )}
                </button>
              </div>
            </div>

            <div className="report-filters">
              <label>
                Type:
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="ALL">All</option>
                  <option value="ACCESS">Access Logs</option>
                  <option value="VISITOR">Visitors</option>
                </select>
              </label>
              <label>
                From:
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label>
                To:
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>
            </div>

            {loading ? (
              <BouncingSpinner />
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <div className="report-preview" ref={reportRef} id="report-container">
                <div className="report-header">
                  <div className="report-header-top">
                    <div className="report-title-section">
                      <h3>Gatekeepr Report</h3>
                      <div className="report-meta">Generated: {new Date().toLocaleString()}</div>
                      <div className="report-user-info-header">
                        <p><strong>Generated by:</strong> {user?.name || "Admin"}</p>
                        <p><strong>Role:</strong> Admin</p>
                      </div>
                    </div>
                    <img src="/gatekeepr-logo-black.png" alt="Gatekeepr Logo" className="report-logo" />
                  </div>
                </div>

                {/* Show only the filtered table based on filterType */}
                {filterType === "ALL" && (
                <div className="report-section">
                  <h4 className="section-title">All Records ({allFiltered.length})</h4>
                  <table className="activities-table report-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Source</th>
                        <th>Name</th>
                        <th>Plate</th>
                        <th>Activity / Purpose</th>
                        <th>Parking Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center" }}>
                            No records found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        allFiltered.map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td>{formatTime(row.timestamp)}</td>
                            <td>{row.source}</td>
                            <td>{row.name || row.full_name || "N/A"}</td>
                            <td>{row.plate_number || "-"}</td>
                            <td>{row.source === "VISITOR" ? row.purpose || "-" : row.action || row.type || "-"}</td>
                            <td>{row.parking_slot || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                )}

                {filterType === "VISITOR" && (
                <div className="report-section">
                  <h4 className="section-title">Visitors ({visitorsFiltered.length})</h4>
                  <table className="activities-table report-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Name</th>
                        <th>Driver's License</th>
                        <th>Plate</th>
                        <th>Purpose</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitorsFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center" }}>
                            No visitor records.
                          </td>
                        </tr>
                      ) : (
                        visitorsFiltered.map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td>{formatTime(row.timestamp)}</td>
                            <td>{row.name || "N/A"}</td>
                            <td>{row.drivers_license || "-"}</td>
                            <td>{row.plate_number || "-"}</td>
                            <td>{row.purpose || "-"}</td>
                            <td>{row.notes || row.address || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                )}

                {filterType === "ACCESS" && (
                <div className="report-section">
                  <h4 className="section-title">Residents ({residentsFiltered.length})</h4>
                  <table className="activities-table report-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Name</th>
                        <th>Plate</th>
                        <th>Activity</th>
                        <th>Type</th>
                        <th>Parking Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {residentsFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center" }}>
                            No resident access records.
                          </td>
                        </tr>
                      ) : (
                        residentsFiltered.map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td>{formatTime(row.timestamp)}</td>
                            <td>{row.name || "N/A"}</td>
                            <td>{row.plate_number || "-"}</td>
                            <td>{row.action || "-"}</td>
                            <td>{row.type || row.user_type || "-"}</td>
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
