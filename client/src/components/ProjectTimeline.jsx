
import React, { useState } from 'react';
import './ProjectTimeline.css';

const ProjectTimeline = ({ projects }) => {
  const [selectedProject, setSelectedProject] = useState(null);

  const sortedProjects = projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="project-timeline">
      <h3>Project Timeline</h3>
      <div className="timeline-container">
        {sortedProjects.map((project, index) => (
          <div 
            key={project.id} 
            className={`timeline-item ${selectedProject?.id === project.id ? 'active' : ''}`}
            onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
          >
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <h4>{project.title}</h4>
                <span className="timeline-category">{project.category}</span>
              </div>
              {selectedProject?.id === project.id && (
                <div className="timeline-details">
                  <p>{project.description}</p>
                  <div className="timeline-technologies">
                    {project.technologies?.map(tech => (
                      <span key={tech} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTimeline;
