import React, { useState } from "react";
import "./Settings.css";
import ProfileImg from "../logo.svg";

const tabs = [
  { label: "Account" },
];

const Settings = ({ adminName = '', adminEmail = '' }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [profileName] = useState(adminName);

  const handleChangePhoto = () => {
    alert('Change photo functionality coming soon!');
  };
  const handleDeletePhoto = () => {
    alert('Delete photo functionality coming soon!');
  };

  return (
    <div className="settings-container">
      <h1 className="settings-title">Settings</h1>
      <div className="settings-tabs">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`settings-tab${activeTab === idx ? " active" : ""}`}
            onClick={() => setActiveTab(idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 0 && (
        <div className="settings-account-section">
          <div className="settings-profile-label">Profile Picture</div>
          <div className="settings-profile-row">
            <img src={ProfileImg} alt="Profile" className="settings-profile-img" />
            <div className="settings-profile-btns">
              <button className="settings-btn green" onClick={handleChangePhoto}>Change photo</button>
              <button className="settings-btn red" onClick={handleDeletePhoto}>Delete Photo</button>
            </div>
          </div>
          <div className="settings-profile-label" style={{ marginTop: 32 }}>Profile name</div>
          <div className="settings-profile-name-placeholder">{profileName}</div>
          <div className="settings-profile-label" style={{ marginTop: 18 }}>Email</div>
          <div className="settings-profile-name-placeholder">{adminEmail}</div>
        </div>
      )}
    </div>
  );
};

export default Settings;