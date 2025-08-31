import React from "react";

export default function Features() {
  const features = [
    {
      icon: "📍",
      title: "Live Officer Tracking",
      desc: "Traffic police update duty status/location via map.",
    },
    {
      icon: "🚑",
      title: "Smart Route Mapping",
      desc: "Admin selects ambulance routes; system alerts nearby officers.",
    },
    {
      icon: "📲",
      title: "Instant Notifications",
      desc: "SMS + in-app alerts to officers en route.",
    },
    {
      icon: "🛣️",
      title: "OpenStreetMap Integration",
      desc: "Lightweight, open-source mapping for seamless coordination.",
    },
  ];

  return (
    <section id="features" className="px-6 py-20 bg-white text-gray-800">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-blue-900 mb-10">
          Key Features
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-blue-50 p-6 rounded-xl shadow hover:shadow-lg transition duration-300"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-blue-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-700">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
