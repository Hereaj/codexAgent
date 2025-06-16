const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, pool } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 5000;

// Helper function to safely parse technologies field
const parseTechnologies = (technologies) => {
  if (!technologies) return [];
  if (Array.isArray(technologies)) return technologies;
  if (typeof technologies === 'string') {
    try {
      // Try to parse as JSON first
      if (technologies.startsWith('[') && technologies.endsWith(']')) {
        return JSON.parse(technologies);
      }
      // Otherwise treat as comma-separated string
      return technologies.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } catch (error) {
      console.warn('Error parsing technologies:', technologies, error);
      return [];
    }
  }
  return [];
};

// Middleware
app.use(cors());
app.use(express.json());

// Session middleware for admin routes
app.use('/api/admin', (req, res, next) => {
  // Allow login and logout without authentication
  if (req.path === '/login' || req.path === '/logout') {
    return next();
  }
  
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  next();
});

// Initialize database on startup
initializeDatabase().catch(console.error);

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// API Routes
app.get('/api/portfolio', async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      // Get hero info
      const heroResult = await client.query('SELECT * FROM hero_info ORDER BY id DESC LIMIT 1');
      const statsResult = await client.query('SELECT * FROM hero_stats ORDER BY sort_order');
      const aboutResult = await client.query('SELECT * FROM about_info ORDER BY id DESC LIMIT 1');
      const currentStudiesResult = await client.query('SELECT * FROM projects WHERE is_current_study = true ORDER BY sort_order');
      const projectsResult = await client.query('SELECT * FROM projects WHERE is_current_study = false ORDER BY sort_order');
      const skillsResult = await client.query('SELECT * FROM skills ORDER BY category, sort_order');
      const educationResult = await client.query('SELECT * FROM education ORDER BY sort_order');
      const contactResult = await client.query('SELECT * FROM contact_info ORDER BY id DESC LIMIT 1');

      // Format the response
      const portfolioData = {
        hero: {
          name: heroResult.rows[0]?.name || '',
          title: heroResult.rows[0]?.title || '',
          description: heroResult.rows[0]?.description || '',
          stats: statsResult.rows.map(row => ({
            number: row.number,
            label: row.label
          }))
        },
        about: aboutResult.rows[0]?.content || '',
        currentStudies: currentStudiesResult.rows.map(row => ({
          id: row.id,
          category: row.category,
          title: row.title,
          description: row.description,
          technologies: parseTechnologies(row.technologies)
        })),
        projects: projectsResult.rows.map(row => ({
          id: row.id,
          category: row.category,
          title: row.title,
          description: row.description,
          technologies: parseTechnologies(row.technologies),
          link: row.link,
          linkText: row.link_text
        })),
        skills: {},
        education: educationResult.rows.map(row => ({
          id: row.id,
          date: row.date_range,
          title: row.title,
          description: row.description
        })),
        contact: {
          email: contactResult.rows[0]?.email || '',
          linkedin: contactResult.rows[0]?.linkedin || '',
          github: contactResult.rows[0]?.github || '',
          location: contactResult.rows[0]?.location || ''
        }
      };

      // Group skills by category
      skillsResult.rows.forEach(skill => {
        if (!portfolioData.skills[skill.category]) {
          portfolioData.skills[skill.category] = [];
        }
        portfolioData.skills[skill.category].push({
          name: skill.name,
          level: skill.level
        });
      });

      res.json(portfolioData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM projects WHERE is_current_study = false ORDER BY sort_order');
      const projects = result.rows.map(row => ({
        id: row.id,
        category: row.category,
        title: row.title,
        description: row.description,
        technologies: parseTechnologies(row.technologies),
        link: row.link,
        linkText: row.link_text
      }));
      res.json(projects);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/skills', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM skills ORDER BY category, sort_order');
      const skills = {};
      result.rows.forEach(skill => {
        if (!skills[skill.category]) {
          skills[skill.category] = [];
        }
        skills[skill.category].push({
          name: skill.name,
          level: skill.level
        });
      });
      res.json(skills);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

app.get('/api/education', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM education ORDER BY sort_order');
      const education = result.rows.map(row => ({
        id: row.id,
        date: row.date_range,
        title: row.title,
        description: row.description
      }));
      res.json(education);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Failed to fetch education' });
  }
});

// All admin operations are now handled through /api/admin routes with authentication

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});