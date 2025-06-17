const express = require('express');
const { pool } = require('../database/init');
const router = express.Router();

// Simple session store (in production, use proper session management)
const sessions = new Map();
const loginAttempts = new Map();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  console.log('Auth check - Session ID:', sessionId);
  console.log('Available sessions:', Array.from(sessions.keys()));
  
  if (!sessionId || !sessions.has(sessionId)) {
    console.log('Authentication failed');
    return res.status(401).json({ error: 'Authentication required' });
  }
  console.log('Authentication successful');
  next();
};

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;

  // Basic rate limiting - max 5 attempts per IP per 15 minutes
  const attempts = loginAttempts.get(clientIP) || { count: 0, lastAttempt: Date.now() };
  if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 900000) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  // Use environment variables for credentials
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUsername && password === adminPassword) {
    // Reset attempts on successful login
    loginAttempts.delete(clientIP);
    // Generate more secure session ID
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    sessions.set(sessionId, { username, loginTime: new Date() });

    // Auto-expire sessions after 30 minutes for security
    setTimeout(() => sessions.delete(sessionId), 1800000);

    res.json({ success: true, sessionId });
  } else {
    // Track failed attempts
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(clientIP, attempts);

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
      // Check if hero record exists
      const existingHero = await client.query('SELECT id FROM hero_info ORDER BY id DESC LIMIT 1');
      
      if (existingHero.rows.length > 0) {
        // Update existing record
        await client.query(`
          UPDATE hero_info SET name = $1, title = $2, description = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [name, title, description, existingHero.rows[0].id]);
      } else {
        // Insert new record if none exists
        await client.query(`
          INSERT INTO hero_info (name, title, description) VALUES ($1, $2, $3)
        `, [name, title, description]);
      }
      
      res.json({ success: true, message: 'Hero info updated successfully' });
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
      // Check if about record exists
      const existingAbout = await client.query('SELECT id FROM about_info ORDER BY id DESC LIMIT 1');
      
      if (existingAbout.rows.length > 0) {
        // Update existing record
        await client.query(`
          UPDATE about_info SET content = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [content, existingAbout.rows[0].id]);
      } else {
        // Insert new record if none exists
        await client.query(`
          INSERT INTO about_info (content) VALUES ($1)
        `, [content]);
      }
      
      res.json({ success: true, message: 'About info updated successfully' });
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
    const { category, title, description, link, linkText, isCurrentStudy, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO projects (category, title, description, link, link_text, is_current_study, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [category, title, description, link, linkText, isCurrentStudy || false, sortOrder || 0]);
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
    const { category, title, description, link, linkText, isCurrentStudy, sortOrder } = req.body;

    // Validate required fields
    if (!category || !title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Category, title, and description are required'
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE projects 
        SET category = $1, title = $2, description = $3, link = $4, link_text = $5, is_current_study = $6, sort_order = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id
      `, [category, title, description, link, linkText, isCurrentStudy || false, sortOrder || 0, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Project not found',
          details: `No project found with ID ${id}`
        });
      }

      res.json({ success: true, message: 'Project updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database error occurred',
      details: error.message 
    });
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

    // Validate required fields
    if (!category || !name || !level) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Category, name, and level are required'
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE skills 
        SET category = $1, name = $2, level = $3, sort_order = $4
        WHERE id = $5
        RETURNING id
      `, [category, name, level, sortOrder || 0, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Skill not found',
          details: `No skill found with ID ${id}`
        });
      }

      res.json({ success: true, message: 'Skill updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database error occurred',
      details: error.message 
    });
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

// CRUD operations for stats
router.post('/stats', requireAuth, async (req, res) => {
  try {
    const { number, label, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO hero_stats (number, label, sort_order)
        VALUES ($1, $2, $3) RETURNING id
      `, [number, label, sortOrder || 0]);
      res.json({ success: true, id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add stat' });
  }
});

router.put('/stats/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { number, label, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE hero_stats 
        SET number = $1, label = $2, sort_order = $3
        WHERE id = $4
      `, [number, label, sortOrder || 0, id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update stat' });
  }
});

router.delete('/stats/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM hero_stats WHERE id = $1', [id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete stat' });
  }
});

// CRUD operations for education
router.post('/education', requireAuth, async (req, res) => {
  try {
    const { title, dateRange, description, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO education (title, date_range, description, sort_order)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [title, dateRange, description, sortOrder || 0]);
      res.json({ success: true, id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add education' });
  }
});

router.put('/education/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, dateRange, description, sortOrder } = req.body;
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE education 
        SET title = $1, date_range = $2, description = $3, sort_order = $4
        WHERE id = $5
      `, [title, dateRange, description, sortOrder || 0, id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update education' });
  }
});

router.delete('/education/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM education WHERE id = $1', [id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete education' });
  }
});

module.exports = router;