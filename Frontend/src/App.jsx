// App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import PoliceDashboard from './components/PoliceDashboard';
import HomePage from './Sections/HomePage'

const App = () => {
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  
  const [token, setToken] = useState(null);

  // ✅ Load saved login on refresh
  useEffect(() => {
    const savedRole = localStorage.getItem('role');
    const savedUser = localStorage.getItem('userData');

    if (savedRole && savedUser) {
      setRole(savedRole);
      setUserData(JSON.parse(savedUser));
    }
  }, []);

const handleLogin = async (selectedRole, credentials) => {
  try {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, role: selectedRole }),
      credentials: "include",
    });

    // Read backend reply as text first
    const text = await response.text();
    console.log("Raw response:", text);

    let data;
    try {
      data = JSON.parse(text); // try to parse JSON
    } catch (err) {
      console.error("❌ Backend did not return JSON:", err);
      alert("⚠️ Backend sent invalid JSON instead of proper response.");
      return;
    }

    if (response.ok) {
      // ✅ Login successful
      alert(`${selectedRole.toUpperCase()} Login successful!`);
      setToken(data.data?.accessToken);
      setRole(data.data?.role);
      setUserData(data.data?.user || {});
    } else {
      // ❌ Error from backend (like "Wrong password")
      const errorMsg = data.message || data.error || "Login failed";
      alert(`❌ ${errorMsg}`);
    }
  } catch (err) {
    console.error("Network/Fetch error:", err);
    alert("⚠️ Backend connection failed");
  }
};



  const handleSignUp = async (selectedRole, details) => {
    try {
      const response = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, role: selectedRole }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Sign-up successful! Please log in.');
      } else {
        alert(data.message || 'Sign-up failed');
      }
    } catch (err) {
      console.error(err);
      alert('Backend connection failed');
    }
  };

  const handleLogout = () => {
    setRole(null);
    setUserData(null);

    // ✅ Clear from localStorage
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
  };
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ Show HomePage by default */}
        <Route path="/" element={<HomePage />} />

        {/* ✅ Login Page */}
        <Route
          path="/login"
          element={
            role ? (
              <Navigate
                to={role === "admin" ? "/admin-dashboard" : "/police-dashboard"}
              />
            ) : (
              <LoginPage onLogin={handleLogin} onSignUp={handleSignUp} />
            )
          }
        />

        {/* ✅ Admin Dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            role === "admin" ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Police Dashboard */}
        <Route
          path="/police-dashboard"
          element={
            role === "police" && userData ? (
              <PoliceDashboard
                policeName={userData.name}
                username={userData.username}
                userProfileUrl={userData.profilePic}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
