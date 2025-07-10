import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import "./ViewMap.css";
import { fetchORSRoute } from '../utils/ors';

// Truck SVG icon generator for Leaflet
function getTruckIcon(color) {
  return L.divIcon({
    className: 'truck-marker',
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="13" width="18" height="10" rx="2" fill="${color}" stroke="#222" stroke-width="1.5"/>
        <rect x="21" y="16" width="7" height="7" rx="1.5" fill="#bbb" stroke="#222" stroke-width="1.5"/>
        <circle cx="8.5" cy="25.5" r="2.5" fill="#222"/>
        <circle cx="24.5" cy="25.5" r="2.5" fill="#222"/>
        <rect x="6" y="15" width="8" height="4" rx="1" fill="#fff"/>
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

// Use state for routeConfig
const initialRouteConfig = [
  {
    route: '1',
    driver: 'MARIO ALAGASE',
    crew: ['AGOSTINE ESTRERA JR', 'ROBERTO DEL CARMEN', 'JOEY CANTAY'],
    areas: ['Bogo City Hall', 'Gairan'],
    coordinates: [
      // [11.0517, 123.9866], 
      // [11.0801, 123.9957]  
    ],
    time: '7 AM - 3 PM',
    type: 'DILI MALATA',
    frequency: 'DAILY',
    dayOff: 'SUNDAY',
    specialCollection: 'MALATA - Every WEDNESDAY',
    color: '#28a745',
    status: 'active'
  }
];

const ViewMap = () => {
  const [map, setMap] = useState(null);
  const [truckMarkers, setTruckMarkers] = useState({});
  const [routePolylines, setRoutePolylines] = useState({});
  const [selectedRoute, setSelectedRoute] = useState('1');
  const [truckPositions, setTruckPositions] = useState({});
  const [isTracking, setIsTracking] = useState(true); // Start tracking by default
  const [trackingSpeed, setTrackingSpeed] = useState(0.3);
  const [timers, setTimers] = useState({});
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const mapRef = useRef(null);

  const truckMarkersRef = useRef({}); // Store markers for each truck
  const truckIntervalsRef = useRef({}); // Store intervals for each truck
  const [routeConfig, setRouteConfig] = useState(initialRouteConfig);

  // Route data for truck tracking
  // Restore original routeConfig with manually defined coordinates
  // const routeConfig = [
  //   {
  //     route: '1',
  //     driver: 'MARIO ALAGASE',
  //     crew: ['AGOSTINE ESTRERA JR', 'ROBERTO DEL CARMEN', 'JOEY CANTAY'],
  //     areas: ['Don Pedro', 'Polambato', 'Cayang', 'Taylayan', 'Cogon'],
  //     coordinates: [
  //       [11.046741, 123.979485],
  //       [11.046892, 123.980312],
  //       [11.047073, 123.981263],
  //       [11.047234, 123.982099],
  //       [11.047495, 123.983393],
  //       [11.047728, 123.984563],
  //       [11.048011, 123.985964],
  //       [11.048234, 123.987099],
  //       [11.048495, 123.988393],
  //       [11.048728, 123.989563],
  //       [11.049011, 123.990964],
  //       [11.049234, 123.992099],
  //       [11.049495, 123.993393],
  //       [11.049728, 123.994563],
  //       [11.050011, 123.995964],
  //       [11.050234, 123.997099],
  //       [11.050495, 123.998393],
  //       [11.050728, 123.999563],
  //       [11.051011, 124.000964],
  //       [11.051234, 124.002099],
  //       [11.051495, 124.003393],
  //       [11.051728, 124.004563],
  //       [11.052011, 124.005964],
  //       [11.052234, 124.007099],
  //       [11.052495, 124.008393],
  //       [11.052728, 124.009563],
  //       [11.052911, 124.010563],
  //       [11.053028, 124.022162]
  //     ],
  //     time: '7 AM - 3 PM',
  //     type: 'DILI MALATA',
  //     frequency: 'DAILY',
  //     dayOff: 'SUNDAY',
  //     specialCollection: 'MALATA - Every WEDNESDAY',
  //     color: '#28a745',
  //     status: 'active'
  //   },
  //   // {
  //   //   route: '2',
  //   //   driver: 'REY OWATAN',
  //   //   crew: ['RICKY FRANCISCO', 'REX DESUYO', 'CARLITO TAMPUS'],
  //   //   areas: ['Sto. Nino', 'Sudlonon', 'Lourdes', 'Carbon', 'Pandan', 'Bungtod'],
  //   //   coordinates: [
  //   //     [11.052262819866998, 124.00965133721215], // Sto. Nino
  //   //     [11.050621534466746, 124.00990009809608], // Sudlonon
  //   //     [11.049963160992448, 124.00542195294906], // Lourdes
  //   //     [11.051302802641793, 124.00562125555486], // Carbon
  //   //     [11.046641268849118, 124.01250850674441], // Pandan
  //   //     [11.040530691939745, 124.0069241842869], // Bungtod
  //   //   ],
  //   //   time: '7 AM - 3 PM',
  //   //   type: 'DILI MALATA',
  //   //   frequency: 'DAILY',
  //   //   dayOff: 'SUNDAY',
  //   //   specialCollection: 'MALATA - Every FRIDAY',
  //   //   color: '#007bff',
  //   //   status: 'active'
  //   // },
  //   // {
  //   //   route: '3',
  //   //   driver: 'VICENTE SUBINGSUBING',
  //   //   crew: ['NOLI DAHUNAN', 'ANTHONY REMULTA', 'DOMINADOR ANTOPINA'],
  //   //   areas: ['ARAPAL Farm', 'Bungtod (Maharat & Laray)', 'Dakit (Highway & Provincial Rd)', 'Malingin Highway'],
  //   //   coordinates: [
  //   //     [11.0570, 123.9920], // ARAPAL Farm
  //   //     [11.040530691939745, 124.0069241842869], // Bungtod
  //   //     [11.0580, 123.9930], // Dakit
  //   //     [11.0585, 123.9935], // Malingin Highway
  //   //   ],
  //   //   time: '7 AM - 3 PM',
  //   //   type: 'DILI MALATA',
  //   //   frequency: 'DAILY',
  //   //   dayOff: 'SUNDAY',
  //   //   specialCollection: 'MALATA - Every TUESDAY',
  //   //   color: '#ffc107',
  //   //   status: 'active'
  //   // },
  //   // {
  //   //   route: '4',
  //   //   driver: 'RICARDO OLIVAR',
  //   //   crew: ['JOEL URSAL SR', 'RADNE BEDRIJO', 'JERMIN ANDRADE'],
  //   //   areas: ['A/B Cogon', 'Siocon', 'Odlot', 'Marangong', 'Libertad', 'Guadalupe'],
  //   //   coordinates: [
  //   //     [11.0590, 123.9940], // A/B Cogon
  //   //     [11.031800708684733, 124.03092791554725], // Siocon
  //   //     [11.0600, 123.9950], // Odlot
  //   //     [11.0605, 123.9955], // Marangong
  //   //     [11.0610, 123.9960], // Libertad
  //   //     [11.0615, 123.9965], // Guadalupe
  //   //   ],
  //   //   time: '7 AM - 3 PM',
  //   //   type: 'DILI MALATA',
  //   //   frequency: 'DAILY',
  //   //   dayOff: 'SATURDAY',
  //   //   specialCollection: 'MALATA - Every MONDAY',
  //   //   color: '#6f42c1',
  //   //   status: 'active'
  //   // }
  // ];

  // Remove all ORS fetching logic and use routeConfig directly in the rest of the code.

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

    // For each route, animate a truck
    routeConfig.forEach(route => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      // Filter out invalid points
      const validCoords = route.coordinates.filter(
        pt => Array.isArray(pt) && pt.length === 2 && 
              typeof pt[0] === 'number' && typeof pt[1] === 'number'
      );
      if (validCoords.length < 2) return;

      // Draw the route polyline
      const polyline = L.polyline(validCoords, { color: route.color, weight: 4, opacity: 0.7 }).addTo(map);
      map.fitBounds(polyline.getBounds());

      // Place marker at start
      const marker = L.marker(validCoords[0], {
        icon: getTruckIcon(route.color)
      }).addTo(map);
      truckMarkersRef.current[route.route] = marker;
      let currentIndex = 0;
      const interval = setInterval(() => {
        currentIndex++;
        if (currentIndex >= route.coordinates.length) {
          currentIndex = 0; // Loop back to start for continuous simulation
        }
        marker.setLatLng(route.coordinates[currentIndex]);
      }, 1000); // Move every second
      truckIntervalsRef.current[route.route] = interval;
    });

    // Cleanup on unmount
    return () => {
      Object.values(truckMarkersRef.current).forEach(marker => {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
      Object.values(truckIntervalsRef.current).forEach(interval => clearInterval(interval));
      truckMarkersRef.current = {};
      truckIntervalsRef.current = {};
    };
    // eslint-disable-next-line
  }, [map, routeConfig]);

  // Fetch real-world route from Bogo City Hall to user's current location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async function(position) {
      const startCoords = [ 123.97938020226853, 11.04648668975812]; // Bogo City Hall [lng, lat]
      const end = [position.coords.longitude, position.coords.latitude];
      const routeCoordsResult = await fetchORSRoute([startCoords, end]);
      const leafletCoords = routeCoordsResult.map(([lng, lat]) => [lat, lng]);
      setRouteConfig([{
        ...initialRouteConfig[0],
        coordinates: leafletCoords
      }]);
    });
  }, []);

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
          setTruckPositions(prev => ({
            ...prev,
            [truckData.routeId]: [truckData.lat, truckData.lng]
          }));
        }
      });
    });

    return unsubscribe;
  };

  const createTruckMarker = (routeId, position) => {
    const marker = L.marker(position, {
      icon: getTruckIcon(getRouteColor(routeId))
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

  const startTruckTracking = () => {
    setIsTracking(true);
    
    routeConfig.forEach(route => {
      const routeId = route.route;
      const coordinates = route.coordinates;
      
      // Create polyline for the route
      const polyline = createRoutePolyline(routeId, coordinates);
      polyline.addTo(map);
      setRoutePolylines(prev => ({ ...prev, [routeId]: polyline }));
      
      // Create truck marker at first coordinate
      const initialPosition = coordinates[0];
      const marker = createTruckMarker(routeId, initialPosition);
      setTruckMarkers(prev => ({ ...prev, [routeId]: marker }));
      
      // Start animation
      let currentIndex = 0;
      const timer = setInterval(() => {
        if (currentIndex < coordinates.length) {
          marker.setLatLng(coordinates[currentIndex]);
          setTruckPositions(prev => ({ 
            ...prev, 
            [routeId]: coordinates[currentIndex] 
          }));
          currentIndex++;
        } else {
          currentIndex = 0; // Loop back to start
        }
      }, 2000 / trackingSpeed);
      
      setTimers(prev => ({ ...prev, [routeId]: timer }));
    });
  };

  const stopTruckTracking = () => {
    setIsTracking(false);
    
    // Clear all timers
    Object.values(timers).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    setTimers({});
    
    // Remove truck markers
    Object.values(truckMarkers).forEach(marker => {
      if (map && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    setTruckMarkers({});
    
    // Remove polylines
    Object.values(routePolylines).forEach(polyline => {
      if (map && map.hasLayer(polyline)) {
        map.removeLayer(polyline);
      }
    });
    setRoutePolylines({});
  };

  const getRouteColor = (routeId) => {
    const route = routeConfig.find(r => r.route === routeId);
    return route ? route.color : '#666';
  };

  const getCurrentRoute = (routeId = selectedRoute) => {
    return routeConfig.find(route => route.route === routeId);
  };

  const getMarkerContent = (status) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'pending':
        return '🟡';
      case 'completed':
        return '✅';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'completed':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const handleGenerateRoute = () => {
    addNotification('Route generation feature coming soon!', 'info');
  };

  const handleRefreshMap = () => {
    if (map) {
      map.invalidateSize();
      addNotification('Map refreshed successfully!', 'success');
    }
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="view-map-container">
      <div className="map-header">
        <h2>🚛 Collection Map & Truck Tracking</h2>
        <p>Monitor truck routes in real-time</p>
      </div>

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
              {routeConfig.map(route => (
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
        <div className="map-actions">
          <button className="action-btn" onClick={handleGenerateRoute}>
            <span>📊</span> Generate Route
          </button>
          <button className="action-btn" onClick={handleRefreshMap}>
            <span>🔄</span> Refresh Map
          </button>
        </div>
      </div>
      <div className="map-container" style={{ position: 'relative' }}>
        <div id="map" className="osm-map"></div>
        {/* Route Legend overlayed on the map */}
        <div className="map-overlay-legend">
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
        </div>
        {showRouteInfo && (
          <div className="route-info-panel">
            <h3>Route Information</h3>
            {getCurrentRoute() && (
              <div className="route-details">
                <div className="route-header" style={{ borderLeftColor: getCurrentRoute().color }}>
                  <h4>Route {getCurrentRoute().route}</h4>
                  <span className="driver-name">{getCurrentRoute().driver}</span>
                </div>
                <div className="route-stats">
                  <div className="stat-item">
                    <span className="stat-label">Schedule:</span>
                    <span className="stat-value">{getCurrentRoute().time}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Type:</span>
                    <span className="stat-value">{getCurrentRoute().type}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Frequency:</span>
                    <span className="stat-value">{getCurrentRoute().frequency}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Day Off:</span>
                    <span className="stat-value">{getCurrentRoute().dayOff}</span>
                  </div>
                </div>
                <div className="crew-section">
                  <h5>Crew Members:</h5>
                  <ul className="crew-list">
                    {getCurrentRoute().crew.map((member, index) => (
                      <li key={index}>{member}</li>
                    ))}
                  </ul>
                </div>
                <div className="areas-section">
                  <h5>Collection Areas:</h5>
                  <div className="areas-grid">
                    {getCurrentRoute().areas.map((area, index) => (
                      <div key={index} className="area-item">
                        <span className="area-number">{index + 1}</span>
                        <span className="area-name">{area}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="special-collection">
                  <h5>Special Collection:</h5>
                  <p>{getCurrentRoute().specialCollection}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewMap; 