import React from "react";
import Modal from "react-modal";
import "../App.css";

Modal.setAppElement("#root");

const LogoutModal = ({ isOpen, onCancel, onConfirm }) => {
  return (
    <Modal
      isOpen={isOpen}
      className="modal"
      overlayClassName="overlay"
      contentLabel="Logout Confirmation"
    >
      <h2>Are you sure you want to logout?</h2>
      <div className="modal-buttons">
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button className="logout-btn" onClick={onConfirm}>Logout</button>
      </div>
    </Modal>
  );
};

export default LogoutModal;
