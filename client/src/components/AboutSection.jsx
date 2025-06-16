
import React from 'react';
import './AboutSection.css';

const AboutSection = ({ about }) => {
  return (
    <section className="about-section">
      <div className="section-header">
        <h2 className="section-title">About Me</h2>
        <p className="section-subtitle">{about}</p>
      </div>
    </section>
  );
};

export default AboutSection;
