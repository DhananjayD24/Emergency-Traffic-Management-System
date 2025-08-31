import React, { useEffect, useState } from "react";
import Spline from "@splinetool/react-spline";
import { useNavigate } from "react-router-dom";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import TeamSection from "./TeamSection";
import { FaBars } from "react-icons/fa";
import { Link } from "react-scroll";

export default function Homepage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "features", "how", "team"];
      for (let i = 0; i < sections.length; i++) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 100) {
          setActiveSection(sections[i]);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "features", label: "Features" },
    { id: "how", label: "How It Works" },
    { id: "team", label: "Our Team" },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e3f2fd] to-[#f3f8ff]">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/30 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Traffic Remover</h1>

          <div className="hidden md:flex space-x-6 items-center">
            {navLinks.map(({ id, label }) => (
              <Link
                key={id}
                to={id}
                spy={true}
                smooth={true}
                offset={-80}
                duration={500}
                className={`cursor-pointer font-medium transition hover:text-blue-600 ${
                  activeSection === id ? "text-blue-800" : "text-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-blue-700 transition"
            >
              Login / Signup
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-800 text-2xl"
            >
              <FaBars />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-4 bg-white/90">
            {navLinks.map(({ id, label }) => (
              <Link
                key={id}
                to={id}
                spy={true}
                smooth={true}
                offset={-80}
                duration={500}
                onClick={() => setIsMenuOpen(false)}
                className={`block cursor-pointer font-medium ${
                  activeSection === id ? "text-blue-800" : "text-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/login");
              }}
              className="block w-full text-left font-semibold text-white bg-blue-600 px-4 py-2 rounded-full"
            >
              Login / Signup
            </button>
          </div>
        )}
      </header>

      {/* Spline Hero */}
      <section id="home" className="h-screen w-full pt-24">
        <Spline scene="https://prod.spline.design/ax79n5cMpV-90SAB/scene.splinecode" />
      </section>

      {/* Features */}
      <Features />

      {/* How It Works */}
      <HowItWorks />

      {/* Our Team */}
      <TeamSection />

      {/* Footer */}
      <footer className="bg-white py-4 text-center text-sm text-gray-600">
        © 2025 Traffic Remover. All rights reserved.
      </footer>
    </div>
  );
}
