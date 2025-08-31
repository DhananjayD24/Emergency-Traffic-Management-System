import React, { useState, useEffect, useRef } from "react";
import {MapContainer,TileLayer,Marker,useMapEvents,useMap} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const PoliceDashboard = ({ policeName = "Officer", username, userProfileUrl, onLogout }) => {
  const profilePic =
    userProfileUrl ||
    "https://pixabay.com/vectors/blank-profile-picture-mystery-man-973460/";

  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState(null);
  const [submittedLocation, setSubmittedLocation] = useState("");
  const [dutyStartTime, setDutyStartTime] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [mapPosition, setMapPosition] = useState([18.5204, 73.8567]);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const profileMenuRef = useRef(null);
  const backend_link = import.meta.env.BACKEND_URL

  const handleLogoutSubmit = (e) => {
    e.preventDefault();
    if (onLogout) onLogout();
  };

  const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
      if (map && position) map.setView(position);
    }, [position, map]);
    return null;
  };

  useEffect(() => {
    if (!username) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(
          `${backend_link}/officers/${username}/notifications`
        );
        setNotifications(res?.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotifications([]);
      }
    };

    fetchNotifications();
  }, [username]);

  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        if (lat < 18.45 || lat > 18.65 || lng < 73.78 || lng > 74.0) {
          alert("Please select a location within Pune.");
          return;
        }
        setMarkerPosition([lat, lng]);
        setMapPosition([lat, lng]);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          if (data?.display_name) {
            setLocation(data.display_name);
            setLocationCoords([lat, lng]);
            setSuggestions([]);
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }
      },
    });
    return null;
  };

  useEffect(() => {
    if (!username) return;

    const fetchOfficerData = async () => {
      try {
        const response = await fetch(`${backend_link}/officers/${username}`);
        const data = await response.json();
        console.log("Fetched officer data:", data);
        if (data?.duty && data?.onDuty) {
          setSubmittedLocation(data.duty.location);
          setDutyStartTime(data.duty.dutyStartTime || null);
        }
      } catch (error) {
        console.error("Error fetching officer data:", error);
      }
    };

    fetchOfficerData();
  }, [username]);

  const handleSearch = async (e) => {
    const value = e.target.value || "";
    setLocation(value);
    setLocationCoords(null);

    if (value.length > 2) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${value}&bounded=1&viewbox=73.78,18.65,74.00,18.45&limit=5`
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch (err) {
        console.error("Search failed, please search location within Pune", err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (place) => {
    if (!place) return;
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    if (isNaN(lat) || isNaN(lon)) return;

    setLocation(place.display_name || "");
    setLocationCoords([lat, lon]);
    setMarkerPosition([lat, lon]);
    setMapPosition([lat, lon]);
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!locationCoords || !location?.trim()) {
      alert("Please select a location from the map or suggestions.");
      return;
    }
    const now = new Date().toISOString();

    try {
      const response = await fetch(`${backend_link}/officers/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim(),
          locationCoords: locationCoords,
          onDuty: true,
          dutyStartTime: now,
        }),
      });
      const data = await response.json();
      if (data?.success) {
        setSubmittedLocation(location.trim());
        setDutyStartTime(now);
        setLocation("");
        setLocationCoords(null);
      } else {
        alert("Failed to update location: " + (data?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating location:", error);
      alert("Error updating location.");
    }
  };

  const handleGoOffDuty = async () => {
    if (!username) return;
    try {
      const response = await fetch(`${backend_link}/officers/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onDuty: false,
          dutyStartTime: null,
          location: "",
          locationCoords: null,
        }),
      });
      const data = await response.json();
      if (data?.success) {
        setSubmittedLocation("");
        setDutyStartTime(null);
      }
    } catch (error) {
      console.error("Error updating duty status:", error);
    }
  };

  const clearNotifications = async () => {
    if (!username) return;
    try {
      const res = await axios.delete(
        `${backend_link}/officers/${username}/notifications`
      );
      if (res?.data?.success) setNotifications([]);
      else console.error("Failed to clear notifications from server");
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };


  
  return (
    <div
      className={`${
        darkMode 
          ? "bg-slate-800 text-gray-100" 
          : "bg-slate-100 text-gray-900"
      } min-h-screen transition-all duration-300`}
    >
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-5 ${
          darkMode ? "bg-gray-600" : "bg-gray-300"
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5 ${
          darkMode ? "bg-gray-700" : "bg-gray-200"
        }`}></div>
      </div>

      {/* Subtle Professional Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-3 ${
          darkMode ? "bg-slate-600" : "bg-slate-300"
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-3 ${
          darkMode ? "bg-slate-700" : "bg-slate-200"
        }`}></div>
      </div>

      {/* Professional Header Bar */}
      <header className={`w-full p-4 lg:p-6 shadow-lg border-b-2 ${
        darkMode 
          ? "bg-slate-900 border-slate-700 shadow-slate-900/50" 
          : "bg-white border-slate-300 shadow-slate-200/50"
      } transition-all duration-300`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className={`p-3 rounded-lg ${
              darkMode ? "bg-blue-900/40 border border-blue-700/50" : "bg-blue-50 border border-blue-200"
            } shadow-sm`}>
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">
                Traffic Police Dashboard
              </h1>
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"} mt-1`}>
                Traffic Management & Control System
              </p>
            </div>
          </div>

          {/* Professional Profile Section */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                darkMode 
                  ? "bg-slate-800 hover:bg-slate-700 border border-slate-700" 
                  : "bg-slate-50 hover:bg-slate-100 border border-slate-300"
              } shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30`}
            >
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-sm">{policeName}</p>
                <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Traffic Police
                </p>
              </div>
              <div className="relative">
                <img
                  src={
                    profilePic ||
                    "https://randomuser.me/api/portraits/men/75.jpg"
                  }
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} 
                   fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>

            {showProfileMenu && (
              <div className={`absolute right-0 mt-3 w-64 rounded-lg shadow-lg border z-30 animate-in slide-in-from-top-2 duration-200 ${
                darkMode 
                  ? "bg-slate-800 border-slate-700" 
                  : "bg-white border-slate-300"
              }`}>
                <div className={`px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                  <p className="font-semibold">{policeName}</p>
                  <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Traffic Police • On Duty
                  </p>
                </div>
                <div className="py-2">
                  {[
                    { label: "Change Profile Picture", icon: "📷" },
                    { label: "Set New Password", icon: "🔑" },
                    { label: darkMode ? "Light Mode" : "Dark Mode", icon: darkMode ? "☀️" : "🌙", onClick: () => setDarkMode((prev) => !prev) },
                    { label: "Delete Account", icon: "🗑️", danger: true },
                    { label: "Log Out", icon: "🚪", onClick: handleLogoutSubmit }
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className={`w-full text-left px-5 py-3 transition-all duration-200 flex items-center space-x-3 ${
                        item.danger
                          ? `hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400`
                          : `hover:bg-slate-50 dark:hover:bg-slate-700 ${darkMode ? "text-slate-200" : "text-slate-700"}`
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">

        {/* Notifications Section */}
        <section
          className={`w-full max-w-6xl mx-auto mb-8 lg:mb-12 p-4 lg:p-6 rounded-lg shadow-md border-2 transition-all duration-300 ${
            darkMode 
              ? "bg-slate-700 border-orange-600/40" 
              : "bg-white border-orange-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div className="flex items-center space-x-3 mb-3 sm:mb-0">
              <div className={`p-2 rounded-lg ${
                darkMode ? "bg-orange-900/30" : "bg-orange-100"
              }`}>
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                  Notifications
                </h2>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Emergency alerts
                </p>
              </div>
            </div>
            <button
              onClick={clearNotifications}
              disabled={notifications.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                notifications.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-red-50 dark:hover:bg-red-900/30"
              } ${
                darkMode
                  ? "bg-gray-700 text-red-400 border border-gray-600"
                  : "bg-gray-100 text-red-600 border border-gray-200"
              }`}
            >
              Clear All
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className={`text-center py-6 rounded-lg ${
              darkMode ? "bg-slate-600/30 border border-slate-600" : "bg-slate-50 border border-slate-200"
            }`}>
              <div className={`inline-block p-3 rounded-lg mb-2 ${
                darkMode ? "bg-slate-600" : "bg-slate-200"
              }`}>
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                All clear!
              </p>
              <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                No active notifications
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
              {notifications.map(({ message, date }, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    darkMode
                      ? "bg-slate-700 border-red-600/50 hover:border-red-500"
                      : "bg-red-50 border-red-300 hover:border-red-400"
                  } shadow-sm hover:shadow-md`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      darkMode ? "bg-red-600/20" : "bg-red-100"
                    } flex-shrink-0`}>
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="whitespace-pre-wrap text-sm">
                        {message.split("\n").map((line, lineIndex) => {
                          if (line.startsWith("🚨 Ambulance Alert")) {
                            return (
                              <div key={lineIndex} className="mb-2">
                                <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center space-x-2">
                                  <span>🚨</span>
                                  <span>EMERGENCY</span>
                                </h3>
                              </div>
                            );
                          } else if (line.startsWith("Coming From:")) {
                            return (
                              <div key={lineIndex} className="mb-1">
                                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                  darkMode ? "bg-slate-600 text-slate-200" : "bg-slate-200 text-slate-700"
                                }`}>
                                  <span>📍</span>
                                  <span className="font-medium">From:</span>
                                  <span>{line.replace("Coming From:", "").trim()}</span>
                                </div>
                              </div>
                            );
                          } else if (line.startsWith("To:")) {
                            return (
                              <div key={lineIndex} className="mb-2">
                                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                                  darkMode ? "bg-slate-600 text-slate-200" : "bg-slate-200 text-slate-700"
                                }`}>
                                  <span>🎯</span>
                                  <span className="font-medium">To:</span>
                                  <span>{line.replace("To:", "").trim()}</span>
                                </div>
                              </div>
                            );
                          } else if (line.trim()) {
                            return <p key={lineIndex} className="text-xs text-slate-700 dark:text-slate-300">{line}</p>;
                          }
                          return null;
                        })}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/30 dark:border-gray-700/30">
                        <div className={`flex items-center space-x-1 text-xs ${
                          darkMode ? "text-slate-400" : "text-slate-500"
                        }`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          <span>{new Date(date).toLocaleString()}</span>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          darkMode ? "bg-slate-600 text-slate-300" : "bg-slate-200 text-slate-700"
                        }`}>
                          ACTIVE
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Duty Location Form */}
        <form
          onSubmit={handleSubmit}
          className={`w-full max-w-6xl mx-auto p-6 lg:p-8 rounded-lg shadow-md border-2 transition-all duration-300 ${
            darkMode 
              ? "bg-slate-700 border-green-600/40" 
              : "bg-white border-green-300"
          }`}
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className={`p-3 rounded-lg ${
              darkMode ? "bg-green-900/30" : "bg-green-100"
            }`}>
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-semibold text-green-700 dark:text-green-400">
                Duty Location Manager
              </h2>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mt-1`}>
                Set your current patrol location
              </p>
            </div>
          </div>

          {/* Professional Search Input */}
          <div className="relative mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search for your duty location..."
                value={location}
                onChange={handleSearch}
                className={`w-full pl-12 pr-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 text-base ${
                  darkMode
                    ? "bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:border-green-500 focus:ring-green-500/30"
                    : "bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-green-500 focus:ring-green-500/30"
                } shadow-sm`}
              />
            </div>

            {suggestions.length > 0 && (
              <div className={`absolute z-20 w-full mt-2 rounded-lg shadow-lg border overflow-hidden ${
                darkMode 
                  ? "bg-slate-800 border-slate-700" 
                  : "bg-white border-slate-200"
              }`}>
                <div className="max-h-60 overflow-y-auto">
                  {suggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(place)}
                      className={`w-full text-left px-5 py-4 transition-all duration-200 flex items-center space-x-3 ${
                        darkMode 
                          ? "hover:bg-green-700/20 text-gray-200 hover:text-green-300" 
                          : "hover:bg-green-50 text-gray-700 hover:text-green-600"
                      } ${idx !== suggestions.length - 1 ? 'border-b border-slate-200/30 dark:border-slate-700/30' : ''}`}
                    >
                      <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <span className="flex-1 truncate">{place.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="mb-6">
            <div className={`p-2 rounded-lg border-2 ${
              darkMode 
                ? "bg-slate-600 border-blue-600/50" 
                : "bg-blue-50 border-blue-300"
            } shadow-sm`}>blue-50 border-blue-300"
            
              <MapContainer
                center={mapPosition}
                zoom={13}
                scrollWheelZoom={true}
                className="h-80 lg:h-96 rounded-lg shadow-inner"
              >
                <RecenterMap position={mapPosition} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {markerPosition && <Marker position={markerPosition} />}
                <MapClickHandler />
              </MapContainer>
            </div>
          </div>

          {/* Professional Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              type="submit"
              disabled={!locationCoords}
              className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-base transition-all duration-200 ${
                !locationCoords
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-md active:scale-95"
              } ${
                darkMode
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              } shadow-sm`}
            >
              Update Duty Location
            </button>
            
            {locationCoords && (
              <div className={`flex items-center space-x-2 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span>Location selected</span>
              </div>
            )}
          </div>

          {/* On Duty Status Display */}
          {submittedLocation && (
            <div
              className={`mt-8 p-6 rounded-lg border-2 transition-all duration-300 ${
                darkMode
                  ? "bg-green-900/20 border-green-600/50"
                  : "bg-green-50 border-green-400"
              } shadow-md`}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${
                    darkMode ? "bg-green-600/20" : "bg-green-100"
                  }`}>
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                      Currently On Duty
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">Location:</span>
                        <span className={`text-sm ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                          {submittedLocation}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">On Duty Since:</span>
                        <span className={`font-mono text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                          {dutyStartTime
                            ? new Date(dutyStartTime).toLocaleString("en-GB", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGoOffDuty}
                  type="button"
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-md active:scale-95 ${
                    darkMode
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  } shadow-sm`}
                >
                  End Duty Shift
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Professional Scrollbar Styles */}
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
        
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: animate-in 0.2s ease-out;
        }
        
        .slide-in-from-top-2 {
          animation: slideInFromTop 0.2s ease-out;
        }
        
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PoliceDashboard;
