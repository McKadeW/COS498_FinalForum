// This is the routes file containing all of the routes related
// to adding, handling, and displaying user posted comments

const express = require('express');
const db = require('../db');
const router = express.Router();

// Comments (main forum page)
router.get('/comments', (req, res) => {
  // Display the page and all currently posted comments
  // Only shows if the user is logged in
  if (req.session && req.session.isLoggedIn) {
        const comments = db.prepare(`
          SELECT comments.text, comments.created_at, users.display_name
          FROM comments JOIN users ON comments.user_id = users.id
        `).all();

        return res.render('comments', {
                title: 'Comments',
                comments: comments,
                loggedIn: req.session.isLoggedIn
        });
  }
  else {
        return res.render('login');
  }
});

// Page to add a new comment to the forum
router.get('/comment/new', (req, res) => {
  // The user can only add a comment if logged in
  if (req.session && req.session.isLoggedIn) {
        return res.render('add_comment', {
                loggedIn: req.session.isLoggedIn,
                user: req.session.username,
                error: req.query.error
        });
  }
  // If the user doesn't have an account,
  // instead send them to the login page
  else {
        return res.render('login');
  }
});

// Create the new comment and add it to the memory
router.post('/comment', (req, res) => {
  if (!req.session || !req.session.isLoggedIn) {
        return res.render('login');
  }

  // Verfiy that the form was properly filled out/valid
  const author = req.session.userId;
  const text = req.body.text.toString();

  // If invalid, redirect to the form
  if (!author || !text) {
        return res.redirect('/comment/new?error=' + encodeURIComponent('Comments must have text content.'));
  }
  else {
        // Add the new comment to database
        db.prepare(`
          INSERT INTO comments (user_id, text) VALUES (?, ?)
        `).run(author, text);

        return res.redirect('/comments');
  }
});

module.exports = router;
