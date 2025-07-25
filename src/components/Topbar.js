import React from "react";
import "../App.css";
import logo from "../Profile.jpg";
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

const Topbar = ({ unresolvedCount, adminName = 'Admin' }) => {
  return (
    <div className="topbar custom-topbar">
      <div className="topbar-left">
        <img src={logo} alt="G-Waste Logo" className="topbar-logo" style={{ height: 38, marginRight: 18 }} />
        <div>
          <div className="topbar-welcome">Welcome,</div>
          <div className="topbar-username">{adminName}</div>
        </div>
      </div>
      <div className="topbar-center">
        <div className="topbar-search-container">
          <SearchIcon className="topbar-search-icon" />
          <input
            className="topbar-search"
            type="text"
            placeholder="Find something"
          />
        </div>
      </div>
      <div className="topbar-right">
        <HelpOutlineIcon className="topbar-icon" />
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <NotificationsNoneIcon className="topbar-icon" />
          {unresolvedCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#e74c3c',
              color: '#fff',
              borderRadius: '50%',
              minWidth: 18,
              height: 18,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              padding: '0 5px',
              zIndex: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)'
            }}>{unresolvedCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
