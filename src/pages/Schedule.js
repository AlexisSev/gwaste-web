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
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  DialogContentText,
  CircularProgress,
} from "@mui/material";
import { Add, Edit, Delete, Group, AccessTime, DeleteOutline, CalendarToday, Recycling } from "@mui/icons-material";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

const emptyRoute = {
  route: "",
  driver: "",
  crew: [""],
  areas: [""],
  time: "",
  type: "",
  frequency: "",
  dayOff: "",
  specialCollection: "",
};

const Schedule = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null for add, id for edit
  const [form, setForm] = useState(emptyRoute);
  const [formErrors, setFormErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(true);

  // Load routes from Firestore
  useEffect(() => {
    const q = query(collection(db, "routes"), orderBy("route"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRoutes(data);
      // Always set selectedRoute to the first route if none is selected or if the selected route was deleted
      if (data.length > 0) {
        setSelectedRoute((prev) => (prev && data.some(r => r.id === prev) ? prev : data[0].id));
      } else {
        setSelectedRoute(null);
      }
      setLoading(false);
    }, () => setLoading(false)); // Ensure loading is set to false on error
    return () => unsub();
    // eslint-disable-next-line
  }, []); // selectedRoute is intentionally not included to avoid infinite loop

  // Form validation
  const validate = () => {
    const errors = {};
    if (!form.route) errors.route = "Route number is required";
    if (!form.driver) errors.driver = "Driver is required";
    if (!form.crew.filter((c) => c.trim()).length) errors.crew = "At least one crew member";
    if (!form.areas.filter((a) => a.trim()).length) errors.areas = "At least one area";
    if (!form.time) errors.time = "Collection time is required";
    if (!form.type) errors.type = "Waste type is required";
    if (!form.frequency) errors.frequency = "Frequency is required";
    if (!form.dayOff) errors.dayOff = "Day off is required";
    if (!form.specialCollection) errors.specialCollection = "Special collection is required";
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
  const handleArrayChange = (field, idx, value) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });
  };
  const addArrayField = (field) => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };
  const removeArrayField = (field, idx) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editId) {
        await updateDoc(doc(db, "routes", editId), form);
        setSnackbar({ open: true, message: "Route updated!", severity: "success" });
      } else {
        const docRef = await addDoc(collection(db, "routes"), form);
        setSnackbar({ open: true, message: "Route added!", severity: "success" });
        setSelectedRoute(docRef.id);
      }
      closeModal();
    } catch (err) {
      setSnackbar({ open: true, message: "Error saving route", severity: "error" });
    }
  };

  // Delete
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "routes", deleteId));
      setSnackbar({ open: true, message: "Route deleted!", severity: "success" });
      setDeleteDialogOpen(false);
      setDeleteId(null);
    } catch (err) {
      setSnackbar({ open: true, message: "Error deleting route", severity: "error" });
    }
  };

  // UI
  const selected = routes.find((r) => r.id === selectedRoute);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
      <Typography variant="h4" fontWeight={700} mb={1} color="green">
        Schedule Management (Admin)
      </Typography>
      <Typography variant="subtitle1" mb={2}>
        Manage collection schedules and routes
      </Typography>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={openAddModal}
        sx={{ mb: 2, bgcolor: "green", ":hover": { bgcolor: "darkgreen" } }}
      >
        Add Route
      </Button>
      {/* Route Selector */}
      <Stack direction="row" spacing={2} mb={3}>
        {routes.map((r) => (
          <Chip
            key={r.id}
            label={`Route ${r.route}`}
            color={selectedRoute === r.id ? "success" : "default"}
            onClick={() => setSelectedRoute(r.id)}
            sx={{ fontWeight: 700, fontSize: 16 }}
            onDelete={() => openEditModal(r)}
            deleteIcon={<Edit />}
          />
        ))}
      </Stack>
      {/* Route Details */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : selected ? (
        <Box sx={{ bgcolor: "#fff", borderRadius: 3, boxShadow: 2, p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={600} color="green">
              Driver:
            </Typography>
            <Group color="success" />
            <Typography variant="h6">{selected.driver}</Typography>
            <IconButton color="primary" onClick={() => openEditModal(selected)}>
              <Edit />
            </IconButton>
            <IconButton color="error" onClick={() => { setDeleteDialogOpen(true); setDeleteId(selected.id); }}>
              <Delete />
            </IconButton>
          </Stack>
          <Divider />
          <Typography mt={2} fontWeight={600}>
            Crew Members:
          </Typography>
          <List dense>
            {selected.crew.map((member, i) => (
              <ListItem key={i}>
                <ListItemText primary={member} />
              </ListItem>
            ))}
          </List>
          <Divider />
          <Typography mt={2} fontWeight={600}>
            Areas Covered:
          </Typography>
          <List dense>
            {selected.areas.map((area, i) => (
              <ListItem key={i}>
                <ListItemText primary={area} />
              </ListItem>
            ))}
          </List>
          <Divider />
          <Stack direction="row" spacing={3} mt={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTime color="success" />
              <Typography>Collection Time: {selected.time}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <DeleteOutline color="success" />
              <Typography>Waste Type: {selected.type}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarToday color="success" />
              <Typography>Frequency: {selected.frequency} (Day Off: {selected.dayOff})</Typography>
            </Stack>
          </Stack>
          <Box mt={3} p={2} bgcolor="#e6ffe6" borderRadius={2} display="flex" alignItems="center">
            <Recycling color="success" sx={{ mr: 1 }} />
            <Typography color="green" fontWeight={700}>
              {selected.specialCollection}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Typography color="text.secondary" mt={4} align="center">
          No route selected.
        </Typography>
      )}
      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Route" : "Add Route"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              label="Route Number"
              name="route"
              value={form.route}
              onChange={handleFormChange}
              error={!!formErrors.route}
              helperText={formErrors.route}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Driver"
              name="driver"
              value={form.driver}
              onChange={handleFormChange}
              error={!!formErrors.driver}
              helperText={formErrors.driver}
              fullWidth
              margin="normal"
              required
            />
            <Typography fontWeight={600} mt={2} mb={1}>Crew Members</Typography>
            {form.crew.map((member, idx) => (
              <Box key={idx} display="flex" alignItems="center" mb={1}>
                <TextField
                  value={member}
                  onChange={e => handleArrayChange("crew", idx, e.target.value)}
                  error={!!formErrors.crew && !member.trim()}
                  helperText={idx === 0 && formErrors.crew}
                  required
                  fullWidth
                  size="small"
                />
                {form.crew.length > 1 && (
                  <IconButton onClick={() => removeArrayField("crew", idx)} color="error">
                    <Delete />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button onClick={() => addArrayField("crew")}>+ Add Crew</Button>
            <Typography fontWeight={600} mt={2} mb={1}>Areas Covered</Typography>
            {form.areas.map((area, idx) => (
              <Box key={idx} display="flex" alignItems="center" mb={1}>
                <TextField
                  value={area}
                  onChange={e => handleArrayChange("areas", idx, e.target.value)}
                  error={!!formErrors.areas && !area.trim()}
                  helperText={idx === 0 && formErrors.areas}
                  required
                  fullWidth
                  size="small"
                />
                {form.areas.length > 1 && (
                  <IconButton onClick={() => removeArrayField("areas", idx)} color="error">
                    <Delete />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button onClick={() => addArrayField("areas")}>+ Add Area</Button>
            <TextField
              label="Collection Time"
              name="time"
              value={form.time}
              onChange={handleFormChange}
              error={!!formErrors.time}
              helperText={formErrors.time}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Waste Type"
              name="type"
              value={form.type}
              onChange={handleFormChange}
              error={!!formErrors.type}
              helperText={formErrors.type}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Frequency"
              name="frequency"
              value={form.frequency}
              onChange={handleFormChange}
              error={!!formErrors.frequency}
              helperText={formErrors.frequency}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Day Off"
              name="dayOff"
              value={form.dayOff}
              onChange={handleFormChange}
              error={!!formErrors.dayOff}
              helperText={formErrors.dayOff}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Special Collection"
              name="specialCollection"
              value={form.specialCollection}
              onChange={handleFormChange}
              error={!!formErrors.specialCollection}
              helperText={formErrors.specialCollection}
              fullWidth
              margin="normal"
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="contained" color="success">
              {editId ? "Save" : "Add"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Route</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this route? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Schedule;