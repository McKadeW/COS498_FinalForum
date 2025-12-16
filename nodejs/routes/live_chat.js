// The routes related to the live chat using socket.io

const express = require('express');
const db = require('../db');
const router = express.Router();

// The route to display the live socket.io chat and the chat history
router.get('/liveChat', (req, res) => {
  // Only let the user enter the live chat if they are logged in
  if (req.session && req.session.isLoggedIn) {
    // Load the recent chat history with the newest messages at the top
    const messages = db.prepare(`
      SELECT messages.text, messages.created_at, users.display_name, users.profile_data
      FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at ASC
    `).all();

    return res.render('socket_chat', {
      loggedIn: req.session.isLoggedIn,
      messages: messages,
      error: req.query.error
    });
  }
  else {
      return res.render('login');
  }
});

// A route to send a chat message and store it in the database
router.post('/liveChat/send', (req, res) => {
  // Only let the user enter the live chat if they are logged in
  if (req.session && req.session.isLoggedIn) {
    const message = req.body.message;

    // Make sure a message was entered
    if (!message) {
      return res.redirect('/liveChat?error=' + encodeURIComponent('You cannot post an empty message.'));
    }

    // If the message isn't empty, insert it into the database
    // Also return when the message was sent for chat display
    const message_created = db.prepare(`
      INSERT INTO messages (user_id, text) VALUES (?, ?) 
      RETURNING created_at
    `).get(req.session.userId, message);

    // Get the instance of the already created socket
    const io = req.app.get('io');

    // Broadcast message with user info
    io.emit('message', {
      display_name: req.session.display_name,
      message: message,
      timestamp: message_created.created_at
    });

    return res.redirect('/liveChat');
  }
  else {
    return res.render('login');
  }
});

module.exports = router;
