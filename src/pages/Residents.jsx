"use client";

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";
import Sidebar from "../components/SideBar";
import Header from "../components/Header";
import "./Residents.css";

const Residents = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rfid_uid: "",
    plate_number: "",
    unit_number: "",
    phone: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (access && !user) {
      dispatch(load_user());
    }
  }, [access, user, dispatch]);

  useEffect(() => {
    const fetchResidents = async () => {
      if (!isAuthenticated) {
        setError("Please login to view residents");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `https://gatekeepr-backend.onrender.com/api/v1/residents/`,
          {
            headers: {
              Authorization: `JWT ${access}`,
              "Content-Type": "application/json",
            },
          }
        );
        setResidents(response.data);
      } catch (err) {
        console.error("Error fetching residents:", err);

        if (err.response) {
          if (err.response.status === 500) {
            setError(
              "Server error while fetching residents. Please try again later."
            );
          } else if (err.response.status === 401) {
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

              const retryResponse = await axios.get(
                `https://gatekeepr-backend.onrender.com/api/v1/residents/`,
                {
                  headers: {
                    Authorization: `JWT ${refreshResponse.data.access}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              setResidents(retryResponse.data);
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              dispatch({ type: "LOGIN_FAIL" });
              setError("Session expired. Please login again.");
            }
          } else {
            setError(
              err.response.data?.detail || "An unexpected error occurred."
            );
          }
        } else if (err.request) {
          setError("No response from server. Please check your network.");
        } else {
          setError("Error: " + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, [access, isAuthenticated, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    try {
      const response = await axios.post(
        `https://gatekeepr-backend.onrender.com/api/v1/residents/`,
        formData,
        {
          headers: {
            Authorization: `JWT ${access}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Add the new resident to the list
      setResidents([...residents, response.data]);
      setFormSuccess("Resident registered successfully!");

      // Clear the form
      setFormData({
        name: "",
        rfid_uid: "",
        plate_number: "",
        unit_number: "",
        phone: "",
      });

      // Close the modal after a delay
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Error registering resident:", err);
      if (err.response) {
        setFormError(
          err.response.data?.detail ||
            "Failed to register resident. Please try again."
        );
      } else if (err.request) {
        setFormError("No response from server. Please check your network.");
      } else {
        setFormError("Error: " + err.message);
      }
    }
  };

  const handleClear = () => {
    setFormData({
      name: "",
      rfid_uid: "",
      plate_number: "",
      unit_number: "",
      phone: "",
    });
    setFormError("");
    setFormSuccess("");
  };

  if (!isAuthenticated) {
    return (
      <div className="login-required">
        <h2>Please login to view residents</h2>
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
        <Header title="Residents" />

        <div className="dashboard-main no-top-padding">
          <div className="residents-container">
            <div className="residents-header">
              <div className="residents-title">
                <i className="fas fa-users green-icon"></i>

                <h2>Residents</h2>
              </div>
              <button
                className="register-button"
                onClick={() => setShowModal(true)}
              >
                <i className="fas fa-user-plus"></i> Register Resident
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading residents...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : residents.length === 0 ? (
              <div className="no-data">No residents found</div>
            ) : (
              <table className="residents-table">
                <thead>
                  <tr>
                    <th>RFID UID</th>
                    <th>Plate Number</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Unit Number</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((resident) => (
                    <tr key={resident.id}>
                      <td>{resident.rfid_uid}</td>
                      <td>{resident.plate_number}</td>
                      <td>{resident.name}</td>
                      <td>{resident.phone}</td>
                      <td>{resident.unit_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-users users-green"></i>
                <h2>Resident Registration</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09x-xxx-xxxx"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="unit_number">Unit Number</label>
                <input
                  type="text"
                  id="unit_number"
                  name="unit_number"
                  value={formData.unit_number}
                  onChange={handleInputChange}
                  placeholder="APT - 801"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="rfid_uid">RFID UID</label>
                <input
                  type="text"
                  id="rfid_uid"
                  name="rfid_uid"
                  value={formData.rfid_uid}
                  onChange={handleInputChange}
                  placeholder="Enter RFID UID"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="plate_number">Plate Number</label>
                <input
                  type="text"
                  id="plate_number"
                  name="plate_number"
                  value={formData.plate_number}
                  onChange={handleInputChange}
                  placeholder="ABC 1234"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  Submit
                </button>
                <button
                  type="button"
                  className="clear-button"
                  onClick={handleClear}
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

export default Residents;
