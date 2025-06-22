import React from 'react';
import ProjectCard from './ProjectCard';
import './ProjectsSection.css';

const ProjectsSection = ({ projects }) => {
  return (
    <section className="projects-section">
      <div className="section-header">
        <h2 className="section-title">Featured Projects</h2>
        <p className="section-subtitle">A showcase of my work in machine learning, database systems, and web development</p>
      </div>
      <div className="projects-grid grid grid-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
};

export default ProjectsSection;