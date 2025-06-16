
import React from 'react';
import './ContactSection.css';

const ContactSection = ({ contact }) => {
  return (
    <section className="contact-section">
      <h2 className="section-title">Let's Connect</h2>
      <p className="section-subtitle">I'm always interested in discussing new opportunities, collaborating on projects, or talking about data science and machine learning!</p>
      
      <div className="contact-links">
        <a href={`mailto:${contact.email}`} className="contact-link">
          <span>📧</span>
          <span>{contact.email}</span>
        </a>
        <a href={contact.linkedin} className="contact-link" target="_blank" rel="noopener noreferrer">
          <span>💼</span>
          <span>LinkedIn</span>
        </a>
        <a href={contact.github} className="contact-link" target="_blank" rel="noopener noreferrer">
          <span>💻</span>
          <span>GitHub</span>
        </a>
        <div className="contact-link">
          <span>📍</span>
          <span>{contact.location}</span>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
