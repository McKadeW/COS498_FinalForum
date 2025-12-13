// This is the routes file containing page routes
// The main page route is for the server root, home

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

module.exports = router;
