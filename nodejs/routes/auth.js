// This is the auth routes file, containing the routes for
// login, logout, and register

const express = require('express');
const argon2 = require('argon2');
const db = require('../db');
const { validatePassword, hashPassword, comparePassword } = require('../modules/password-utils');
const router = express.Router();

// Registration page
router.get('/register', (req, res) => {
  return res.render('register', {
        title: 'Register',
        error: req.query.error
  });
});

// Resgistration form
router.post('/register', async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const display_name = req.body.display_name;
    const email = req.body.email;

    if (!username || !password || !display_name || !email) {
      return res.redirect('/register?error=1');
    }

    // Validate password requirements
    const validation = validatePassword(password);
    if (!validation.valid) {
      return res.redirect('/register?error=1'); // WILL NEED TO REPLACE WITH SPECIFIC ERRORS
    }

    // Check if the username exists in db
    const existingUser = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
    if (existingUser) {
      return res.redirect('/register?error=1'); //SPECIFIC ERRORS
    }

    // Check if the email exists in db
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existingEmail) {
      return res.redirect('/register?error=1'); //SPECIFIC ERRORS
    }

    // Ensure the display name is different from their username
    if (username === display_name) {
	return res.redirect('/register?error=1'); //SPECIFIC ERRORS
    }

    // Hash the password before storing
    const passwordHash = await hashPassword(password);

    // Add new user into database
    db.prepare(`
      INSERT INTO users (username, password_hash, email, display_name, profile_data)
      VALUES (?, ?, ?, ?, '{}')
    `).run(username, passwordHash, email, display_name);

    return res.redirect('/login');

  } catch (error) {
    console.error('Registration Error:', error);
    return res.redirect('/register?error=1'); //NEW ERRORS NEEDED
  }
});

// Login page
router.get('/login', (req, res) => {
  return res.render('login', {
        title: 'Login',
        error: req.query.error
  });
});

// Login form
router.post('/login', async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    // Validate Login input
    if (!username || !password) {
      return res.redirect('/login?error=1'); //FIX ERRORS
    }

    // Find user by username
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.redirect('/login?error=1'); //FIX
    }

    // Compare entered password with stored hash
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.redirect('/login?error=1'); //FIX
    }

    // Successful login - update last login time
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.display_name = user.display_name;
    req.session.isLoggedIn = true;

    // Redirect to success page
    return res.redirect('/');

  } catch (error) {
    console.error('Login Error:', error);
    return res.redirect('/login?error=1'); //FIX
  }
});

// Logout action
router.post('/logout', (req, res) => {
  // Destroy the session cookie, go to home page
  req.session.destroy((err) => {
        if (err) {
            console.log('Error destroying session:', err);
        }
        return res.redirect('/');
  });
});

module.exports = router;
