
import React from 'react';
import './StatsSection.css';

const StatsSection = ({ stats }) => {
  return (
    <section className="stats-section">
      <div className="stats-grid grid grid-2 grid-4">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <span className="stat-number">{stat.number}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;
