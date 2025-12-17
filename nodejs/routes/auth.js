// This is the auth routes file, containing the routes for
// login, logout, register, and forgot password

const express = require('express');
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
    // Parse form field information
    const username = req.body.username;
    const password = req.body.password;
    const display_name = req.body.display_name;
    const email = req.body.email;
    const recovery_question = req.body.question;
    const answer = req.body.answer;

    // Ensure all form fields were filled out
    if (!username || !password || !display_name || !email || !recovery_question || !answer) {
      return res.redirect('/register?error=' + encodeURIComponent('All registration fields are required.'));
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
    // Hash the user's recovery question answer
    const answerHash = await hashPassword(answer);

    // Add new user into database
    // This includes their username, password, display name and account recovery fields
    db.prepare(`
      INSERT INTO users (username, password_hash, email, 
      display_name, profile_data, recovery_question, recovery_answer)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
    `).run(username, passwordHash, email, display_name, recovery_question, answerHash);

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
    req.session.color = user.color;
    req.session.isLoggedIn = true;

    // Redirect to success page
    return res.redirect('/');

  } catch (error) {
    const caughtErr = 'Login Error:' + error;
    return res.redirect('/login?error=' + encodeURIComponent(caughtErr));
  }
});

// Route that shows the form to reset the user password
router.get('/login/forgotPassword', (req, res) => {
  return res.render('forgot_password', {
    error: req.query.error
  });
});

// The logic for sending an email to the user to reset their password
router.post('/login/forgotPassword', (req, res) => {
  // Get the user email and username
  const email = req.body.email;
  const username = req.body.username;

  // Don't accept empty form input, without email
  if (!email || !username) {
    return res.redirect('/login/forgotPassword?error=' + encodeURIComponent('Email and username required to reset password.'));
  }

  // Check to see if the user entered their username and email
  // Fetch that user and their recovery question (created on register)
  const user = db.prepare(`
	  SELECT id, recovery_question FROM users WHERE email = ? AND username = ?
	  `).get(email, username);

  // If the user entered incorrect email/username, throw error
  if (!user) {
    return res.redirect('/login/forgotPassword?error=' + encodeURIComponent('Incorrect username or email.'));
  }

  // If the user successfully entered their account email and username
  // render the page that will display their security question/let them answer it
  // This page will also let the user set their new password (on correct answer)
  return res.render('recovery_form', {
    id: user.id,
    question: user.recovery_question,
    error: req.query.error
  });
});

// A route that ensures the user's answer to their account recovery question is correct
// If it is, the new password they entered will become their password
// Any error messages are res.render instead of redirect (to keep user on the same form)
router.post('/login/forgotPassword/verify', async (req, res) => {
  try {
    // Parse the user's ID from the hbs, along with the form fields
    const user_id = req.body.id;
    const answer = req.body.answer;
    const new_password = req.body.password;

    // Ensure the user filled out all form fields
    if (!user_id || !answer || !new_password) {
      return res.redirect('/login/forgotPassword?error=' + encodeURIComponent('Answer and new password required.'));
    }

    // Get the user based on the passed in user ID
    // This user ID originates from the /login/forgotPassword POST route
    const user = db.prepare(`SELECT recovery_question, recovery_answer FROM users WHERE id = ?`).get(user_id);

    // Check to see if we found the user
    // If not, output not found error
    if (!user) {
      return res.render('recovery_form', {
        id: user_id,
	question: user.recovery_question,
	error: 'User not found in the database.'
      });
    }

    // Check to see if the user's answer matches the answer
    // that they provided when they registered their account
    const answerMatch = await comparePassword(answer, user.recovery_answer);

    // If the user entered an incorrect answer, output error
    if (!answerMatch) {
      return res.render('recovery_form', {
        id: user_id,
	question: user.recovery_question,
	error: 'Incorrect recovery answer.'
      });
    }

    // If the user entered the correct answer, let them reset their password

    // Validate password requirements
    const validPass = validatePassword(new_password);
    if (!validPass.valid) {
      const errorsText = validPass.errors.join(', ');
      return res.render('recovery_form', {
        id: user_id,
	question: user.recovery_question,
	error: 'Password does not meet requirements: ' + errorsText
      });
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(new_password);

    // Store the new password in the database
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newPasswordHash, user_id);

    return res.redirect('/login');
  }
  catch (error) {
    return res.redirect('/login/forgotPassword?error=' + encodeURIComponent('Error changing password.'));
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
