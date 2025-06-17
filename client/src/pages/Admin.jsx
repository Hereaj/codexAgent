import React, { useState, useEffect } from 'react';
import './Admin.css';

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem('adminSession');
    console.log('Retrieved session ID from localStorage:', stored);
    return stored;
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const validateSession = async () => {
      const storedSessionId = localStorage.getItem('adminSession');
      console.log('Validating session on component mount:', storedSessionId);

      if (storedSessionId) {
        setSessionId(storedSessionId);
        try {
          const response = await fetch('/api/admin/data', {
            headers: {
              'X-Session-Id': storedSessionId
            }
          });

          if (response.ok) {
            setIsLoggedIn(true);
            const adminData = await response.json();
            setData(adminData);
          } else {
            console.log('Session validation failed, clearing stored session');
            localStorage.removeItem('adminSession');
            setSessionId(null);
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error('Session validation error:', error);
          localStorage.removeItem('adminSession');
          setSessionId(null);
          setIsLoggedIn(false);
        }
      }
    };

    validateSession();
  }, []);

  const checkAuth = async () => {
    const currentSessionId = sessionId || localStorage.getItem('adminSession');
    console.log('checkAuth using session ID:', currentSessionId);
    
    if (!currentSessionId) {
      console.log('No session ID available for auth check');
      setIsLoggedIn(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/data', {
        headers: {
          'X-Session-Id': currentSessionId
        }
      });

      if (response.ok) {
        setIsLoggedIn(true);
        const adminData = await response.json();
        setData(adminData);
        // Ensure sessionId state is up to date
        if (sessionId !== currentSessionId) {
          setSessionId(currentSessionId);
        }
      } else {
        console.log('Auth check failed, clearing session');
        localStorage.removeItem('adminSession');
        setSessionId(null);
        setIsLoggedIn(false);
        setData(null);
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
      console.log('Login response:', result);

      if (result.success && result.sessionId) {
        console.log('Login successful, storing session:', result.sessionId);
        localStorage.setItem('adminSession', result.sessionId);
        setSessionId(result.sessionId);
        setIsLoggedIn(true);
        await checkAuth();
        console.log('Session stored and data fetched successfully');
      } else {
        setLoginError(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
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
      const currentSessionId = sessionId || localStorage.getItem('adminSession');
      console.log('Updating hero with data:', heroData);
      console.log('Using session ID:', currentSessionId);

      if (!currentSessionId) {
        console.error('No session ID available');
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const response = await fetch('/api/admin/hero', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': currentSessionId
        },
        body: JSON.stringify(heroData)
      });

      const result = await response.json();
      console.log('Hero update response:', result);

      if (response.ok && result.success) {
        await checkAuth(); // Refresh data
        return { success: true, message: result.message || 'Hero info updated successfully!' };
      } else {
        return { success: false, error: result.error || 'Failed to update hero info' };
      }
    } catch (error) {
      console.error('Hero update error:', error);
      return { success: false, error: 'Network error occurred while updating hero info' };
    }
  };

  const updateAbout = async (aboutData) => {
    try {
      const currentSessionId = sessionId || localStorage.getItem('adminSession');
      console.log('Updating about with data:', aboutData);
      console.log('Using session ID:', currentSessionId);

      if (!currentSessionId) {
        console.error('No session ID available');
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      const response = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': currentSessionId
        },
        body: JSON.stringify(aboutData)
      });

      const result = await response.json();
      console.log('About update response:', result);

      if (response.ok && result.success) {
        await checkAuth(); // Refresh data
        return { success: true, message: result.message || 'About info updated successfully!' };
      } else {
        return { success: false, error: result.error || 'Failed to update about info' };
      }
    } catch (error) {
      console.error('About update error:', error);
      return { success: false, error: 'Network error occurred while updating about info' };
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
            {loginError && <div className="error-message">{typeof loginError === 'object' ? JSON.stringify(loginError) : loginError}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

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
          className={activeTab === 'stats' ? 'active' : ''} 
          onClick={() => setActiveTab('stats')}
        >
          Stats
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
        {activeTab === 'stats' && (
          <StatsEditor stats={data.stats} sessionId={sessionId} onRefresh={checkAuth} />
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

// Stats Editor Component
const StatsEditor = ({ stats, sessionId, onRefresh }) => {
  const [editingStat, setEditingStat] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const deleteStat = async (id) => {
    if (!confirm('Are you sure you want to delete this stat?')) return;

    try {
      const response = await fetch(`/api/admin/stats/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': sessionId
        }
      });

      if (response.ok) {
        onRefresh();
        alert('Stat deleted successfully!');
      } else {
        alert('Failed to delete stat');
      }
    } catch (error) {
      alert('Error deleting stat');
    }
  };

  return (
    <div className="editor-section">
      <div className="section-header">
        <h2>Hero Stats</h2>
        <button onClick={() => setShowAddForm(true)} className="add-btn">Add New Stat</button>
      </div>

      {showAddForm && (
        <StatForm
          sessionId={sessionId}
          onSuccess={() => {
            setShowAddForm(false);
            onRefresh();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="items-list">
        {stats.map((stat) => (
          <div key={stat.id} className="item-card">
            <div className="item-header">
              <h3>{stat.number} - {stat.label}</h3>
              <div className="item-actions">
                <button onClick={() => setEditingStat(stat)}>Edit</button>
                <button onClick={() => deleteStat(stat.id)} className="delete-btn">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingStat && (
        <StatForm
          stat={editingStat}
          sessionId={sessionId}
          onSuccess={() => {
            setEditingStat(null);
            onRefresh();
          }}
          onCancel={() => setEditingStat(null)}
        />
      )}
    </div>
  );
};

// Stat Form Component
const StatForm = ({ stat, sessionId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    number: stat?.number || '',
    label: stat?.label || '',
    sortOrder: stat?.sort_order || 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = stat ? `/api/admin/stats/${stat.id}` : '/api/admin/stats';
      const method = stat ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        alert(`Stat ${stat ? 'updated' : 'added'} successfully!`);
      } else {
        alert(`Failed to ${stat ? 'update' : 'add'} stat`);
      }
    } catch (error) {
      alert(`Error ${stat ? 'updating' : 'adding'} stat`);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h3>{stat ? 'Edit Stat' : 'Add New Stat'}</h3>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Number:</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({...formData, number: e.target.value})}
              placeholder="e.g., 15+"
              required
            />
          </div>
          <div className="form-group">
            <label>Label:</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({...formData, label: e.target.value})}
              placeholder="e.g., Projects Completed"
              required
            />
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
            <button type="submit">{stat ? 'Update' : 'Add'} Stat</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const result = await onUpdate(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
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
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Hero'}
        </button>
      </form>
    </div>
  );
};

// About Editor Component
const AboutEditor = ({ about, onUpdate }) => {
  const [content, setContent] = useState(about.content || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const result = await onUpdate({ content });

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
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
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update About'}
        </button>
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
    link: project?.link || '',
    linkText: project?.link_text || '',
    isCurrentStudy: project?.is_current_study || false,
    sortOrder: project?.sort_order || 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData
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

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(result.details || result.error || `Failed to ${project ? 'update' : 'add'} project`);
      }
    } catch (error) {
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
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
          {error && (
            <div className="error-message" style={{
              color: '#dc3545',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '15px'
            }}>
              {error}
            </div>
          )}
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : `${project ? 'Update' : 'Add'} Project`}
            </button>
            <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Skills Editor with full CRUD
const SkillsEditor = ({ skills, sessionId, onRefresh }) => {
  const [editingSkill, setEditingSkill] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const deleteSkill = async (id) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    try {
      const response = await fetch(`/api/admin/skills/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': sessionId
        }
      });

      if (response.ok) {
        onRefresh();
        alert('Skill deleted successfully!');
      } else {
        alert('Failed to delete skill');
      }
    } catch (error) {
      alert('Error deleting skill');
    }
  };

  return (
    <div className="editor-section">
      <div className="section-header">
        <h2>Skills</h2>
        <button onClick={() => setShowAddForm(true)} className="add-btn">Add New Skill</button>
      </div>

      {showAddForm && (
        <SkillForm
          sessionId={sessionId}
          onSuccess={() => {
            setShowAddForm(false);
            onRefresh();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="items-list">
        {skills.map((skill) => (
          <div key={skill.id} className="item-card">
            <div className="item-header">
              <h3>{skill.name}</h3>
              <div className="item-actions">
                <button onClick={() => setEditingSkill(skill)}>Edit</button>
                <button onClick={() => deleteSkill(skill.id)} className="delete-btn">Delete</button>
              </div>
            </div>
            <p><strong>Category:</strong> {skill.category}</p>
            <p><strong>Level:</strong> {skill.level}</p>
          </div>
        ))}
      </div>

      {editingSkill && (
        <SkillForm
          skill={editingSkill}
          sessionId={sessionId}
          onSuccess={() => {
            setEditingSkill(null);
            onRefresh();
          }}
          onCancel={() => setEditingSkill(null)}
        />
      )}
    </div>
  );
};

// Skill Form Component
const SkillForm = ({ skill, sessionId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    category: skill?.category || '',
    name: skill?.name || '',
    level: skill?.level || '',
    sortOrder: skill?.sort_order || 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = skill ? `/api/admin/skills/${skill.id}` : '/api/admin/skills';
      const method = skill ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(result.details || result.error || `Failed to ${skill ? 'update' : 'add'} skill`);
      }
    } catch (error) {
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h3>{skill ? 'Edit Skill' : 'Add New Skill'}</h3>
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
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Level:</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value})}
              required
            >
              <option value="">Select Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Proficient">Proficient</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div className="form-group">
            <label>Sort Order:</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value)})}
            />
          </div>
          {error && (
            <div className="error-message" style={{
              color: '#dc3545',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '15px'
            }}>
              {error}
            </div>
          )}
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : `${skill ? 'Update' : 'Add'} Skill`}
            </button>
            <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Education Editor with full CRUD
