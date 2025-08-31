// File: src/components/TeamSection.jsx
import React from 'react';
import teamMember1 from '../assets/DD.jpg';
import teamMember2 from '../assets/Ayush.jpg';

const TeamSection = () => {
  const team = [
    {
      name: 'Dhananjay Deshmukh',
      role: 'Full Stack Developer',
      description:
        'Passionate about creating tools that help people succeed in their career journey.',
      image: teamMember1,
    },
    {
      name: 'Ayush Fand',
      role: 'Full Stack Developer',
      description:
        'Focused on building intelligent apps with smooth UI for real-world impact.',
      image: teamMember2,
    },
  ];

  return (
    <div className="py-16 px-4 md:px-10 bg-white" id="team">
      <div className="text-center mb-10">
        <span className="text-blue-600 font-semibold text-sm px-3 py-1 bg-blue-100 rounded-full">
          Meet Our Team
        </span>
        <h2 className="text-3xl font-bold mt-4 text-gray-900">
          The creators behind Traffic Remover
        </h2>
        <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
          Passionate developers dedicated to building a safer and faster emergency response platform.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto ">
        {team.map((member, idx) => (
          <div
            key={idx}
            className="bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row border"
          >
            <img
              src={member.image}
              alt={member.name}
              className="w-full md:w-1/2 h-64 object-cover"
            />
            <div className="p-6 flex flex-col justify-center">
              <h3 className="text-xl font-bold text-gray-900">
                {member.name}
              </h3>
              <p className="text-purple-600 font-medium mt-1">
                {member.role}
              </p>
              <p className="text-gray-700 mt-3 text-sm">
                {member.description}
              </p>
              <div className="mt-4 flex gap-4 text-gray-500 text-xl">
                <i className="ri-github-line"></i>
                <i className="ri-twitter-line"></i>
                <i className="ri-mail-line"></i>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSection;
