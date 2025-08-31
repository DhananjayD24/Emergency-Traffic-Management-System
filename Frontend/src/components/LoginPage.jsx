// components/LoginPage.jsx
import React, { useState } from 'react';

const LoginPage = ({ onLogin, onSignUp }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('police');
  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setName('');
    setUsername('');
    setMobile('');
    setPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setLoading(true);
      await onLogin(role, { username, password });
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async(e) => {
    e.preventDefault();
    if (name.trim() && username.trim() && mobile.trim().length === 10 && password.trim()) {
      setLoading(true);
      await onSignUp(role, { name, username, mobile, password });
      setLoading(false);  
      resetFields();
      setIsSignup(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-300 via-white to-blue-100">
      <div className="backdrop-blur-lg bg-white/80 shadow-2xl border border-blue-100 rounded-3xl p-10 w-full max-w-md transition-all duration-300 hover:scale-[1.01]">
        <h2 className="text-3xl font-extrabold text-center text-blue-700 mb-6 drop-shadow-sm">
          🚦 {isSignup ? 'Traffic Police Sign Up' : 'Traffic Login'}
        </h2>

        <form
          onSubmit={isSignup ? handleSignUpSubmit : handleLoginSubmit}
          className="space-y-6"
        >
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={name}
                placeholder='Name'
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={username}
              placeholder='Username'
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <span className="bg-gray-100 px-3 py-2 text-gray-700 text-sm">+91</span>
                <input
                  type="tel"
                  className="w-full px-4 py-2 focus:outline-none"
                  value={mobile}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) setMobile(value);
                  }}
                  required
                  placeholder="10-digit number"
                />
              </div>
              {mobile && mobile.length !== 10 && (
                <p className="text-red-500 text-sm mt-1">Mobile number must be 10 digits</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              placeholder='Password'
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login As</label>
              <select
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="police">Traffic Police</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSignup
                ? !(name && username && password && mobile.length === 10)
                : !(username && password)
            }
            className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? (
  <span className="flex items-center justify-center gap-2">
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      ></path>
    </svg>
    Loading...
  </span>
) : isSignup ? 'Sign Up' : 'Login'}

          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsSignup(false);
                  resetFields();
                }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Login
              </button>
            </>
          ) : (
            <>
              New police officer?{' '}
              <button
                onClick={() => {
                  setIsSignup(true);
                  resetFields();
                }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Sign Up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;