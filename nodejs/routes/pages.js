// This is the routes file containing page routes like home and profile pages
// The profile page has multiple routes to display its page and let the user
// change their account password, email, display name, and customize their display name color

const express = require('express');
const db = require('../db');
const { validatePassword, hashPassword, comparePassword } = require('../modules/password-utils');
const { validateEmail } = require('../modules/email-utils');
const { validateDisplayName } = require('../modules/display-name-utils');
const { validateProfileColor } = require('../modules/profile-utils');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  // If the user is logged in display their name,
  // otherwise display Guest
  let name = "Guest";
  if (req.session && req.session.isLoggedIn) {
        name = req.session.display_name;
  }

  // Render the hompage with specific data if logged in
  return res.render('home', {
        title: 'Home',
        message: 'Welcome to the Homepage!',
        loggedIn: req.session.isLoggedIn,
        user: name
  });
});

// Profile page
router.get('/profile', (req, res) => {
  // Only show profile page if the user is logged in
  if (req.session && req.session.isLoggedIn) {
    return res.render('profile', {
      title: 'Profile',
      loggedIn: req.session.isLoggedIn,
      display_name: req.session.display_name,
      color: req.session.color,
      error: req.query.error
    });
  }
  else {
      return res.render('login');
  }
});

// Profile route for changing the user password
router.post('/profile/changePassword', async (req, res) => {
  try {
    // Only make this route available for logged in users
    if (req.session && req.session.isLoggedIn) {
      const old_password = req.body.old_password;
      const new_password = req.body.new_password; 
     
      // Ensure user fills out all password fields
      if (!old_password || !new_password) {
        return res.redirect('/profile?error=' + encodeURIComponent('All password fields are required.'));
      }

      // Find user by username
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId);

      // Ensure the user entered their current password	    
      const compare = await comparePassword(old_password, user.password_hash);
      if (!compare) {
        return res.redirect('/profile?error=' + encodeURIComponent('Current password is incorrect.'));
      }

      // Validate password requirements
      const validPass = validatePassword(new_password);
      if (!validPass.valid) {
        const errorsText = validPass.errors.join(', ');
        return res.redirect('/profile?error=' + encodeURIComponent('Password does not meet requirements: ' + errorsText));
      }

      // If the user's new password is valid, hash it
      const passwordHash = await hashPassword(new_password);

      // After it has been hashed, store it in the database
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passwordHash, req.session.userId);

      // Now that their password has been updated, force re-login
      req.session.destroy(() => {
        return res.redirect('/login');
      });
    }
  }
  catch (error) {
    const caughtErr = 'Change Password Error:' + error;
    return res.redirect('/profile?error=' + encodeURIComponent(caughtErr));
  }
});

// Profile route for changing the user email
router.post('/profile/changeEmail', async (req, res) => {
  try {
    // Only make this route available for logged in users
    if (req.session && req.session.isLoggedIn) {
      const password = req.body.password;
      const new_email = req.body.new_email;

      // Ensure the user fills out all form fields
      if (!password || !new_email) {
        return res.redirect('/profile?error=' + encodeURIComponent('Password and email required.'));
      }

      // Find user by username                                                           
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId);

      // Ensure the user entered their current password
      const compare = await comparePassword(password, user.password_hash);
      if (!compare) {                                                                                return res.redirect('/profile?error=' + encodeURIComponent('Current password is incorrect.'));
      }                                                                                                                                                           
      // Validate email requirements
      const validEmail = validateEmail(new_email);
      if (!validEmail.valid) {
        const errorsText = validEmail.errors.join(', ');
        return res.redirect('/profile?error=' + encodeURIComponent('Password does not meet requirements: ' + errorsText));
      }

      // Check to see if this email already exists in the database
      // This will also ensure that the new email isnt the same as the old one
      const existingEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(new_email);
      if (existingEmail) {
        return res.redirect('/profile?error=' + encodeURIComponent('Email already exists. Please choose a different email.'));
      }

      // If the new email passes all cases, update database
      db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(new_email, req.session.userId);
      
      return res.redirect('/profile');
    }
  }
  catch (error) {
    const caughtErr = 'Change Email Error:' + error;
    return res.redirect('/profile?error=' + encodeURIComponent(caughtErr));
  }
});

// Profile route for changing the user display name
router.post('/profile/changeDisplayName', (req, res) => {
  // Only make this route available for logged in users
  if (req.session && req.session.isLoggedIn) {
    const new_display_name = req.body.new_display_name;

    const validDisplayName = validateDisplayName(new_display_name);
    if (!validDisplayName.valid) {
      const errorsText = validDisplayName.errors.join(', ');
      return res.redirect('/profile?error=' + encodeURIComponent('Display name does not meet requirements: ' + errorsText));
    }

    // Add the new display name to the database
    db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(new_display_name, req.session.userId);

    // Update the user's session with the new name	    
    req.session.display_name = new_display_name;

    return res.redirect('/profile');
  }
});

// Profile route for adding color customization to
// the user's display name
router.post('/profile/customize', (req, res) => {
  // Only make this route available for logged in users
  if (req.session && req.session.isLoggedIn) {
    const color = req.body.color;

    // Validate the color input
    const validColor = validateProfileColor(color);
    if (!validColor.valid) {
      const errorsText = validColor.errors.join(', ');
      return res.redirect('/profile?error=' + encodeURIComponent('Hex color does not meet requirements: ' + errorsText));
    }

    // After validation, add color to the database
    db.prepare(`UPDATE users SET profile_data = ? WHERE id = ?`).run(color, req.session.userId);
    
    // Add the color to the user session for easy access
    req.session.color = color;

    return res.redirect('/profile');
  }
});

module.exports = router;
