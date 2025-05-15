import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { connect } from "react-redux";
import { signup } from "../actions/auth";

const SignUp = ({ signup, isAuthenticated }) => {
  const [accountCreated, setAccountCreated] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    re_password: "",
  });

  const { name, email, password, re_password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();

    if (password === re_password) {
      signup(name, email, password, re_password);
      setAccountCreated(true);
    } else {
      alert("Passwords do not match!");
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }
  if (accountCreated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mt-5">
      <h1>Sign Up</h1>
      <p>Create your Account</p>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <input
            className="form-control"
            type="text"
            name="name"
            value={name}
            onChange={onChange}
            placeholder="Name"
            required
          />
        </div>
        <div className="form-group mt-3">
          <input
            className="form-control"
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            placeholder="Email"
            required
          />
        </div>
        <div className="form-group mt-3">
          <input
            className="form-control"
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            placeholder="Password"
            required
          />
        </div>
        <div className="form-group mt-3">
          <input
            className="form-control"
            type="password"
            name="re_password"
            value={re_password}
            onChange={onChange}
            placeholder="Confirm Password"
            required
          />
        </div>

        <button className="btn btn-primary mt-3" type="submit">
          Sign Up
        </button>
      </form>
      <p className="mt-3">
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps, { signup })(SignUp);
