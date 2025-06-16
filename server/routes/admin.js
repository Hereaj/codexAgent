
const express = require('express');
const { pool } = require('../database/init');
const router = express.Router();

// Simple session store (in production, use proper session management)
const sessions = new Map();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Simple hardcoded credentials (in production, use proper auth)
  if (username === 'admin' && password === 'admin123') {
    const sessionId = Date.now().toString() + Math.random().toString(36);
    sessions.set(sessionId, { username, loginTime: new Date() });
    
    // Auto-expire sessions after 1 hour
    setTimeout(() => sessions.delete(sessionId), 3600000);
    
    res.json({ success: true, sessionId });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

// Get all tables data
router.get('/data', requireAuth, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const hero = await client.query('SELECT * FROM hero_info ORDER BY id DESC LIMIT 1');
      const stats = await client.query('SELECT * FROM hero_stats ORDER BY sort_order');
      const about = await client.query('SELECT * FROM about_info ORDER BY id DESC LIMIT 1');
      const projects = await client.query('SELECT * FROM projects ORDER BY sort_order');
      const skills = await client.query('SELECT * FROM skills ORDER BY category, sort_order');
      const education = await client.query('SELECT * FROM education ORDER BY sort_order');
      const contact = await client.query('SELECT * FROM contact_info ORDER BY id DESC LIMIT 1');

      res.json({
        hero: hero.rows[0] || {},
        stats: stats.rows,
        about: about.rows[0] || {},
        projects: projects.rows,
        skills: skills.rows,
        education: education.rows,
        contact: contact.rows[0] || {}
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Update hero info
router.put('/hero', requireAuth, async (req, res) => {
  try {
    const { name, title, description } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE hero_info SET name = $1, title = $2, description = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM hero_info ORDER BY id DESC LIMIT 1)
      `, [name, title, description]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update hero info' });
  }
});

// Update about info
router.put('/about', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE about_info SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM about_info ORDER BY id DESC LIMIT 1)
      `, [content]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update about info' });
  }
});

// CRUD operations for projects
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { category, title, description, technologies, link, linkText, isCurrentStudy, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO projects (category, title, description, technologies, link, link_text, is_current_study, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
      `, [category, title, description, JSON.stringify(technologies), link, linkText, isCurrentStudy || false, sortOrder || 0]);
      res.json({ success: true, id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, technologies, link, linkText, isCurrentStudy, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE projects 
        SET category = $1, title = $2, description = $3, technologies = $4, link = $5, link_text = $6, is_current_study = $7, sort_order = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `, [category, title, description, JSON.stringify(technologies), link, linkText, isCurrentStudy || false, sortOrder || 0, id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM projects WHERE id = $1', [id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// CRUD operations for skills
router.post('/skills', requireAuth, async (req, res) => {
  try {
    const { category, name, level, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO skills (category, name, level, sort_order)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [category, name, level, sortOrder || 0]);
      res.json({ success: true, id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

router.put('/skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, level, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE skills 
        SET category = $1, name = $2, level = $3, sort_order = $4
        WHERE id = $5
      `, [category, name, level, sortOrder || 0, id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

router.delete('/skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM skills WHERE id = $1', [id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

module.exports = router;
