import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Schedule from "./pages/Schedule";
import ViewMap from "./pages/ViewMap";
import CollectorManagement from "./pages/CollectorManagement";
import CollectionStatus from "./pages/CollectionStatus";
import Reports from "./pages/Reports";
import History from "./pages/History";
import Login from "./pages/Login";
import LogoutModal from "./components/LogoutModal";
import "./App.css";

function App() {
  const [page, setPage] = useState("Dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    setShowLogoutModal(false);
    setIsLoggedIn(false);
  };

  const handleShowLogout = () => setShowLogoutModal(true);
  const handleCancelLogout = () => setShowLogoutModal(false);

  const renderPage = () => {
    switch (page) {
      case "Dashboard":
        return <Dashboard onNavigate={setPage} />;
      case "Schedule":
        return <Schedule />;
      case "ViewMap":
        return <ViewMap />;
      case "CollectorManagement":
        return <CollectorManagement />;
      case "CollectionStatus":
        return <CollectionStatus />;
      case "Reports":
        return <Reports />;
      case "History":
        return <History />;
      case "Users":
        return <Users />;
      case "Settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={setPage} />;
    }
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-container">
      <Sidebar onNavigate={setPage} onLogout={handleShowLogout} currentPage={page} />
      <div className="main-content">
        <Topbar onLogout={handleShowLogout} />
        <div className="page-content">{renderPage()}</div>
        <LogoutModal
          isOpen={showLogoutModal}
          onCancel={handleCancelLogout}
          onConfirm={handleLogout}
        />
      </div>
    </div>
  );
}

export default App;
