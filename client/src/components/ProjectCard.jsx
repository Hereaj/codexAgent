
import React from 'react';
import './ProjectCard.css';

const ProjectCard = ({ project }) => {
  return (
    <div className="project-card">
      <div className="project-content">
        <span className="project-category">{project.category}</span>
        <h3 className="project-title">{project.title}</h3>
        <p className="project-description">{project.description}</p>
        <div className="project-tech">
          {project.technologies.map((tech, index) => (
            <span key={index} className="tech-tag">{tech}</span>
          ))}
        </div>
        {project.link && (
          <a href={project.link} className="project-link" target="_blank" rel="noopener noreferrer">
            {project.linkText || 'View Project'} →
          </a>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
