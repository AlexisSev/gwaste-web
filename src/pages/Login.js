import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { FaUser, FaLock, FaFacebookF, FaTwitter, FaLinkedinIn, FaEye, FaEyeSlash } from 'react-icons/fa';
import "./Login.css";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      // Pass displayName if available, else email
      const user = userCredential.user;
      onLogin(user.displayName || user.email || "Admin", user.email);
    } catch (error) {
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email address.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;
        default:
          setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-bg">
      <div className="login-bg-centered">
        <div className="login-card">
          <h2 className="login-title">Welcome Back, Admin!</h2>
          <p className="login-subtitle">Ready to manage things?</p>
          {error && <div className="error-message">{error}</div>}
          <form className="login-form-modern" onSubmit={handleSubmit}>
            <div className="input-icon-group">
              <span className="input-icon"><FaUser /></span>
              <input
                type="email"
                name="email"
                placeholder="awesome@user.com"
                value={credentials.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="input-icon-group">
              <span className="input-icon"><FaLock /></span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="login-form-links">
              <a href="#" className="forgot-link">Forgot your password?</a>
            </div>
            <button type="submit" className="login-btn-modern" disabled={loading}>
              {loading ? "Logging In..." : "Log In"}
            </button>
          </form>
          {/* <div className="login-bottom-text">
            Don&apos;t have an account? <a href="#" className="signup-link">Sign up!</a>
          </div>
          <div className="login-social-icons">
            <a href="#" aria-label="Facebook"><FaFacebookF /></a>
            <a href="#" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedinIn /></a>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Login;
