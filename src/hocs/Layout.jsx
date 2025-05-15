import React, { useEffect } from "react";
import NavBar from "../components/NavBar";
import { connect } from "react-redux";
import { checkAuthenticated, load_user } from "../actions/auth";

const Layout = ({ children, checkAuthenticated, load_user }) => {
  useEffect(() => {
    checkAuthenticated();
    load_user();
  }, []);

  return (
    <div>
      <NavBar />
      {children}
    </div>
  );
};

export default connect(null, { checkAuthenticated, load_user })(Layout);
