
import React, { useState } from 'react';
import './ProjectFilter.css';

const ProjectFilter = ({ projects, onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTech, setSelectedTech] = useState('all');

  const categories = ['all', ...new Set(projects.map(p => p.category))];
  const technologies = ['all', ...new Set(projects.flatMap(p => p.technologies || []))];

  const handleFilter = () => {
    const filtered = projects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      const matchesTech = selectedTech === 'all' || (project.technologies && project.technologies.includes(selectedTech));
      
      return matchesSearch && matchesCategory && matchesTech;
    });
    onFilter(filtered);
  };

  React.useEffect(() => {
    handleFilter();
  }, [searchTerm, selectedCategory, selectedTech]);

  return (
    <div className="project-filter">
      <div className="filter-controls">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="filter-select"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
        <select 
          value={selectedTech} 
          onChange={(e) => setSelectedTech(e.target.value)}
          className="filter-select"
        >
          {technologies.map(tech => (
            <option key={tech} value={tech}>{tech === 'all' ? 'All Technologies' : tech}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ProjectFilter;
