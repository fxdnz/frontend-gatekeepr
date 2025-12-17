"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import BouncingSpinner from "./BouncingSpinner";

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Give authentication a moment to initialize
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <BouncingSpinner />
      </div>
    );
  }

  // If not authenticated, redirect to login with the current path in state
  if (isAuthenticated === false) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If allowedRoles is provided, check user role
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default PrivateRoute;
