
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, pool } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
          technologies: row.technologies
        })),
        projects: projectsResult.rows.map(row => ({
          id: row.id,
          category: row.category,
          title: row.title,
          description: row.description,
          technologies: row.technologies,
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
        technologies: row.technologies,
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

// Admin API routes for updating data
app.put('/api/admin/hero', async (req, res) => {
  try {
    const { name, title, description } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE hero_info SET name = $1, title = $2, description = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM hero_info ORDER BY id DESC LIMIT 1)
      `, [name, title, description]);
      res.json({ message: 'Hero info updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update hero info' });
  }
});

app.put('/api/admin/about', async (req, res) => {
  try {
    const { content } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE about_info SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM about_info ORDER BY id DESC LIMIT 1)
      `, [content]);
      res.json({ message: 'About info updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update about info' });
  }
});

app.post('/api/admin/projects', async (req, res) => {
  try {
    const { category, title, description, technologies, link, linkText, isCurrentStudy } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO projects (category, title, description, technologies, link, link_text, is_current_study)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [category, title, description, JSON.stringify(technologies), link, linkText, isCurrentStudy || false]);
      res.json({ message: 'Project added successfully', id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

app.put('/api/admin/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, technologies, link, linkText, isCurrentStudy } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE projects 
        SET category = $1, title = $2, description = $3, technologies = $4, link = $5, link_text = $6, is_current_study = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [category, title, description, JSON.stringify(technologies), link, linkText, isCurrentStudy || false, id]);
      res.json({ message: 'Project updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM projects WHERE id = $1', [id]);
      res.json({ message: 'Project deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database delete error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