const EducationEditor = ({ education, sessionId, onRefresh }) => {
  const [editingEducation, setEditingEducation] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const deleteEducation = async (id) => {
    if (!confirm('Are you sure you want to delete this education entry?')) return;

    try {
      const response = await fetch(`/api/admin/education/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Session-Id': sessionId
        }
      });

      if (response.ok) {
        onRefresh();
        alert('Education entry deleted successfully!');
      } else {
        alert('Failed to delete education entry');
      }
    } catch (error) {
      alert('Error deleting education entry');
    }
  };

  return (
    <div className="editor-section">
      <div className="section-header">
        <h2>Education</h2>
        <button onClick={() => setShowAddForm(true)} className="add-btn">Add New Education</button>
      </div>

      {showAddForm && (
        <EducationForm
          sessionId={sessionId}
          onSuccess={() => {
            setShowAddForm(false);
            onRefresh();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="items-list">
        {education.map((edu) => (
          <div key={edu.id} className="item-card">
            <div className="item-header">
              <h3>{edu.title}</h3>
              <div className="item-actions">
                <button onClick={() => setEditingEducation(edu)}>Edit</button>
                <button onClick={() => deleteEducation(edu.id)} className="delete-btn">Delete</button>
              </div>
            </div>
            <p><strong>Date:</strong> {edu.date_range}</p>
            <p><strong>Description:</strong> {edu.description}</p>
          </div>
        ))}
      </div>

      {editingEducation && (
        <EducationForm
          education={editingEducation}
          sessionId={sessionId}
          onSuccess={() => {
            setEditingEducation(null);
            onRefresh();
          }}
          onCancel={() => setEditingEducation(null)}
        />
      )}
    </div>
  );
};

// Education Form Component
const EducationForm = ({ education, sessionId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: education?.title || '',
    dateRange: education?.date_range || '',
    description: education?.description || '',
    sortOrder: education?.sort_order || 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = education ? `/api/admin/education/${education.id}` : '/api/admin/education';
      const method = education ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
        alert(`Education ${education ? 'updated' : 'added'} successfully!`);
      } else {
        alert(`Failed to ${education ? 'update' : 'add'} education`);
      }
    } catch (error) {
      alert(`Error ${education ? 'updating' : 'adding'} education`);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h3>{education ? 'Edit Education' : 'Add New Education'}</h3>
        <form onSubmit={handleSubmit} className="admin-form">
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
            <label>Date Range:</label>
            <input
              type="text"
              value={formData.dateRange}
              onChange={(e) => setFormData({...formData, dateRange: e.target.value})}
              placeholder="e.g., 2023 — 2025 (Expected)"
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
            <label>Sort Order:</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-actions">
            <button type="submit">{education ? 'Update' : 'Add'} Education</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Admin;