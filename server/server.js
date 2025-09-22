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

// Trust proxy for proper HTTPS detection behind Replit's proxy
app.set('trust proxy', true);

// HTTPS and canonical domain redirect middleware (production only)
app.use((req, res, next) => {
  // Only apply redirects in production
  if (process.env.NODE_ENV === 'production') {
    const host = req.hostname.toLowerCase();
    const canonicalHost = 'www.hereaj.com';
    
    // Only handle requests for hereaj.com domains
    if (host.endsWith('hereaj.com')) {
      // Redirect to HTTPS if not already
      if (!req.secure) {
        return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
      }
      
      // Redirect to canonical www domain if not already there
      if (host !== canonicalHost) {
        return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
      }
      
      // Add HSTS header for security
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  }
  
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin routes handle their own authentication

// Initialize database on startup
initializeDatabase().then(async () => {
  // Update LipNet project link if it exists
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE projects 
        SET link = '/attached_assets/DL_project_Final_ppt_1750576563453.pdf'
        WHERE title = 'LipNet with Self-Attention' AND link != '/attached_assets/DL_project_Final_ppt_1750576563453.pdf'
      `);
      console.log('Updated LipNet project link to use uploaded file');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating LipNet project link:', error);
  }
}).catch(console.error);

// Serve static files from React build
const clientDistPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../../client/dist')
  : path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Serve attached assets (PDFs, images, etc.)
app.use('/attached_assets', express.static(path.join(__dirname, '../attached_assets')));

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Analytics tracking
app.post('/api/analytics/view', async (req, res) => {
  try {
    const { page, userAgent, timestamp } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO page_views (page, user_agent, ip_address, timestamp)
        VALUES ($1, $2, $3, $4)
      `, [page, userAgent, req.ip, timestamp || new Date()]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

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
  const indexPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../client/dist/index.html')
    : path.join(__dirname, '../client/dist/index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});