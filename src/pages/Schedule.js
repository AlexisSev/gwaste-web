import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput,
  Checkbox,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import dayjs from "dayjs";
import "./Schedule.css";

const emptyRoute = {
  route: "",
  driver: "",
  crew: [""],
  areas: [""],
  time: "",
  endTime: "",
  type: "",
  frequency: "",
  dayOff: "",
};

const ROUTE_NUMBERS = ["1", "2", "3", "4", "5"];
const AREAS = [
  "Gairan",
  "Don Pedro",
  "Polambato",
  "Cayang",
  "TayTayan",
  "Cogon",
  "Sto. Nino",
  "Sudlonon",
  "Lourdes",
  "Carbon",
  "Pandan",
  "Bungtod",
  "ARAPAL Farm",
  "Bungtod (Maharat & Laray)",
  "Dakit (Highway & Provincial Rd)",
  "Malingin Highway",
  "A/B Cogon",
  "Siocon",
  "Odlot",
  "Marangong",
  "Libertad",
  "Guadalupe",
];
const WASTE_TYPES = ["Malata", "Dili Malata"];
const FREQUENCIES = [
  "Daily",
  "Every Monday",
  "Every Tuesday",
  "Every Wednesday",
  "Every Thursday",
  "Every Friday",
  "Every Saturday",
];
const DAYS_OFF = ["Saturday", "Sunday"];

// const DAYS = ['MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT', 'SUN'];

// Color palette for routes
const ROUTE_COLORS = [
  "#28a745", // green
  "#007bff", // blue
  "#ffc107", // yellow
  "#6f42c1", // purple
  "#e83e8c", // pink
  "#fd7e14", // orange
  "#17a2b8", // teal
  "#dc3545", // red
  "#20c997", // cyan
  "#343a40", // dark gray
];

