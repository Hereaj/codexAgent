
import React, { useState, useEffect } from 'react';
import './Admin.css';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionId, setSessionId] = useState(localStorage.getItem('adminSession'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (sessionId) {
      checkAuth();
    }
  }, [sessionId]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/data', {
        headers: {
          'X-Session-Id': sessionId
        }
      });
      
      if (response.ok) {
        setIsLoggedIn(true);
        const adminData = await response.json();
        setData(adminData);
      } else {
        localStorage.removeItem('adminSession');
        setSessionId(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsLoggedIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(result.sessionId);
        localStorage.setItem('adminSession', result.sessionId);
        setIsLoggedIn(true);
        await checkAuth();
      } else {
        setLoginError(result.error || 'Login failed');
      }
    } catch (error) {
      setLoginError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'X-Session-Id': sessionId
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminSession');
      setSessionId(null);
      setIsLoggedIn(false);
      setData(null);
    }
  };

  const updateHero = async (heroData) => {
    try {
      const response = await fetch('/api/admin/hero', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify(heroData)
      });

      if (response.ok) {
        await checkAuth(); // Refresh data
        alert('Hero info updated successfully!');
      } else {
        alert('Failed to update hero info');
      }
    } catch (error) {
      alert('Error updating hero info');
    }
  };

  const updateAbout = async (aboutData) => {
    try {
      const response = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify(aboutData)
      });

      if (response.ok) {
        await checkAuth(); // Refresh data
        alert('About info updated successfully!');
      } else {
        alert('Failed to update about info');
      }
    } catch (error) {
      alert('Error updating about info');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <h1>Admin Login</h1>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            {loginError && <div className="error-message">{loginError}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="login-hint">
            <p>Default credentials:</p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="admin-loading">Loading admin data...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Portfolio Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <nav className="admin-tabs">
        <button 
          className={activeTab === 'hero' ? 'active' : ''} 
          onClick={() => setActiveTab('hero')}
        >
          Hero Section
        </button>
        <button 
          className={activeTab === 'about' ? 'active' : ''} 
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
        <button 
          className={activeTab === 'projects' ? 'active' : ''} 
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button 
          className={activeTab === 'skills' ? 'active' : ''} 
          onClick={() => setActiveTab('skills')}
        >
          Skills
        </button>
        <button 
          className={activeTab === 'education' ? 'active' : ''} 
          onClick={() => setActiveTab('education')}
        >
          Education
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'hero' && (
          <HeroEditor hero={data.hero} stats={data.stats} onUpdate={updateHero} />
        )}
        {activeTab === 'about' && (
          <AboutEditor about={data.about} onUpdate={updateAbout} />
        )}
        {activeTab === 'projects' && (
          <ProjectsEditor projects={data.projects} sessionId={sessionId} onRefresh={checkAuth} />
        )}
        {activeTab === 'skills' && (
          <SkillsEditor skills={data.skills} sessionId={sessionId} onRefresh={checkAuth} />
        )}
        {activeTab === 'education' && (
          <EducationEditor education={data.education} sessionId={sessionId} onRefresh={checkAuth} />
        )}
      </main>
    </div>
  );
};

