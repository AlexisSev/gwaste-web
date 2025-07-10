import React from "react";
import "../App.css";

const Topbar = () => {
  return (
    <div className="topbar custom-topbar">
      <div className="topbar-left">
        <div className="topbar-welcome">Welcome,</div>
        <div className="topbar-username">Amanda Simpsons</div>
      </div>
      <div className="topbar-center">
        <input
          className="topbar-search"
          type="text"
          placeholder="Find something"
        />
      </div>
      <div className="topbar-right">
        <div className="topbar-circle" />
        <div className="topbar-circle topbar-circle-dot">
          <span className="topbar-dot" />
        </div>
      </div>
    </div>
  );
};

export default Topbar;
