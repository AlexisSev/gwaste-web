import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";
import "./Reports.css";

const Reports = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("unresolved");
  const [reports, setReports] = useState([]);
  const [detailsModal, setDetailsModal] = useState({ open: false, report: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("status"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReports(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredReports = reports.filter(
    (report) =>
      report.status === activeTab &&
      ((report.title || "").toLowerCase().includes(search.toLowerCase()) || !search)
  );

  const handleToggleStatus = async (report) => {
    const newStatus = report.status === "resolved" ? "unresolved" : "resolved";
    await updateDoc(doc(db, "reports", report.id), { status: newStatus });
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Issues</h1>
        <div className="reports-status-toggle">
          <span
            className={activeTab === "unresolved" ? "active" : "inactive"}
            onClick={() => setActiveTab("unresolved")}
          >
            ● unresolved
          </span>
          <span> • </span>
          <span
            className={activeTab === "resolved" ? "active" : "inactive"}
            onClick={() => setActiveTab("resolved")}
          >
            ● resolved
          </span>
        </div>
      </div>
      <div className="reports-actions">
        <input
          className="reports-search"
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="reports-grid">
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', width: '100%' }}>Loading...</div>
        ) : filteredReports.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', width: '100%' }}>No issues found.</div>
        ) : filteredReports.map((report) => (
          <div className="report-card" key={report.id}>
            <span className={`report-status-badge ${report.status}`}>● {report.status}</span>
            <div className="report-info">
              <div className="report-title">{report.title || <>&nbsp;</>}</div>
              <div className="report-user">{report.user || <>&nbsp;</>}</div>
              <div className="report-type">{report.type || <>&nbsp;</>}</div>
              <div className="report-description">{report.description || <>&nbsp;</>}</div>
            </div>
            <div className="report-view-details" onClick={() => setDetailsModal({ open: true, report })}>View Details</div>
            <div className="report-view-details" style={{ color: '#4b8b3b', fontWeight: 500, cursor: 'pointer', marginTop: 8 }} onClick={() => handleToggleStatus(report)}>
              Mark as {report.status === 'resolved' ? 'Unresolved' : 'Resolved'}
            </div>
          </div>
        ))}
      </div>
      {detailsModal.open && detailsModal.report && (
        <div className="collector-modal-bg">
          <div className="collector-modal">
            <h2>Issue Details</h2>
            <div style={{ marginBottom: 16 }}>
              <b>Title:</b> {detailsModal.report.title || <>&nbsp;</>}<br />
              <b>User:</b> {detailsModal.report.user || <>&nbsp;</>}<br />
              <b>Type:</b> {detailsModal.report.type || <>&nbsp;</>}<br />
              <b>Status:</b> {detailsModal.report.status}<br />
              <b>Description:</b> {detailsModal.report.description || <>&nbsp;</>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setDetailsModal({ open: false, report: null })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports; 