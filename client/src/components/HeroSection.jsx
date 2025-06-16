
import React from 'react';
import './HeroSection.css';

const HeroSection = ({ hero }) => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">{hero.name}</h1>
        <p className="hero-subtitle">{hero.title} • {hero.description}</p>
      </div>
    </section>
  );
};

export default HeroSection;
