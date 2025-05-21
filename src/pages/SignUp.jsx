"use client"

import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import { connect } from "react-redux"
import { signup } from "../actions/auth"
import "./SignUp.css"

const SignUp = ({ signup, isAuthenticated }) => {
  const [accountCreated, setAccountCreated] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    re_password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordStrength, setPasswordStrength] = useState("")
  const [redirectTimer, setRedirectTimer] = useState(null)

  const { name, email, password, re_password } = formData

  // Clear redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer)
      }
    }
  }, [redirectTimer])

  const onChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Check password strength when password changes
    if (name === "password") {
      checkPasswordStrength(value)
    }
  }

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength("")
      return
    }

    // Simple password strength check
    const hasLowerCase = /[a-z]/.test(password)
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const isLongEnough = password.length >= 8

    const score = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars, isLongEnough].filter(Boolean).length

    if (score <= 2) {
      setPasswordStrength("weak")
    } else if (score <= 4) {
      setPasswordStrength("medium")
    } else {
      setPasswordStrength("strong")
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (password !== re_password) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      await signup(name, email, password, re_password)
      setSuccess("Account created successfully! Redirecting to login page...")

      // Set a timer to redirect after 5 seconds
      const timer = setTimeout(() => {
        setAccountCreated(true)
      }, 5000)

      setRedirectTimer(timer)
    } catch (err) {
      setError("Failed to create account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const passwordsMatch = password && re_password && password === re_password

  if (isAuthenticated) {
    return <Navigate to="/" />
  }
  if (accountCreated) {
    return <Navigate to="/login" />
  }

  return (
    <div className="signup-container">
      <div className="signup-left">
        <div className="overlay-text">
          <h1>A Residential Vehicle Access Control System Utilizing RFID and OCR Technology</h1>
          <div className="caption">A Capstone Project by BSIT 3rd Year Students | USTP - CDO Campus | Team 5ive</div>
        </div>
      </div>
      <div className="signup-right">
        <div className="signup-form-container">
          <div className="logo">
            <img src="/gatekeepr-logo.png" alt="gatekeepr" />
          </div>

          <h1 className="welcome-text">Create Account</h1>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Enter your name"
                required
                disabled={isLoading || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={onChange}
                placeholder="Enter your email"
                required
                disabled={isLoading || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={onChange}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading || success}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading || success}
                >
                  {showPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
                </button>
              </div>
              {passwordStrength && (
                <div className={`password-strength ${passwordStrength}`}>
                  <div className="strength-text">
                    Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </div>
                  <div className="password-strength-meter">
                    <div></div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="re_password">Confirm Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="re_password"
                  name="re_password"
                  value={re_password}
                  onChange={onChange}
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading || success}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={isLoading || success}
                >
                  {showConfirmPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
                </button>
              </div>
              {re_password && (
                <div className={`password-match ${passwordsMatch ? "match" : "no-match"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </div>
              )}
            </div>

            <button className="sign-up-button" type="submit" disabled={isLoading || success}>
              {isLoading ? (
                <div className="spinner">
                  <div className="bounce1"></div>
                  <div className="bounce2"></div>
                  <div className="bounce3"></div>
                </div>
              ) : (
                "Sign up"
              )}
            </button>
            <div className="login-link">
              <p>
                Have an account?{" "}
                <Link to="/login" className="login-account-link">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
})

export default connect(mapStateToProps, { signup })(SignUp)
