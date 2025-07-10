import React from "react";
import {
  FaCalendarAlt,
  FaMap,
  FaUserTie,
  FaChartBar,
  FaCog,
} from "react-icons/fa";
import "../App.css";

const Sidebar = ({ onNavigate, currentPage }) => {
  return (
    <div className="sidebar custom-sidebar">
      <div className="sidebar-logo-section">
        <span className="sidebar-logo-text">G-Waste</span>
      </div>
      <div className="sidebar-menu-section">
        <div className="sidebar-menu-group">
          <span className="sidebar-menu-label">Main</span>
          <ul className="nav-links custom-nav-links">
            <li
              onClick={() => onNavigate("Schedule")}
              className={currentPage === "Schedule" ? "active" : ""}
            >
              <FaCalendarAlt /> Schedule
            </li>
            <li
              onClick={() => onNavigate("ViewMap")}
              className={currentPage === "ViewMap" ? "active" : ""}
            >
              <FaMap /> Map
            </li>
            <li
              onClick={() => onNavigate("CollectorManagement")}
              className={currentPage === "CollectorManagement" ? "active" : ""}
            >
              <FaUserTie /> Collector Management
            </li>
            <li
              onClick={() => onNavigate("Reports")}
              className={currentPage === "Reports" ? "active" : ""}
            >
              <FaChartBar /> Reports & Feedback
              <span className="sidebar-badge"></span>
            </li>
            <li
              onClick={() => onNavigate("Settings")}
              className={currentPage === "Settings" ? "active" : ""}
            >
              <FaCog /> Settings
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
