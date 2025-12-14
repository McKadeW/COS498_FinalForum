// This is the routes file containing page routes like home and profile pages

const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  // If the user is logged in display their name,
  // otherwise display Guest
  let user = "Guest";
  if (req.session && req.session.isLoggedIn) {
        user = req.session.username;
  }

  // Render the hompage with specific data if logged in
  return res.render('home', {
        title: 'Home',
        message: 'Welcome to the Homepage!',
        loggedIn: req.session.isLoggedIn,
        user: user
  });
});

// Profile page
router.get('/profile', (req, res) => {
  // Only show profile page if the user is logged in
  if (req.session && req.session.isLoggedIn) {
      return res.render('profile', {
          title: 'Profile',
	  loggedIn: req.session.isLoggedIn,
          error: req.query.error
      });
  }
  else {
      return res.render('login');
  }
});

module.exports = router;
