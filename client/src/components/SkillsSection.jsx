
import React from 'react';
import './SkillsSection.css';

const SkillsSection = ({ skills }) => {
  return (
    <section className="skills-section">
      <div className="section-header">
        <h2 className="section-title">Technical Skills</h2>
        <p className="section-subtitle">Proficiencies across programming languages, frameworks, and technologies</p>
      </div>
      
      <div className="skills-grid grid grid-3">
        {Object.entries(skills).map(([category, skillList]) => (
          <div key={category} className="skill-category">
            <h3>{category}</h3>
            {skillList.map((skill, index) => (
              <div key={index} className="skill-item">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-level">{skill.level}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkillsSection;
