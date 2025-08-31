import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  Polyline,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

const AdminDashboard = ({onLogout}) => {
  const [activeTab, setActiveTab] = useState("officers");
  const [trafficPolice, setTrafficPolice] = useState([]); //to show officers on dashboard from backend.
  // Added state for filtering officers by duty status
  const [officerFilter, setOfficerFilter] = useState("all"); // 'all', 'onDuty', 'offDuty'
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [routePath, setRoutePath] = useState([]);
  const [nearbyOfficers, setNearbyOfficers] = useState([]);
  const [showNearbyList, setShowNearbyList] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [RouteGenerated, setRouteGenerated] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const backend_link = import.meta.env.BACKEND_URL

  const isNearby = (officerCoords, pathCoords, radiusMeters = 200) => {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);
      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const [offLat, offLon] = officerCoords;
    return pathCoords.some(([lat, lon]) => {
    const dist = haversineDistance(offLat, offLon, lat, lon);
    return dist <= radiusMeters;
  });
};

  const findNearbyOfficers = async (pathCoords) => {
    try {
      const res = await axios.get(`${backend_link}/officers`);
      const officers = res.data.data;
      console.log("All officers from backend:", officers);

      const onDutyOfficers = officers.filter(
        (o) => o.onDuty && o.locationCoords  
      );
       console.log("On-duty officers:", onDutyOfficers);

       onDutyOfficers.forEach((o) => {
      console.log(`${o.name} coordinates:`, o.locationCoords);
    });

      const nearby = onDutyOfficers.filter((officer) =>{
      const [lng, lat] = officer.locationCoords; // extract correctly
      return isNearby([lng, lat], pathCoords);
    });
//     const nearby = onDutyOfficers.filter((officer) => true); // all on-duty officers
// console.log("Nearby officers (all):", nearby);
      

      setNearbyOfficers(nearby);
      setShowNearbyList(true);
      setRouteGenerated(true);
    } catch (err) {
      console.error("Failed to fetch officers", err);
    }
  };

  const MapClickHandler = ({setStart,setEnd,start,end,setStartAddress,setEndAddress,}) => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;

        // Limit to Pune area
        if (lat < 18.45 || lat > 18.65 || lng < 73.78 || lng > 74.0) {
          alert("Please select a location within Pune.");
          return;
        }

        const reverseGeocode = async () => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();
            return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          } catch (err) {
            console.error("Reverse geocoding failed", err);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }
        };

        if (!start) {
          setStart([lat, lng]);
          const address = await reverseGeocode();
          setStartAddress(address);
        } else if (!end) {
          setEnd([lat, lng]);
          const address = await reverseGeocode();
          setEndAddress(address);
        } else {
          alert("Both points already selected. Please reset if needed.");
        }
      },
    });
    return null;
  };

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const res = await fetch(`${backend_link}/officers`);
        const json = await res.json();
      const data = json.data || [];
        

        if (Array.isArray(data)) {
          const sanitized = data.map((officer) => ({
            ...officer,
            onDuty: officer.onDuty || false,
            location: officer.location || "",
            assignedAt: officer.dutyStartTime
              ? new Date(officer.dutyStartTime)
              : null,
          }));
          setTrafficPolice(sanitized);
        } else {
          console.warn("Expected array but got:", data);
        }
      } catch (err) {
        console.error("Error fetching officers:", err);
      }
    };

    fetchOfficers();
  }, []);

  // Officer Functions
  const handleOffDuty = async (index) => {
    const officer = trafficPolice[index];
    try {
      const res = await fetch(`${backend_link}/officers/${officer.username}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: "",
          onDuty: false,
          dutyStartTime: null,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        // Update local state after successful backend update
        const updated = [...trafficPolice];
        updated[index] = {
          ...updated[index],
          onDuty: false,
          location: "",
          assignedAt: null,
        };
        setTrafficPolice(updated);
      } else {
        console.error("Failed to update officer on backend:", result.message);
      }
    } catch (error) {
      console.error("Error during off-duty update:", error);
    }
  };

  // Filtered officers based on officerFilter
  const filteredOfficers = trafficPolice.filter((officer) => {
    if (officerFilter === "onDuty") return officer.onDuty;
    if (officerFilter === "offDuty") return !officer.onDuty;
    return true; // all
  });

  const API_KEY = import.meta.env.VITE_ORS_API_KEY;
  const fetchRouteFromORS = async (start, end) => {
    const startLng = start[1];
    const startLat = start[0];
    const endLng = end[1];
    const endLat = end[0];
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
    try {
      const response = await axios.get(url);
      const coordinates = response.data.features[0].geometry.coordinates;
      // Convert [lng, lat] to [lat, lng] for Leaflet
      const routePath = coordinates.map((coord) => [coord[1], coord[0]]);
      console.log("routpath generated")
      await findNearbyOfficers(routePath);
      return routePath;
    } catch (err) {
      console.error("Failed to fetch route from ORS:", err);
      return [];
    }
  };

  const handleGetRoute = async () => {
    if (!startPoint || !endPoint) {
      alert("Please select both start and end points.");
      return;
    }
    setLoadingRoute(true);
    const path = await fetchRouteFromORS(startPoint, endPoint);
    setLoadingRoute(false);

    if (path.length > 0) {
      setRoutePath(path);
      alert(
        "Route generated successfully. You can implement notifying officers next."
      );
    } else {
      alert("Failed to generate route.");
    }
  };

  const handleLogoutSubmit = (e) => {
    e.preventDefault();
    onLogout();
  };

  const FitMapBounds = ({ start, end }) => {
  const map = useMap();

  useEffect(() => {
    if (start && end) {
      const bounds = [start, end];
      map.fitBounds(bounds, { padding: [50, 50] }); // adds padding around the route
    }
  }, [start, end, map]);

  return null;
};

  return (
  <div className={`${darkMode ? "bg-slate-800 text-gray-100" : "bg-slate-100 text-gray-900"} min-h-screen transition-all duration-300`}>
    {/* Subtle Background Pattern */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-5 ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}></div>
      <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
    </div>

    {/* Professional Header Bar */}
    <header className={`w-full p-4 lg:p-6 shadow-lg border-b-2 ${darkMode ? "bg-slate-900 border-slate-700 shadow-slate-900/50" : "bg-white border-slate-300 shadow-slate-200/50"} transition-all duration-300`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-900/40 border border-blue-700/50" : "bg-blue-50 border border-blue-200"} shadow-sm`}>
            <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">
              Admin Dashboard
            </h1>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"} mt-1`}>
              Traffic Management & Control System
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-all duration-200 ${darkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200"}`}
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Navigation Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("officers")}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${activeTab === "officers" ? 
                darkMode ? "bg-blue-700 text-white" : "bg-blue-600 text-white" : 
                darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Officers
            </button>
            <button
              onClick={() => setActiveTab("ambulance")}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${activeTab === "ambulance" ? 
                darkMode ? "bg-blue-700 text-white" : "bg-blue-600 text-white" : 
                darkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Ambulance Routes
            </button>
            <button
              onClick={handleLogoutSubmit}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                darkMode ? "bg-red-700 text-white hover:bg-red-600" : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content Area */}
    <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Officers Duty Info */}
      {activeTab === "officers" && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={() => setOfficerFilter("all")}
              className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-300 cursor-pointer ${
                officerFilter === "all" ? 
                  darkMode ? "bg-blue-700 border-blue-600" : "bg-blue-600 border-blue-500 text-white" : 
                  darkMode ? "bg-slate-700 border-slate-600 hover:border-blue-500" : "bg-white border-slate-300 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Total Officers</h3>
                <div className={`p-2 rounded-lg ${darkMode ? "bg-slate-600" : "bg-blue-100"} ${officerFilter === "all" && !darkMode ? "bg-blue-500/20" : ""}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mt-4">{trafficPolice.length}</p>
            </div>

            <div 
              onClick={() => setOfficerFilter("onDuty")}
              className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-300 cursor-pointer ${
                officerFilter === "onDuty" ? 
                  darkMode ? "bg-green-700 border-green-600" : "bg-green-600 border-green-500 text-white" : 
                  darkMode ? "bg-slate-700 border-slate-600 hover:border-green-500" : "bg-white border-slate-300 hover:border-green-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">On Duty</h3>
                <div className={`p-2 rounded-lg ${darkMode ? "bg-slate-600" : "bg-green-100"} ${officerFilter === "onDuty" && !darkMode ? "bg-green-500/20" : ""}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mt-4">{trafficPolice.filter((o) => o.onDuty).length}</p>
            </div>

            <div 
              onClick={() => setOfficerFilter("offDuty")}
              className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-300 cursor-pointer ${
                officerFilter === "offDuty" ? 
                  darkMode ? "bg-red-700 border-red-600" : "bg-red-600 border-red-500 text-white" : 
                  darkMode ? "bg-slate-700 border-slate-600 hover:border-red-500" : "bg-white border-slate-300 hover:border-red-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Off Duty</h3>
                <div className={`p-2 rounded-lg ${darkMode ? "bg-slate-600" : "bg-red-100"} ${officerFilter === "offDuty" && !darkMode ? "bg-red-500/20" : ""}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold mt-4">{trafficPolice.filter((o) => !o.onDuty).length}</p>
            </div>
          </div>

          {/* Officer List */}
          <div className={`rounded-xl shadow-lg border-2 overflow-hidden ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
            <div className={`p-6 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <h2 className="text-xl font-semibold flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Officer Details
              </h2>
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"} mt-1`}>
                {officerFilter === "all" ? "All officers" : officerFilter === "onDuty" ? "Currently on duty" : "Currently off duty"}
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredOfficers.map((officer, index) => (
                <div key={index} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                        {officer.onDuty ? (
                          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{officer.name}</h3>
                        <div className={`mt-2 space-y-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                          <p className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span>Username: {officer.username}</span>
                          </p>
                          <p className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                            <span>Mobile: {officer.phone}</span>
                          </p>
                          {officer.onDuty && (
                            <p className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                              </svg>
                              <span>On Duty from: {new Date(officer.dutyStartTime).toLocaleString("en-GB", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}</span>
                            </p>
                          )}
                        </div>
                        <p className={`mt-3 flex items-center font-medium ${officer.onDuty ? "text-green-600" : "text-red-600"}`}>
                          {officer.onDuty ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              On Duty at {officer.location}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Off Duty
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {!officer.onDuty ? (
                      <span className={`px-4 py-2 rounded-lg ${darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
                        Not on duty
                      </span>
                    ) : (
                      <button
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 flex items-center"
                        onClick={() => handleOffDuty(trafficPolice.indexOf(officer))}
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Mark Off Duty
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ambulance Routes Tab */}
      {activeTab === "ambulance" && (
        <div className="space-y-8">
          <div className={`rounded-xl p-6 shadow-lg border-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
            <div className="flex items-center space-x-4 mb-6">
              <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-900/30" : "bg-blue-100"}`}>
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Ambulance Route Planner</h2>
                <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"} mt-1`}>
                  Plan and notify officers about ambulance routes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <LocationInput
                label="Start Location"
                value={startAddress}
                setValue={setStartAddress}
                setCoords={setStartPoint}
                setAddress={setStartAddress}
                darkMode={darkMode}
              />

              <LocationInput
                label="End Location"
                value={endAddress}
                setValue={setEndAddress}
                setCoords={setEndPoint}
                setAddress={setEndAddress}
                darkMode={darkMode}
              />
            </div>

            <div className={`mb-6 p-2 rounded-lg border-2 ${darkMode ? "bg-slate-700 border-slate-600" : "bg-slate-100 border-slate-300"} shadow-sm`}>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapContainer
                  center={[18.52, 73.85]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler
                    setStart={setStartPoint}
                    setEnd={setEndPoint}
                    start={startPoint}
                    end={endPoint}
                    setStartAddress={setStartAddress}
                    setEndAddress={setEndAddress}
                  />
                  {startPoint && (
                    <Marker
                      position={startPoint}
                      icon={L.icon({
                        iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                        iconSize: [32, 32],
                      })}
                    />
                  )}
                  {endPoint && (
                    <Marker
                      position={endPoint}
                      icon={L.icon({
                        iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        iconSize: [32, 32],
                      })}
                    />
                  )}
                  {routePath.length > 0 && (
                    <Polyline positions={routePath} color="blue" />
                  )}
                  {startPoint && endPoint && (
                    <FitMapBounds start={startPoint} end={endPoint} />
                  )}
                </MapContainer>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-700" : "bg-slate-100"} mb-6`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span className={darkMode ? "text-slate-300" : "text-slate-700"}>Start:</span>
                  </p>
                  <p className={`mt-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {startAddress || "Click on the map to select"}
                  </p>
                </div>
                <div>
                  <p className="font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span className={darkMode ? "text-slate-300" : "text-slate-700"}>End:</span>
                  </p>
                  <p className={`mt-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {endAddress || "Click on the map to select"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {startPoint && endPoint && !RouteGenerated && (
                <button
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center ${
                    loadingRoute ? "opacity-50 cursor-not-allowed" : "hover:shadow-md active:scale-95"
                  } ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} shadow-sm`}
                  onClick={handleGetRoute}
                  disabled={loadingRoute}
                >
                  {loadingRoute ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Route...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                      Generate Route
                    </>
                  )}
                </button>
              )}

              <button
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center ${
                  darkMode ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                } shadow-sm`}
                onClick={() => {
                  setStartPoint(null);
                  setEndPoint(null);
                  setStartAddress("");
                  setEndAddress("");
                  setRoutePath([]);
                  setRouteGenerated(false);
                  setNearbyOfficers([]);
                  setShowNearbyList(false);
                  setNotificationSent(false);
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                Reset
              </button>
            </div>

            {!notificationSent ? (
              <>
                {/* Nearby Officers List */}
                {showNearbyList && nearbyOfficers.length > 0 && (
                  <div className={`mt-6 p-6 rounded-lg border-2 ${darkMode ? "bg-green-900/20 border-green-600/50" : "bg-green-50 border-green-300"} shadow-md`}>
                    <h3 className="text-lg font-semibold flex items-center text-green-700 dark:text-green-400 mb-4">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      Nearby Officers
                    </h3>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      <ul className="space-y-3">
                        {nearbyOfficers.map((officer, i) => (
                          <li key={i} className={`p-4 rounded-lg ${darkMode ? "bg-slate-700" : "bg-white"} shadow-sm`}>
                            <div className="flex items-center space-x-4">
                              <div className={`p-2 rounded-lg ${darkMode ? "bg-slate-600" : "bg-slate-100"}`}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium">{officer.name}</p>
                                <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                  {officer.location}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      className={`mt-6 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center ${
                        darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                      } shadow-sm`}
                      onClick={async () => {
                        try {
                          await axios.post(
                            `${backend_link}/api/notify-officers`,
                            {
                              officerIds: nearbyOfficers.map((o) => o._id),
                              startAddress,
                              endAddress,
                            }
                          );

                          setNotificationSent(true);
                          setShowNearbyList(false);
                        } catch (err) {
                          console.error("Failed to send notifications", err);
                          alert("Failed to notify officers.");
                        }
                      }}
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
                      </svg>
                      Notify All Officers
                    </button>
                  </div>
                )}

                {/* No Officers Found Message */}
                {showNearbyList && nearbyOfficers.length === 0 && (
                  <div className={`mt-6 p-6 rounded-lg border-2 ${darkMode ? "bg-red-900/20 border-red-600/50" : "bg-red-50 border-red-300"} shadow-md`}>
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${darkMode ? "bg-red-800/30" : "bg-red-100"}`}>
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                          No Nearby Officers
                        </h3>
                        <p className={`mt-1 ${darkMode ? "text-red-300" : "text-red-600"}`}>
                          No officers found along the selected route.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`mt-6 p-6 rounded-lg border-2 ${darkMode ? "bg-blue-900/20 border-blue-600/50" : "bg-blue-50 border-blue-300"} shadow-md`}>
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-800/30" : "bg-blue-100"}`}>
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                      Notifications Sent
                    </h3>
                    <p className={`mt-1 ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                      All officers have been notified about the ambulance route.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Custom Scrollbar Styles */}
    <style jsx>{`
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: ${darkMode ? '#374151' : '#f1f5f9'};
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: ${darkMode ? '#6b7280' : '#9ca3af'};
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: ${darkMode ? '#9ca3af' : '#6b7280'};
      }
    `}</style>
  </div>
);
};

const LocationInput = ({ label, value, setValue, setCoords, setAddress }) => {
  const [suggestions, setSuggestions] = useState([]);

  const fetchSuggestions = async (query) => {
    if (!query) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1&viewbox=73.78,18.65,74.00,18.45&bounded=1`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Suggestion fetch failed", err);
    }
  };

  const handleSelect = (s) => {
    const coords = [parseFloat(s.lat), parseFloat(s.lon)];
    setCoords(coords);
    setValue(s.display_name);
    setAddress(s.display_name);
    setSuggestions([]);
  };
  return (
    <div className="mb-4 relative">
      <label className="block font-medium mb-1">{label}</label>
      <input
        type="text"
        className="border px-3 py-2 rounded w-full"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        placeholder={`Search ${label.toLowerCase()}`}
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded shadow max-h-40 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(s)}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminDashboard;