// Helper to format time as 12-hour with AM/PM
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${m} ${ampm}`;
}

const Schedule = () => {
  const [routes, setRoutes] = useState([]);
  const [, setSelectedRoute] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null for add, id for edit
  const [form, setForm] = useState(emptyRoute);
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(true);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoRoute] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "routes"), orderBy("route"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRoutes(data);
        // Always set selectedRoute to the first route if none is selected or if the selected route was deleted
        if (data.length > 0) {
          setSelectedRoute((prev) =>
            prev && data.some((r) => r.id === prev) ? prev : data[0].id
          );
        } else {
          setSelectedRoute(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    ); // Ensure loading is set to false on error
    return () => unsub();
    // eslint-disable-next-line
  }, []); // selectedRoute is intentionally not included to avoid infinite loop

  const [collectors, setCollectors] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "collectors"), orderBy("driver"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCollectors(data);
    });
    return () => unsub();
  }, []);

  // Get all drivers and all crew from collectors
  const allDrivers = collectors
    .filter((c) => c.status === "active")
    .map((c) => c.driver)
    .filter(Boolean);
  const allCrew = collectors.flatMap((c) =>
    (c.crew || []).map((member) =>
      typeof member === "string"
        ? member
        : [member.firstName, member.lastName].filter(Boolean).join(" ")
    )
  );

  // Form validation
  const validate = () => {
    const errors = {};
    if (!form.route) errors.route = "Route number is required";
    if (!form.driver) errors.driver = "Driver is required";
    if (!form.crew.filter((c) => c.trim()).length)
      errors.crew = "At least one crew member";
    if (!form.areas.filter((a) => a.trim()).length)
      errors.areas = "At least one area";
    if (!form.time) errors.time = "Collection start time is required";
    if (!form.endTime) errors.endTime = "Collection end time is required";
    if (!form.type) errors.type = "Waste type is required";
    if (!form.frequency) errors.frequency = "Frequency is required";
    if (!form.dayOff) errors.dayOff = "Day off is required";
    if (form.date && dayjs(form.date).isBefore(dayjs(), "day")) {
      errors.date = "Cannot add a schedule for a past date.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open add/edit modal
  const openAddModal = () => {
    setForm(emptyRoute);
    setEditId(null);
    setFormErrors({});
    setModalOpen(true);
  };
  const openEditModal = (route) => {
    setForm({ ...route, crew: [...route.crew], areas: [...route.areas] });
    setEditId(route.id);
    setFormErrors({});
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyRoute);
    setEditId(null);
    setFormErrors({});
  };

  // Form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Check for crew assignment conflicts
      const routesSnapshot = await getDocs(query(collection(db, "routes")));
      const allRoutes = routesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      let newCrewMembers = form.crew || [];
      if (typeof newCrewMembers === "string") {
        newCrewMembers = newCrewMembers.split(",").map((c) => c.trim());
      }
      newCrewMembers = newCrewMembers.filter((c) => c); // removes blanks
      // Check if any crew members are already assigned to other routes
      const assignedCrewMembers = [];
      for (const route of allRoutes) {
        // Skip the current route if editing
        if (editId && route.id === editId) continue;

        if (route.crew && Array.isArray(route.crew)) {
          for (const routeCrewMember of route.crew) {
            for (const newCrewMember of newCrewMembers) {
              if (routeCrewMember === newCrewMember) {
                assignedCrewMembers.push({
                  name: newCrewMember,
                  route: route.route,
                  driver: route.driver,
                });
              }
            }
          }
        }
      }

      // If crew members are already assigned, show error
      if (assignedCrewMembers.length > 0) {
        const crewList = assignedCrewMembers
          .map((c) => `${c.name} (Route ${c.route})`)
          .join("");
        setSnackbar({
          open: true,
          message: `Crew already assigned: ${crewList}`,
          severity: "error",
        });
        return;
      }

      // Always ensure coordinates is an array
      let coords = Array.isArray(form.coordinates) ? form.coordinates : [];
      // If only one coordinate, duplicate it
      if (coords.length === 1) {
        coords = [coords[0], coords[0]];
      }
      const formWithCoords = { ...form, coordinates: coords };
      if (editId) {
        await updateDoc(doc(db, "routes", editId), formWithCoords);
        setSnackbar({
          open: true,
          message: "Route updated!",
          severity: "success",
        });
      } else {
        // Assign a color based on route number or random if not available
        let color = ROUTE_COLORS[parseInt(form.route, 10) - 1];
        if (!color) {
          color = ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)];
        }
        const routeWithColor = { ...formWithCoords, color };
        await addDoc(collection(db, "routes"), routeWithColor);
        setSuccessModalOpen(true); // Show success modal
      }
      closeModal();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error saving route",
        severity: "error",
      });
    }
  };

  return (
    <div className="schedule-container">
      <div
        className="schedule-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
        }}
      >
        <div></div>
        <Button
          variant="contained"
          onClick={openAddModal}
          style={{
            background: "#336A29",
            color: "#fff",
            borderRadius: 20,
            fontWeight: 600,
            fontSize: "1.1rem",
            padding: "10px 32px",
          }}
        >
          Add Schedule
        </Button>
      </div>
      {/* Schedules Table */}
      <div style={{ padding: "0 40px 40px 40px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <thead>
            <tr style={{ background: "#f7f7d9" }}>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Route
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Driver
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Crew
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Barangays
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Time
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Kind of Garbage
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Frequency
              </th>
              <th style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}>
                Day Off
              </th>
              <th
                style={{ padding: 12, borderBottom: "2px solid #e0e0e0" }}
              ></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 10 }}>{route.route}</td>
                <td style={{ padding: 10 }}>{route.driver}</td>
                <td style={{ padding: 10 }}>
                  {route.crew &&
                    route.crew
                      .filter(Boolean)
                      .map((member) =>
                        typeof member === "string"
                          ? member
                          : [member.firstName, member.lastName]
                              .filter(Boolean)
                              .join(" ")
                      )
                      .join(" • ")}
                </td>
                <td style={{ padding: 10 }}>
                  {route.areas && route.areas.filter(Boolean).join(" • ")}
                </td>
                <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                  {formatTime12h(route.time)}
                  {route.endTime ? ` - ${formatTime12h(route.endTime)}` : ""}
                </td>
                <td style={{ padding: 10, paddingLeft: 35 }}>{route.type}</td>
                <td style={{ padding: 10 }}>{route.frequency}</td>
                <td style={{ padding: 10 }}>{route.dayOff}</td>
                <td style={{ padding: 10 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    style={{
                      color: "#4B8B3B",
                      borderColor: "#4B8B3B",
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#4B8B3B",
                        color: "#fff",
                        borderColor: "#4B8B3B",
                      },
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#4B8B3B";
                      e.target.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#4B8B3B";
                    }}
                    onClick={() => openEditModal(route)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={modalOpen} onClose={closeModal}>
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {editId ? "Edit Route" : "Add New Route"}
          <IconButton
            aria-label="close"
            onClick={closeModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Route Number</InputLabel>
            <Select
              label="Route Number"
              name="route"
              value={form.route}
              onChange={handleFormChange}
              error={!!formErrors.route}
            >
              {ROUTE_NUMBERS.map((num) => (
                <MenuItem key={num} value={num}>
                  {num}
                </MenuItem>
              ))}
            </Select>
            {formErrors.route && (
              <Typography color="error" variant="caption">
                {formErrors.route}
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Driver</InputLabel>
            <Select
              label="Driver"
              name="driver"
              value={form.driver}
              onChange={handleFormChange}
              error={!!formErrors.driver}
            >
              {allDrivers.map((driver) => (
                <MenuItem key={driver} value={driver}>
                  {driver}
                </MenuItem>
              ))}
            </Select>
            {formErrors.driver && (
              <Typography color="error" variant="caption">
                {formErrors.driver}
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Crew Members</InputLabel>
            <Select
              label="Crew Members"
              name="crew"
              multiple
              value={form.crew}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, crew: e.target.value }))
              }
              input={<OutlinedInput label="Crew Members" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.length > 0
                    ? selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))
                    : null}
                </Box>
              )}
            >
              {allCrew.map((crew) => (
                <MenuItem key={crew} value={crew}>
                  <Checkbox checked={form.crew.indexOf(crew) > -1} />
                  {crew}
                </MenuItem>
              ))}
            </Select>
            {formErrors.crew && (
              <Typography color="error" variant="caption">
                {formErrors.crew}
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Areas</InputLabel>
            <Select
              label="Areas"
              name="areas"
              multiple
              value={form.areas}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, areas: e.target.value }))
              }
              input={<OutlinedInput label="Areas" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.length > 0
                    ? selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))
                    : null}
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                  },
                },
              }}
            >
              <MenuItem
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #e0e0e0",
                  backgroundColor: "#f5f5f5",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Close the dropdown by blurring the select
                    const selectElement = e.target.closest(".MuiSelect-select");
                    if (selectElement) {
                      selectElement.blur();
                    }
                  }}
                  sx={{ color: "#666" }}
                ></IconButton>
              </MenuItem>
              {AREAS.map((area) => (
                <MenuItem key={area} value={area}>
                  <Checkbox checked={form.areas.indexOf(area) > -1} />
                  {area}
                </MenuItem>
              ))}
            </Select>
            {formErrors.areas && (
              <Typography color="error" variant="caption">
                {formErrors.areas}
              </Typography>
            )}
          </FormControl>
          <TextField
            margin="dense"
            label="Collection Start Time"
            type="time"
            fullWidth
            variant="outlined"
            name="time"
            value={form.time}
            onChange={handleFormChange}
            error={!!formErrors.time}
            helperText={formErrors.time}
          />
          <TextField
            margin="dense"
            label="Collection End Time"
            type="time"
            fullWidth
            variant="outlined"
            name="endTime"
            value={form.endTime}
            onChange={handleFormChange}
            error={!!formErrors.endTime}
            helperText={formErrors.endTime}
          />
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Waste Type</InputLabel>
            <Select
              label="Waste Type"
              name="type"
              value={form.type}
              onChange={handleFormChange}
              error={!!formErrors.type}
            >
              {WASTE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
            {formErrors.type && (
              <Typography color="error" variant="caption">
                {formErrors.type}
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Frequency</InputLabel>
            <Select
              label="Frequency"
              name="frequency"
              value={form.frequency}
              onChange={handleFormChange}
              error={!!formErrors.frequency}
            >
              {FREQUENCIES.map((freq) => (
                <MenuItem key={freq} value={freq}>
                  {freq}
                </MenuItem>
              ))}
            </Select>
            {formErrors.frequency && (
              <Typography color="error" variant="caption">
                {formErrors.frequency}
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel>Day Off</InputLabel>
            <Select
              label="Day Off"
              name="dayOff"
              value={form.dayOff}
              onChange={handleFormChange}
              error={!!formErrors.dayOff}
            >
              {DAYS_OFF.map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </Select>
            {formErrors.dayOff && (
              <Typography color="error" variant="caption">
                {formErrors.dayOff}
              </Typography>
            )}
          </FormControl>
          {form.coordinates &&
            form.coordinates.length > 0 &&
            form.coordinates.map((coord, idx) => (
              <Box
                key={idx}
                sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}
              >
                <TextField
                  label="Latitude"
                  type="number"
                  value={
                    coord.latitude !== undefined
                      ? coord.latitude
                      : Array.isArray(coord)
                      ? coord[0]
                      : ""
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm((prev) => {
                      const coords = [...(prev.coordinates || [])];
                      if (
                        typeof coords[idx] === "object" &&
                        coords[idx] !== null &&
                        coords[idx].latitude !== undefined
                      ) {
                        coords[idx] = { ...coords[idx], latitude: val };
                      } else if (Array.isArray(coords[idx])) {
                        coords[idx] = [val, coords[idx][1]];
                      } else {
                        coords[idx] = [val, ""];
                      }
                      return { ...prev, coordinates: coords };
                    });
                  }}
                  size="small"
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Longitude"
                  type="number"
                  value={
                    coord.longitude !== undefined
                      ? coord.longitude
                      : Array.isArray(coord)
                      ? coord[1]
                      : ""
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm((prev) => {
                      const coords = [...(prev.coordinates || [])];
                      if (
                        typeof coords[idx] === "object" &&
                        coords[idx] !== null &&
                        coords[idx].longitude !== undefined
                      ) {
                        coords[idx] = { ...coords[idx], longitude: val };
                      } else if (Array.isArray(coords[idx])) {
                        coords[idx] = [coords[idx][0], val];
                      } else {
                        coords[idx] = ["", val];
                      }
                      return { ...prev, coordinates: coords };
                    });
                  }}
                  size="small"
                  sx={{ width: 120 }}
                />
                {form.coordinates.length > 1 && (
                  <Button
                    onClick={() => {
                      setForm((prev) => {
                        const coords = [...(prev.coordinates || [])];
                        coords.splice(idx, 1);
                        return { ...prev, coordinates: coords };
                      });
                    }}
                    color="error"
                    size="small"
                    sx={{ minWidth: 0, px: 1 }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {loading ? (
              <CircularProgress size={24} />
            ) : editId ? (
              "Update"
            ) : (
              "Add"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      {successModalOpen && (
        <div className="collector-modal-bg">
          <div className="collector-modal">
            <h2>Schedule Added!</h2>
            <div style={{ textAlign: "center", margin: "18px 0" }}>
              The schedule has been added successfully.
            </div>
            <div style={{ textAlign: "center" }}>
              <button
                className="primary-btn"
                onClick={() => setSuccessModalOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <DialogTitle>Schedule Info</DialogTitle>
        <DialogContent>
          {infoRoute && (
            <>
              <Typography>
                <b>Route:</b> {infoRoute.route}
              </Typography>
              <Typography>
                <b>Driver:</b> {infoRoute.driver}
              </Typography>
              <Typography>
                <b>Crew:</b> {infoRoute.crew && infoRoute.crew.join(", ")}
              </Typography>
              <Typography>
                <b>Areas:</b> {infoRoute.areas && infoRoute.areas.join(", ")}
              </Typography>
              <Typography>
                <b>Collection Time:</b> {infoRoute.time}
              </Typography>
              <Typography>
                <b>Waste Type:</b> {infoRoute.type}
              </Typography>
              <Typography>
                <b>Frequency:</b> {infoRoute.frequency}
              </Typography>
              <Typography>
                <b>Day Off:</b> {infoRoute.dayOff}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoModalOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "center", horizontal: "center" }}
        sx={{
          "& .MuiSnackbar-root": {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          },
        }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Schedule;
