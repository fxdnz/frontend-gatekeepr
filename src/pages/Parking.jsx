"use client";

import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Parking.css";
import BouncingSpinner from "../components/BouncingSpinner";
import { API_ENDPOINTS, AUTH_ENDPOINTS, getAuthHeaders } from "../config/api";

const Parking = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Map interaction states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef(null);

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  const fetchParkingSpaces = async () => {
    if (!isAuthenticated) {
      setError("Please login to view parking spaces");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(API_ENDPOINTS.PARKING, {
        headers: getAuthHeaders(access),
      });
      console.log("Parking spaces data:", response.data); // Debug log
      setParkingSpaces(response.data);
    } catch (err) {
      console.error("Error fetching parking spaces:", err);
      if (err.response?.status === 401) {
        try {
          const refreshResponse = await axios.post(AUTH_ENDPOINTS.REFRESH, {
            refresh: localStorage.getItem("refresh"),
          });
          localStorage.setItem("access", refreshResponse.data.access);
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: refreshResponse.data,
          });
          // Retry fetching
          const retryResponse = await axios.get(API_ENDPOINTS.PARKING, {
            headers: getAuthHeaders(refreshResponse.data.access),
          });
          console.log("Retry parking spaces data:", retryResponse.data); // Debug log
          setParkingSpaces(retryResponse.data);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          dispatch({ type: "LOGIN_FAIL" });
          setError("Session expired. Please login again.");
        }
      } else {
        setError("Failed to fetch parking spaces.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingSpaces();

    // Set up polling for real-time updates
    const pollingInterval = setInterval(() => {
      if (isAuthenticated && access) {
        fetchParkingSpaces();
      }
    }, 10000); // 10 seconds

    return () => clearInterval(pollingInterval);
  }, [access, isAuthenticated, dispatch]);

  // Map interaction handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent window scroll

    // Get the mouse position relative to the viewport
    const rect = mapRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom delta
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.3, Math.min(2, zoom + delta));

    // If zoom didn't change, don't update anything
    if (newZoom === zoom) return;

    // Calculate the zoom factor
    const zoomFactor = newZoom / zoom;

    // Calculate the new pan position to keep the mouse point stationary
    const newPanX = mouseX - (mouseX - pan.x) * zoomFactor;
    const newPanY = mouseY - (mouseY - pan.y) * zoomFactor;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomIn = () => {
    if (!mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newZoom = Math.min(2, zoom + 0.2);
    if (newZoom === zoom) return;

    const zoomFactor = newZoom / zoom;
    const newPanX = centerX - (centerX - pan.x) * zoomFactor;
    const newPanY = centerY - (centerY - pan.y) * zoomFactor;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newZoom = Math.max(0.3, zoom - 0.2);
    if (newZoom === zoom) return;

    const zoomFactor = newZoom / zoom;
    const newPanX = centerX - (centerX - pan.x) * zoomFactor;
    const newPanY = centerY - (centerY - pan.y) * zoomFactor;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleSpaceClick = (space) => {
    setSelectedSpace(space);
    setShowDetailPanel(true);
  };

  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedSpace(null);
  };

  // Close panel when clicking overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeDetailPanel();
    }
  };

  // Get space classes based on filter type
  const getSpaceClasses = (space) => {
    const isTypeFilter =
      filterType !== "all" &&
      filterType !== "available" &&
      filterType !== "occupied";

    if (isTypeFilter) {
      // When type filter is active, show type colors for matching spaces, gray for others
      const spaceType = space.type?.toLowerCase();
      if (spaceType === filterType) {
        return `parking-space type-${spaceType}`;
      } else {
        return "parking-space filtered-out";
      }
    } else {
      // When no type filter or status filter, show available/occupied colors
      if (filterType === "available" && space.status !== "AVAILABLE") {
        return "parking-space filtered-out";
      }
      if (filterType === "occupied" && space.status !== "OCCUPIED") {
        return "parking-space filtered-out";
      }

      return `parking-space ${
        space.status === "OCCUPIED" ? "occupied" : "available"
      }`;
    }
  };

  // Generate CSS class name for positioning - handles CP01, CP02 format
  const getSpacePositionClass = (slotNumber) => {
    if (!slotNumber) return "";

    // Convert slot number to CSS class format
    // CP01 -> cp01, G01 -> g01, F01 -> f01
    const normalized = slotNumber.toLowerCase().replace(/[^a-z0-9]/g, "");

    console.log(`Slot: ${slotNumber} -> Class: space-${normalized}`); // Debug log

    return `space-${normalized}`;
  };

  // Get type color based on parking space type
  const getTypeColor = (type) => {
    if (!type) return "#00c07f";

    const typeMap = {
      owned: "#ffc107",
      rented: "#8c52ff",
      pwd: "#5170ff",
      free: "#fd7e14",
      open: "#7ed957",
    };

    return typeMap[type.toLowerCase()] || "#00c07f";
  };

  // Get type icon based on parking space type
  const getTypeIcon = (type) => {
    if (!type) return "fas fa-car";

    const typeMap = {
      owned: "fas fa-home",
      rented: "fas fa-key",
      pwd: "fas fa-wheelchair",
      free: "fas fa-gift",
      open: "fas fa-unlock",
    };

    return typeMap[type.toLowerCase()] || "fas fa-car";
  };

  const filterOptions = [
    { value: "all", label: "All", color: null, isStatus: true },
    {
      value: "available",
      label: "Available",
      color: "#28a745",
      isStatus: true,
    },
    { value: "occupied", label: "Occupied", color: "#dc3545", isStatus: true },
    { value: "owned", label: "Owned", color: "#ffc107", isStatus: false },
    { value: "rented", label: "Rented", color: "#8c52ff", isStatus: false },
    { value: "pwd", label: "PWD", color: "#5170ff", isStatus: false },
    { value: "free", label: "Free Parking", color: "#fd7e14", isStatus: false },
    { value: "open", label: "Open", color: "#7ed957", isStatus: false },
  ];

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view parking spaces</h2>
        <a href="/login" className="login-button">
          Login
        </a>
      </div>
    );
  }

  return (
    <div className="parking-container">
      <Sidebar />
      <div className="parking-content">
        <Header title="Parking" />
        <div className="parking-main">
          <div className="parking-overview">
            {loading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <BouncingSpinner />
              </div>
            ) : error ? (
              <div
                className="error"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                {error}
              </div>
            ) : (
              <>
                {/* Status Legend - Top Left (without title) */}
                <div className="status-section">
                  <div className="status-legend">
                    <div className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: "#28a745" }}
                      ></div>
                      <span className="legend-text">
                        AVAILABLE (
                        {
                          parkingSpaces.filter((s) => s.status === "AVAILABLE")
                            .length
                        }
                        )
                      </span>
                    </div>
                    <div className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: "#dc3545" }}
                      ></div>
                      <span className="legend-text">
                        OCCUPIED (
                        {
                          parkingSpaces.filter((s) => s.status === "OCCUPIED")
                            .length
                        }
                        )
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Filter Button */}
                <div className="filter-dropdown">
                  <button
                    className="filter-button"
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    <i className="fas fa-filter"></i>
                    Filter
                    <i className="fas fa-chevron-down"></i>
                  </button>
                  {showFilterMenu && (
                    <div className="filter-menu">
                      {filterOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`filter-option ${
                            option.isStatus ? "status-filter" : ""
                          }`}
                          onClick={() => {
                            setFilterType(option.value);
                            setShowFilterMenu(false);
                          }}
                        >
                          {option.color && (
                            <div
                              className="legend-color"
                              style={{ backgroundColor: option.color }}
                            ></div>
                          )}
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Full Screen Map */}
                <div className="map-container">
                  <div
                    ref={mapRef}
                    className={`map-viewport ${isDragging ? "dragging" : ""}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                  >
                    <div
                      className="map-content"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      }}
                    >
                      {/* Individual Parking Spaces */}
                      {parkingSpaces.map((space) => {
                        const positionClass = getSpacePositionClass(
                          space.slot_number
                        );
                        const spaceClasses = getSpaceClasses(space);

                        return (
                          <div
                            key={space.id}
                            className={`${spaceClasses} ${positionClass}`}
                            onClick={() => handleSpaceClick(space)}
                            title={`${space.slot_number} - ${space.status} ${
                              space.type ? `(${space.type})` : ""
                            }`}
                          >
                            {space.slot_number}
                          </div>
                        );
                      })}
                      {/* lines */}

                      {/* shapes */}
                      <div className="shape-rect building-a">Building A</div>
                      <div className="shape-rect building-b">Building B</div>
                      <div className="shape-rect building-c">Building C</div>
                      <div className="shape-rect building-d">Building D</div>
                      <div className="shape-rect building-e">Building E</div>
                      <div className="shape-rect building-f">Building F</div>
                      <div className="shape-rect building-g">Building G</div>
                      {/* Debug info */}
                      {parkingSpaces.length === 0 && !loading && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50px",
                            left: "50px",
                            color: "#666",
                          }}
                        >
                          No parking spaces found. Check API response.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="zoom-controls">
                    <button className="zoom-button" onClick={handleZoomIn}>
                      +
                    </button>
                    <button className="zoom-button" onClick={handleZoomOut}>
                      −
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Detail Panel */}
      <div
        className={`detail-panel-overlay ${showDetailPanel ? "open" : ""}`}
        onClick={handleOverlayClick}
      >
        <div className="detail-panel">
          {selectedSpace && (
            <>
              {/* Header with centered content and status inside */}
              <div
                className="detail-panel-header"
                style={{ backgroundColor: getTypeColor(selectedSpace.type) }}
              >
                {/* Top row with Details and X */}
                <div className="header-top-row">
                  <div className="details-text">Details</div>
                  <button className="close-panel" onClick={closeDetailPanel}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* Centered content */}
                <div className="header-center-content">
                  <div className="type-icon-circle">
                    <i className={getTypeIcon(selectedSpace.type)}></i>
                  </div>
                  <div className="space-info">
                    <h2>Car Parking</h2>
                    <div className="space-number">
                      {selectedSpace.slot_number || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Status Badge inside header */}
                <div className="header-status-badge">
                  <div
                    className={`status-badge ${selectedSpace.status.toLowerCase()}`}
                  >
                    <div className="status-dot"></div>
                    {selectedSpace.status}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="detail-panel-content">
                <div className="more-info-header">More Information</div>

                <div className="info-grid">
                  <div className="info-column">
                    <div className="info-label">PARKING TYPE:</div>
                    {selectedSpace.type && (
                      <div
                        className="info-badge"
                        style={{
                          backgroundColor: getTypeColor(selectedSpace.type),
                        }}
                      >
                        <i className={getTypeIcon(selectedSpace.type)}></i>
                        {selectedSpace.type.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="info-column">
                    <div className="info-label">LOCATION:</div>
                    <div
                      className="info-badge location-badge"
                      style={{
                        backgroundColor: getTypeColor(selectedSpace.type),
                      }}
                    >
                      <i className="fas fa-map-marker-alt"></i>
                      {selectedSpace.location || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="occupant-section">
                  <div className="info-label">OCCUPANT</div>
                  <div
                    className="occupant-badge"
                    style={{
                      backgroundColor: getTypeColor(selectedSpace.type),
                    }}
                  >
                    <i className="fas fa-user"></i>
                    {selectedSpace.resident?.name || "N/A"}
                  </div>
                </div>

                {/* Information Box */}
                <div
                  className="info-box"
                  style={{ borderLeftColor: getTypeColor(selectedSpace.type) }}
                >
                  <div
                    className="info-icon"
                    style={{ color: getTypeColor(selectedSpace.type) }}
                  >
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <div className="info-text">
                    {selectedSpace.status === "OCCUPIED"
                      ? `This parking space is currently occupied by ${
                          selectedSpace.resident?.name || "a resident"
                        }. ${
                          selectedSpace.type
                            ? `This is designated as a ${selectedSpace.type.toLowerCase()} parking space.`
                            : ""
                        }`
                      : `This parking space is currently available for use. ${
                          selectedSpace.type
                            ? `This is designated as a ${selectedSpace.type.toLowerCase()} parking space.`
                            : ""
                        }`}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Parking;