// Hero Editor Component
const HeroEditor = ({ hero, stats, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: hero.name || '',
    title: hero.title || '',
    description: hero.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="editor-section">
      <h2>Hero Section</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
          />
        </div>
        <button type="submit">Update Hero</button>
      </form>

      <div className="stats-display">
        <h3>Current Stats</h3>
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <strong>{stat.number}</strong> - {stat.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// About Editor Component
const AboutEditor = ({ about, onUpdate }) => {
  const [content, setContent] = useState(about.content || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({ content });
  };

  return (
    <div className="editor-section">
      <h2>About Section</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>About Content:</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="8"
          />
        </div>
        <button type="submit">Update About</button>
      </form>
    </div>
  );
};

// Projects Editor Component
const ProjectsEditor = ({ projects, sessionId, onRefresh }) => {
  const [editingProject, setEditingProject] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const deleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/admin/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': sessionId
        }
      });

      if (response.ok) {
        onRefresh();
        alert('Project deleted successfully!');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      alert('Error deleting project');
    }
  };

  return (
    <div className="editor-section">
      <div className="section-header">
        <h2>Projects</h2>
        <button onClick={() => setShowAddForm(true)} className="add-btn">Add New Project</button>
      </div>

      {showAddForm && (
        <ProjectForm
          sessionId={sessionId}
          onSuccess={() => {
            setShowAddForm(false);
            onRefresh();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="items-list">
        {projects.map((project) => (
          <div key={project.id} className="item-card">
            <div className="item-header">
              <h3>{project.title}</h3>
              <div className="item-actions">
                <button onClick={() => setEditingProject(project)}>Edit</button>
                <button onClick={() => deleteProject(project.id)} className="delete-btn">Delete</button>
              </div>
            </div>
            <p><strong>Category:</strong> {project.category}</p>
            <p><strong>Description:</strong> {project.description}</p>
            <p><strong>Technologies:</strong> {JSON.parse(project.technologies).join(', ')}</p>
            {project.link && <p><strong>Link:</strong> <a href={project.link} target="_blank" rel="noopener noreferrer">{project.link}</a></p>}
            <p><strong>Current Study:</strong> {project.is_current_study ? 'Yes' : 'No'}</p>
          </div>
        ))}
      </div>

      {editingProject && (
        <ProjectForm
          project={editingProject}
          sessionId={sessionId}
          onSuccess={() => {
            setEditingProject(null);
            onRefresh();
          }}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  );
};

// Project Form Component
const ProjectForm = ({ project, sessionId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    category: project?.category || '',
    title: project?.title || '',
    description: project?.description || '',
    technologies: project?.technologies ? JSON.parse(project.technologies).join(', ') : '',
    link: project?.link || '',
    linkText: project?.link_text || '',
    isCurrentStudy: project?.is_current_study || false,
    sortOrder: project?.sort_order || 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      technologies: formData.technologies.split(',').map(tech => tech.trim())
    };

    try {
      const url = project ? `/api/admin/projects/${project.id}` : '/api/admin/projects';
      const method = project ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSuccess();
        alert(`Project ${project ? 'updated' : 'added'} successfully!`);
      } else {
        alert(`Failed to ${project ? 'update' : 'add'} project`);
      }
    } catch (error) {
      alert(`Error ${project ? 'updating' : 'adding'} project`);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h3>{project ? 'Edit Project' : 'Add New Project'}</h3>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Category:</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="4"
              required
            />
          </div>
          <div className="form-group">
            <label>Technologies (comma-separated):</label>
            <input
              type="text"
              value={formData.technologies}
              onChange={(e) => setFormData({...formData, technologies: e.target.value})}
              placeholder="Python, React, Node.js"
              required
            />
          </div>
          <div className="form-group">
            <label>Link:</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({...formData, link: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Link Text:</label>
            <input
              type="text"
              value={formData.linkText}
              onChange={(e) => setFormData({...formData, linkText: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isCurrentStudy}
                onChange={(e) => setFormData({...formData, isCurrentStudy: e.target.checked})}
              />
              Is Current Study
            </label>
          </div>
          <div className="form-group">
            <label>Sort Order:</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-actions">
            <button type="submit">{project ? 'Update' : 'Add'} Project</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Skills Editor (simplified for space)
const SkillsEditor = ({ skills, sessionId, onRefresh }) => {
  return (
    <div className="editor-section">
      <h2>Skills</h2>
      <div className="items-list">
        {skills.map((skill) => (
          <div key={skill.id} className="item-card">
            <h3>{skill.name}</h3>
            <p><strong>Category:</strong> {skill.category}</p>
            <p><strong>Level:</strong> {skill.level}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Education Editor (simplified for space)
const EducationEditor = ({ education, sessionId, onRefresh }) => {
  return (
    <div className="editor-section">
      <h2>Education</h2>
      <div className="items-list">
        {education.map((edu) => (
          <div key={edu.id} className="item-card">
            <h3>{edu.title}</h3>
            <p><strong>Date:</strong> {edu.date_range}</p>
            <p><strong>Description:</strong> {edu.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
