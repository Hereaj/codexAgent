
import React from 'react';
import './EducationSection.css';

const EducationSection = ({ education }) => {
  return (
    <section className="education-section">
      <div className="section-header">
        <h2 className="section-title">Education & Experience</h2>
      </div>

      <div className="timeline">
        {education.map((item) => (
          <div key={item.id} className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">{item.date}</div>
              <h3 className="timeline-title">{item.title}</h3>
              <p className="timeline-description">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EducationSection;
