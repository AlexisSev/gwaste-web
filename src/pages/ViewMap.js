import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./ViewMap.css";
import { fetchORSRoute } from '../utils/ors';

// User SVG icon generator for Leaflet
function getUserIcon() {
  return L.divIcon({
    className: 'user-marker',
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="12" r="7" fill="#007bff" stroke="#fff" stroke-width="2"/>
        <ellipse cx="16" cy="25" rx="10" ry="5" fill="#007bff" fill-opacity="0.3"/>
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 24]
  });
}

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const ViewMap = () => {
  const [map, setMap] = useState(null);
  const [truckMarkers, setTruckMarkers] = useState({});
  const [routePolylines, setRoutePolylines] = useState({});
  const [selectedRoute, setSelectedRoute] = useState('');
  const [timers, setTimers] = useState({});
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const userMarkerRef = useRef(null);

  const truckMarkersRef = useRef({}); // Store markers for each truck
  const truckIntervalsRef = useRef({}); // Store intervals for each truck
  const [routeConfig, setRouteConfig] = useState([]);
  const userTruckRef = useRef(null); // Store user truck marker
  const userTruckIntervalRef = useRef(null); // Store user truck update interval

  // Listen to Firestore for live route updates
  useEffect(() => {
    const q = query(collection(db, "routes"), orderBy("route"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRouteConfig(data);
      // Set default selected route if not set
      if (data.length > 0 && !selectedRoute) {
        setSelectedRoute(data[0].route);
      }
    });
    return () => unsub();
  }, []);

  // Initialize map and setup Firestore listeners
  useEffect(() => {
    // Initialize map after component mounts
    const timer = setTimeout(() => {
      if (!map) {
        initializeMap();
      }
    }, 100);
    setupFirestoreListeners();
    return () => {
      clearTimeout(timer);
      Object.values(timers).forEach(timer => {
        if (timer) clearInterval(timer);
      });
      if (userTruckIntervalRef.current) {
        clearInterval(userTruckIntervalRef.current);
      }
      if (map) {
        map.remove();
        setMap(null);
      }
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!map) return;

    // Remove any existing markers, intervals, and polylines
    Object.values(truckMarkersRef.current).forEach(marker => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    Object.values(truckIntervalsRef.current).forEach(interval => clearInterval(interval));
    truckMarkersRef.current = {};
    truckIntervalsRef.current = {};

    // Remove existing user truck
    if (userTruckRef.current && map.hasLayer(userTruckRef.current)) {
      map.removeLayer(userTruckRef.current);
    }
    if (userTruckIntervalRef.current) {
      clearInterval(userTruckIntervalRef.current);
    }

    // Draw all route polylines
    routeConfig.forEach(route => {
      const coords = Array.isArray(route.coordinates) ? route.coordinates : [];
      if (!coords || coords.length < 2) {
        console.warn(`Route ${route.route} has invalid or missing coordinates:`, coords);
        return;
      }
      // Convert Geopoint coordinates, arrays, or numbers to [lat, lng] arrays
      const validCoords = coords
        .map(pt => {
          if (!pt) return null;
          // Geopoint object
          if (typeof pt === 'object' && pt.latitude !== undefined && pt.longitude !== undefined) {
            return [pt.latitude, pt.longitude];
          }
          // Alternative Geopoint object
          if (typeof pt === 'object' && pt.lat !== undefined && pt.lng !== undefined) {
            return [pt.lat, pt.lng];
          }
          // Array of numbers
          if (Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
            return pt;
          }
          // Flat array of numbers (e.g. [lat, lng] as numbers in the main array)
          if (typeof pt === 'number' && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            return [coords[0], coords[1]];
          }
          return null;
        })
        .filter(pt => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number');
      if (validCoords.length < 2) {
        console.warn(`Route ${route.route} does not have at least 2 valid coordinates:`, validCoords);
        return;
      }
      L.polyline(validCoords, { color: route.color || '#007bff', weight: 4, opacity: 0.7 }).addTo(map);
    });

    // Animate truck for selected route only
    const selected = routeConfig.find(r => r.route === selectedRoute);
    if (selected) {
      const coords = Array.isArray(selected.coordinates) ? selected.coordinates : [];
      if (coords && coords.length >= 2) {
        const validCoords = coords
          .map(pt => {
            if (!pt) return null;
            if (typeof pt === 'object' && pt.latitude !== undefined && pt.longitude !== undefined) {
              return [pt.latitude, pt.longitude];
            }
            if (typeof pt === 'object' && pt.lat !== undefined && pt.lng !== undefined) {
              return [pt.lat, pt.lng];
            }
            if (Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
              return pt;
            }
            if (typeof pt === 'number' && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
              return [coords[0], coords[1]];
            }
            return null;
          })
          .filter(pt => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number');
        if (validCoords.length >= 2) {
          // Create a simple truck marker (colored div with emoji)
          const truckIcon = L.divIcon({
            className: 'truck-marker',
            html: `
              <div style="
                width: 24px; 
                height: 24px; 
                background-color: ${selected.color || '#007bff'}; 
                border: 2px solid #333; 
                border-radius: 4px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: white; 
                font-weight: bold; 
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">
                🚛
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          const marker = L.marker(validCoords[0], { icon: truckIcon }).addTo(map);
          console.log('TRUCK MARKER CREATED at', validCoords[0]);
          marker.bindPopup(`
            <div class="truck-popup">
              <h4>Route ${selected.route}</h4>
              <p><strong>Driver:</strong> ${selected.driver || 'Unknown'}</p>
              <p><strong>Status:</strong> Simulated Truck</p>
            </div>
          `);
          truckMarkersRef.current[selected.route] = marker;
          // Animate truck along route (loop)
          let currentIndex = 0;
          const interval = setInterval(() => {
            currentIndex++;
            if (currentIndex >= validCoords.length) {
              currentIndex = 0;
            }
            marker.setLatLng(validCoords[currentIndex]);
            console.log('TRUCK MOVED to', validCoords[currentIndex]);
          }, 1000);
          truckIntervalsRef.current[selected.route] = interval;
        } else {
          console.warn('No valid coordinates for truck animation:', validCoords);
        }
      } else {
        console.warn('No coordinates array or not enough points for selected route:', coords);
      }
    }

    // Cleanup on unmount
    return () => {
      Object.values(truckMarkersRef.current).forEach(marker => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
      Object.values(truckIntervalsRef.current).forEach(interval => clearInterval(interval));
      truckMarkersRef.current = {};
      truckIntervalsRef.current = {};
      if (userTruckRef.current && map.hasLayer(userTruckRef.current)) {
        map.removeLayer(userTruckRef.current);
      }
      if (userTruckIntervalRef.current) {
        clearInterval(userTruckIntervalRef.current);
      }
    };
    // eslint-disable-next-line
  }, [map, routeConfig, selectedRoute]);

  // Optionally, you can keep the geolocation effect for user location, but don't overwrite routeConfig
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(function(position) {
      setUserLocation([position.coords.latitude, position.coords.longitude]);
    });
  }, []);

  // Add user marker to the map
  useEffect(() => {
    if (!map || !userLocation) return;
    // Remove previous user marker if exists
    if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
      map.removeLayer(userMarkerRef.current);
    }
    // Remove previous user truck if exists
    if (userTruckRef.current && map.hasLayer(userTruckRef.current)) {
      map.removeLayer(userTruckRef.current);
    }

    // Add new user marker
    const marker = L.marker(userLocation, { icon: getUserIcon() }).addTo(map);
    marker.bindPopup('<b>Your Location</b>');
    userMarkerRef.current = marker;

    // Create truck route from Bogo City Hall to user location
    const createTruckRoute = async () => {
      try {
        // Bogo City Hall coordinates [longitude, latitude] for ORS
        const bogoCityHall = [123.97938020226853, 11.04648668975812];
        const userCoords = [userLocation[1], userLocation[0]]; // Convert to [lng, lat]

        console.log('Creating route from Bogo City Hall to user location...');
        
        // Get the route using ORS
        const routeCoords = await fetchORSRoute([bogoCityHall, userCoords]);
        
        if (routeCoords && routeCoords.length > 0) {
          // Convert to Leaflet format [lat, lng]
          const leafletCoords = routeCoords.map(([lng, lat]) => [lat, lng]);
          
          // Draw the route polyline
          const routePolyline = L.polyline(leafletCoords, { 
            color: '#dc3545', 
            weight: 4, 
            opacity: 0.7,
            dashArray: '10, 5' // Dashed line to distinguish from other routes
          }).addTo(map);
          
          // Add truck at Bogo City Hall
          // const userTruckIcon = getTruckIcon('#dc3545'); // Red color for user truck
          // const userTruck = L.marker(leafletCoords[0], { icon: userTruckIcon }).addTo(map);
          // console.log('Truck created at position:', leafletCoords[0]);
          // console.log('Truck marker added to map:', userTruck);
          // userTruck.bindPopup(`
          //   <div class="truck-popup">
          //     <h4>Your Truck</h4>
          //     <p><strong>Status:</strong> En route to your location</p>
          //     <p><strong>From:</strong> Bogo City Hall</p>
          //     <p><strong>To:</strong> Your location</p>
          //   </div>
          // `);
          // userTruckRef.current = userTruck;
          
          // Animate truck along the route
          // let currentIndex = 0;
          // const truckInterval = setInterval(() => {
          //   currentIndex++;
          //   console.log(`Moving truck to position ${currentIndex}/${leafletCoords.length}:`, leafletCoords[currentIndex]);
          //   if (currentIndex >= leafletCoords.length) {
          //     // Truck reached destination
          //     console.log('Truck reached destination');
          //     userTruck.getPopup().setContent(`
          //       <div class="truck-popup">
          //         <h4>Your Truck</h4>
          //         <p><strong>Status:</strong> Arrived at your location</p>
          //         <p><strong>Position:</strong> ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}</p>
          //       </div>
          //     `);
          //     clearInterval(truckInterval);
          //     return;
          //   }
          //   userTruck.setLatLng(leafletCoords[currentIndex]);
          // }, 1000); // Move every second
          
          // userTruckIntervalRef.current = truckInterval;
          
          console.log(`Truck route created with ${leafletCoords.length} points`);
        } else {
          console.error('Failed to get route from ORS');
        }
      } catch (error) {
        console.error('Error creating truck route:', error);
        // Fallback: just place truck at user location
        // const userTruckIcon = getTruckIcon('#dc3545');
        // const userTruck = L.marker(userLocation, { icon: userTruckIcon }).addTo(map);
        // userTruck.bindPopup(`
        //   <div class="truck-popup">
        //     <h4>Your Truck</h4>
        //     <p><strong>Status:</strong> At your location</p>
        //     <p><strong>Position:</strong> ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}</p>
        //   </div>
        // `);
        // userTruckRef.current = userTruck;
      }
    };
    
    // Start creating the truck route
    createTruckRoute();

    // Optionally, center map on user location
    // map.setView(userLocation, 15);
    // Cleanup on unmount or location/map change
    return () => {
      if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
        map.removeLayer(userMarkerRef.current);
      }
      if (userTruckRef.current && map.hasLayer(userTruckRef.current)) {
        map.removeLayer(userTruckRef.current);
      }
      if (userTruckIntervalRef.current) {
        clearInterval(userTruckIntervalRef.current);
      }
    };
  }, [map, userLocation]);

  const initializeMap = () => {
    // Check if map container exists
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.warn("Map container not found");
      return;
    }

    // Check if map container already has a map
    if (mapContainer._leaflet_id) {
      console.warn("Map already initialized");
      return;
    }

    try {
      const mapInstance = L.map("map").setView([11.0517, 123.9866], 13); // Bogo City center

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance);

      setMap(mapInstance);
      mapRef.current = mapInstance;
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const setupFirestoreListeners = () => {
    // Listen for truck position updates
    const trucksRef = collection(db, 'trucks');
    const unsubscribe = onSnapshot(trucksRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const truckData = change.doc.data();
          // setTruckPositions(prev => ({
          //   ...prev,
          //   [truckData.routeId]: [truckData.lat, truckData.lng]
          // }));
        }
      });
    });

    return unsubscribe;
  };

  const createTruckMarker = (routeId, position) => {
    const marker = L.marker(position, {
      icon: L.divIcon({ // Changed from getTruckIcon
        className: 'truck-marker',
        html: `
          <div style="
            width: 24px; 
            height: 24px; 
            background-color: ${getRouteColor(routeId)}; 
            border: 2px solid #333; 
            border-radius: 4px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            🚛
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    
    marker.bindPopup(`
      <div class="truck-popup">
        <h4>Route ${routeId}</h4>
        <p><strong>Driver:</strong> ${getCurrentRoute(routeId)?.driver || 'Unknown'}</p>
        <p><strong>Status:</strong> Active</p>
        <p><strong>Position:</strong> ${position[0].toFixed(4)}, ${position[1].toFixed(4)}</p>
      </div>
    `);
    
    return marker;
  };

  const createRoutePolyline = (routeId, coordinates) => {
    return L.polyline(coordinates, {
      color: getRouteColor(routeId),
      weight: 4,
      opacity: 0.7,
    });
  };

  const getRouteColor = (routeId) => {
    const route = routeConfig.find(r => r.route === routeId);
    return route ? route.color : '#666';
  };

  const getCurrentRoute = (routeId = selectedRoute) => {
    return routeConfig.find(route => route.route === routeId);
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Helper to get unique routes by route number
  const uniqueRoutes = Object.values(
    routeConfig.reduce((acc, route) => {
      if (!acc[route.route]) acc[route.route] = route;
      return acc;
    }, {})
  );

  return (
    <div className="view-map-container">
      {/* <div className="map-header">
        <h2>🚛 Collection Map & Truck Tracking</h2>
        <p>Monitor truck routes in real-time</p>
      </div> */}

      {/* Route Legend */}
      {/* <div className="route-legend">
        <h4>Route Legend</h4>
        <div className="legend-items">
          {routeConfig.map(route => (
            <div key={route.route} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: route.color }}
              ></div>
              <span>Route {route.route} - {route.driver}</span>
            </div>
          ))}
        </div>
      </div> */}
      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <span>{notification.message}</span>
            <button onClick={() => removeNotification(notification.id)}>×</button>
          </div>
        ))}
      </div>
      <div className="map-controls">
        {/* Truck Controls */}
        <div className="truck-controls">
          <div className="control-group">
            <label>Route Selection:</label>
            <select 
              value={selectedRoute} 
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="route-selector"
            >
              {uniqueRoutes.map(route => (
                <option key={route.route} value={route.route}>
                  Route {route.route} - {route.driver}
                </option>
              ))}
            </select>
          </div>
          <div className="control-buttons">
            <button 
              className="info-btn"
              onClick={() => setShowRouteInfo(!showRouteInfo)}
            >
              ℹ️ Route Info
            </button>
          </div>
        </div>
        {/* Removed map-actions (Generate Route, Refresh Map) */}
      </div>
      <div className="map-container" style={{ position: 'relative' }}>
        <div id="map" className="osm-map">
          <div className="map-overlay-legend">
            <h4>Route Legend</h4>
            <div className="legend-items">
              {uniqueRoutes.map(route => (
                <div key={route.route} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: route.color }}
                  ></div>
                  <span>Route {route.route} - {route.driver}</span>
                </div>
              ))}
            </div>
          </div>
          {showRouteInfo && (
            <div className="route-info-panel map-overlay-info" style={{marginTop: '50px'}}>
              <h4 style={{margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: '#222', letterSpacing: '0.5px'}}>Route Information</h4>
              {getCurrentRoute() && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '7px'}}>
                    <div className="legend-color" style={{backgroundColor: getCurrentRoute().color}}></div>
                    <span style={{fontWeight: 600, color: '#222', fontSize: '13px'}}>Route {getCurrentRoute().route} - {getCurrentRoute().driver}</span>
                  </div>
                  <div style={{fontSize: '12px', color: '#333', marginTop: '4px'}}>
                    <div><b>Schedule:</b> {getCurrentRoute().time}</div>
                    <div><b>Type:</b> {getCurrentRoute().type}</div>
                    <div><b>Frequency:</b> {getCurrentRoute().frequency}</div>
                    <div><b>Day Off:</b> {getCurrentRoute().dayOff}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewMap; 