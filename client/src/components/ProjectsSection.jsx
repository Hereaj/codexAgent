
import React from 'react';
import ProjectCard from './ProjectCard';
import './ProjectsSection.css';

const ProjectsSection = ({ currentStudies, projects }) => {
  return (
    <div className="projects-section">
      {/* Current Studies */}
      <section className="current-studies">
        <div className="section-header">
          <h2 className="section-title">What I'm Currently Studying</h2>
        </div>
        <div className="projects-grid grid grid-2">
          {currentStudies.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="featured-projects">
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
    </div>
  );
};

export default ProjectsSection;
