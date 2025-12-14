// This is the auth routes file, containing the routes for
// login, logout, and register

const express = require('express');
//const argon2 = require('argon2');
const db = require('../db');
const { validatePassword, hashPassword, comparePassword } = require('../modules/password-utils');
const { validateEmail } = require('../modules/email-utils');
const loginTracker = require('../modules/login-tracker');
const { checkLoginLockout, getClientIP } = require('../modules/auth-middleware');
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
      return res.redirect('/register?error=' + encodeURIComponent('Username, password, email, and display name are required'));
    }

    // Validate password requirements
    const validPass = validatePassword(password);
    if (!validPass.valid) {
      const errorsText = validPass.errors.join(', ');
      return res.redirect('/register?error=' + encodeURIComponent('Password does not meet requirements: ' + errorsText));
    }

    // Validate email requirements
    const validEmail = validateEmail(email);
    if (!validEmail.valid) { 
      const errorsText = validEmail.errors.join(', ');
      return res.redirect('/register?error=' + encodeURIComponent('Email does not meet requirements: ' + errorsText));
    }

    // Check if the username exists in db
    const existingUser = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
    if (existingUser) {
      return res.redirect('/register?error=' + encodeURIComponent('Username already exists. Please choose a different username.'));
    }

    // Check if the email exists in db
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existingEmail) {
      return res.redirect('/register?error=' + encodeURIComponent('Email already exists. Please choose a different email.'));
    }

    // Ensure the display name is different from their username
    if (username === display_name) {
	return res.redirect('/register?error=' + encodeURIComponent('Display name must be different than username.'));
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
    const caughtErr = 'Registration Error:' + error;
    return res.redirect('/register?error=' + encodeURIComponent(caughtErr));
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
router.post('/login', checkLoginLockout, async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const ipAddress = getClientIP(req);

    // Validate Login input
    if (!username || !password) {
      // Record failed attempt if username is provided
      if (username) {
        loginTracker.recordAttempt(ipAddress, username, false);
      }
      return res.redirect('/login?error=' + encodeURIComponent('Username and password are required'));
    }

    // Find user by username
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      // Record failed attempt (user doesn't exist)
      loginTracker.recordAttempt(ipAddress, username, false);
      return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password'));
    }

    // Compare entered password with stored hash
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      // Record failed attempt (wrong password)
      loginTracker.recordAttempt(ipAddress, username, false);
      return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password'));
    }

    // Successful Login
    loginTracker.recordAttempt(ipAddress, username, true);

    // Update last login time
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.display_name = user.display_name;
    req.session.isLoggedIn = true;

    // Redirect to success page
    return res.redirect('/');

  } catch (error) {
    const caughtErr = 'Login Error:' + error;
    return res.redirect('/login?error=' + encodeURIComponent(caughtErr));
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
