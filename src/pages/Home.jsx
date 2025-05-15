import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { load_user } from "../actions/auth";

const Home = () => {
  const { access, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

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
          `${import.meta.env.VITE_API_URL}/api/v1/access-logs/`,
          {
            headers: {
              Authorization: `JWT ${access}`,
              "Content-Type": "application/json",
            },
          }
        );
        setLogs(response.data);
      } catch (err) {
        console.error("Error fetching access logs:", err);

        if (err.response) {
          if (err.response.status === 500) {
            setError(
              "Server error while fetching access logs. Please try again later."
            );
          } else if (err.response.status === 401) {
            try {
              const refreshResponse = await axios.post(
                `${import.meta.env.VITE_API_URL}/auth/jwt/refresh/`,
                { refresh: localStorage.getItem("refresh") }
              );

              localStorage.setItem("access", refreshResponse.data.access);
              dispatch({
                type: "LOGIN_SUCCESS",
                payload: refreshResponse.data,
              });

              const retryResponse = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/v1/access-logs/`,
                {
                  headers: {
                    Authorization: `JWT ${refreshResponse.data.access}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              setLogs(retryResponse.data);
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

    fetchAccessLogs();
  }, [access, isAuthenticated, dispatch]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading access logs...</div>;
  }

  if (error) {
    return <div style={{ color: "red", padding: "20px" }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "20px" }}>Access Logs</h1>

      {logs.length === 0 ? (
        <p>No access logs found</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  ID
                </th>
                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  User
                </th>
                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Action
                </th>
                <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                    {log.id}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                    {log.name || "N/A"}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                    {log.action}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Home;
