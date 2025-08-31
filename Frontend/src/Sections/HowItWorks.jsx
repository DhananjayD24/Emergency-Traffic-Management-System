import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      title: "1. Emergency Raised",
      desc: "Ambulance driver initiates the route request to admin in case of emergency.",
      emoji: "🚨",
      bg: "bg-red-50",
    },
    {
      title: "2. Route Planning",
      desc: "Admin selects source and destination. Route is optimized and shared with on-duty officers.",
      emoji: "🧭",
      bg: "bg-blue-50",
    },
    {
      title: "3. Alert & Clear Path",
      desc: "Police on the assigned route are alerted to clear the way immediately for the ambulance.",
      emoji: "🚓",
      bg: "bg-green-50",
    },
  ];

  return (
    <section id="how" className="px-6 py-20 bg-blue-50 text-gray-800">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-blue-900 mb-10">
          How Our Solution Works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl shadow-md hover:shadow-xl transition duration-300 ${step.bg}`}
            >
              <div className="text-5xl mb-4">{step.emoji}</div>
              <h3 className="font-semibold text-xl text-blue-800 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
