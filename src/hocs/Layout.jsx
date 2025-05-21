import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { connect } from "react-redux";
import { checkAuthenticated, load_user } from "../actions/auth";

const Layout = ({ children, checkAuthenticated, load_user }) => {
  const location = useLocation();

  useEffect(() => {
    checkAuthenticated();
    load_user();
  }, []);

  return <>{children}</>;
};

export default connect(null, { checkAuthenticated, load_user })(Layout);
