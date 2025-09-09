import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import "./ViewMap.css";

// Fix for Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const ViewMap = () => {
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const truckMarkersRef = useRef({});
  const driverCacheRef = useRef({}); // Cache driver data by ID
  const [trucks, setTrucks] = useState([]); // all trucks for list view
  const [selectedTruckId, setSelectedTruckId] = useState(null);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (!map) return;

    // Subscribe to Firestore "locations"
    const locationsRef = collection(db, "locations");
    const unsubscribe = onSnapshot(locationsRef, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data();
        const id = data.collector_id;

        if (!data.latitude || !data.longitude) continue;
        const coords = [data.latitude, data.longitude];

        // 🔹 Fetch driver info (from collectors collection)
        let driverInfo = driverCacheRef.current[id];
        if (!driverInfo) {
          try {
            const driverDoc = await getDoc(doc(db, "collectors", id));
            if (driverDoc.exists()) {
              driverInfo = driverDoc.data();
              driverCacheRef.current[id] = driverInfo;
            } else {
              driverInfo = { collector_name: "Unknown Driver" };
            }
          } catch {
            driverInfo = { collector_name: "Unknown Driver" };
          }
        }

        if (change.type === "added" || change.type === "modified") {
          if (truckMarkersRef.current[id]) {
            // Update existing marker
            truckMarkersRef.current[id].setLatLng(coords);
          } else {
            // Create truck marker
            const truckIcon = L.divIcon({
              className: "truck-marker",
              html: `<div style="
                width: 32px; 
                height: 32px; 
                background-color: #007bff; 
                border-radius: 8px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 18px;
              ">🚛</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            const marker = L.marker(coords, { icon: truckIcon }).addTo(map);

            const popupHtml = `
              <div style="text-align:center;min-width:160px">
                ${
                  driverInfo.profile_image
                    ? `<img src="${driverInfo.profile_image}" alt="Driver" style="width:48px;height:48px;border-radius:50%;margin-bottom:6px"/>`
                    : "🚛"
                }
                <h4 style="margin:4px 0">${driverInfo.collector_name || "Driver"}</h4>
                <p style="margin:0;font-size:13px"><b>Lat:</b> ${data.latitude.toFixed(
                  5
                )}, <b>Lng:</b> ${data.longitude.toFixed(5)}</p>
                <p style="margin:0;font-size:12px;color:#666">Last update: ${new Date(
                  data.updated_at
                ).toLocaleTimeString()}</p>
              </div>
            `;

            marker.bindPopup(popupHtml);
            truckMarkersRef.current[id] = marker;
          }
        }

        if (change.type === "removed") {
          if (truckMarkersRef.current[id]) {
            map.removeLayer(truckMarkersRef.current[id]);
            delete truckMarkersRef.current[id];
          }
        }
      }

      // Build trucks list for sidebar
      const list = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const id = data.collector_id;
        if (!data.latitude || !data.longitude) continue;

        let driverInfo = driverCacheRef.current[id];
        if (!driverInfo) {
          try {
            const driverDoc = await getDoc(doc(db, "collectors", id));
            if (driverDoc.exists()) {
              driverInfo = driverDoc.data();
              driverCacheRef.current[id] = driverInfo;
            } else {
              driverInfo = { collector_name: "Unknown Driver" };
            }
          } catch {
            driverInfo = { collector_name: "Unknown Driver" };
          }
        }

        list.push({
          id,
          latitude: data.latitude,
          longitude: data.longitude,
          updatedAt: data.updated_at,
          driverName: driverInfo.collector_name || driverInfo.driver || "Driver",
          profileImage: driverInfo.profile_image || null,
        });
      }
      setTrucks(list);
    });

    return () => unsubscribe();
  }, [map]);

  const initializeMap = () => {
    if (mapRef.current) return;
    const mapInstance = L.map("map").setView([11.0517, 123.9866], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance);
    setMap(mapInstance);
    mapRef.current = mapInstance;
  };

  return (
    <div className="view-map-container">
      <div className="map-container">
        <div id="map" className="osm-map"></div>
      </div>

      {/* Trucks overlay list */}
      <div className="map-overlay-legend trucks-overlay" style={{ pointerEvents: 'auto' }}>
        <h4>Trucks</h4>
        <div className="legend-items">
          {trucks.map((t) => (
            <div
              key={t.id}
              className="legend-item truck-item"
              onClick={() => {
                setSelectedTruckId(t.id);
                const marker = truckMarkersRef.current[t.id];
                if (marker) {
                  map.panTo([t.latitude, t.longitude]);
                  marker.openPopup();
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="legend-color" style={{ background: '#28a745' }}></div>
              <span className="truck-name">{t.driverName}</span>
            </div>
          ))}
          {trucks.length === 0 && <div className="legend-item empty"><span>No trucks online</span></div>}
        </div>
      </div>

      {/* Selected truck details */}
      {selectedTruckId && (
        <div className="map-overlay-info">
          {(() => {
            const t = trucks.find((x) => x.id === selectedTruckId);
            if (!t) return null;
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {t.profileImage ? (
                    <img src={t.profileImage} alt="Driver" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  ) : (
                    <span role="img" aria-label="truck">🚛</span>
                  )}
                  <strong>{t.driverName}</strong>
                </div>
                <div style={{ fontSize: 12, color: '#333' }}>
                  <div><b>Lat:</b> {t.latitude.toFixed(5)}</div>
                  <div><b>Lng:</b> {t.longitude.toFixed(5)}</div>
                  <div><b>Last update:</b> {new Date(t.updatedAt).toLocaleString()}</div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button className="detail-btn primary" onClick={() => {
                    const marker = truckMarkersRef.current[t.id];
                    if (marker) marker.openPopup();
                  }}>Open Popup</button>
                  <button className="detail-btn secondary" onClick={() => setSelectedTruckId(null)}>Close</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ViewMap;
