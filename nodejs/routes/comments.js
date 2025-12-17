// This is the routes file containing all of the routes related
// to adding, handling, and displaying user posted comments
// It also includes comment pagination and reactions, such as upvoting/downvoting

const express = require('express');
const db = require('../db');
const router = express.Router();

// Comments (main forum page)
router.get('/comments', (req, res) => {
  // Display the page and all currently posted comments
  // Only shows if the user is logged in
  if (req.session && req.session.isLoggedIn) {
    // Defines how many comments to show on each page
    const num_comments_page = 20;

    // Get the current page number
    let page_num = req.query.page;
    // If it doesnt exist or is invalid, default to page = 1
    if (!page_num) {
      page_num = 1;
    }

    // Get the number of comments in the database
    const total_comments = db.prepare(`SELECT COUNT(*) AS count FROM comments`).get().count;
    // Based on the # of comments in the database and how many we want
    // to display per page, we can determine how many pages are needed
    // Need to round up always, even if the output is 4.3, 5 pages would be needed
    const total_pages = Math.ceil(total_comments / num_comments_page)

    // If there are no comments, default to page 1
    if (total_comments === 0) {
      page_num = 1;
    }
    // If the users tries to access a page larger
    // than the max, default to the largest option available
    if (page_num > total_pages) {
      page_num = total_pages;
    }

    // For query optimization, we don't want to load all comments
    // Only load the section of comments needed for the selected page
    // (e.g. Page 4 is selected, 20 comments/page, we want to load comments 60-80)
    const start_point = page_num * num_comments_page - 20;

    // This prepare statment does a lot of things:
    // It will fetch all comment data, including comment reactions (upvotes/downvotes)
    // It ties which user posted each comment and the comments existing reactions
    // It then organizes the comments by newest firsg
    const comments = db.prepare(`
      SELECT comments.id, comments.text, comments.created_at, users.display_name, 
      users.profile_data, SUM(upvote) AS upvote, SUM(downvote) AS downvote
      FROM comments JOIN users ON comments.user_id = users.id 
      LEFT JOIN reactions ON comments.id = reactions.comment_id
      GROUP BY comments.id ORDER BY comments.created_at DESC LIMIT ? OFFSET ?
    `).all(num_comments_page, start_point);

    // This will hold the content needed to render the
    // active page based on the button selected by the user
    let selected = false;
    const page_button_data = [];
    for (let i = 0; i < total_pages; i++) {
      // Check to see if the current page number is selected
      if (page_num === i) {
        selected = true;
      }
      else {
        selected = false;
      }

      // Adds the available page numbers and whether they have been selected
      page_button_data.push({ number: i + 1, isSelected: selected});
    }

    // Return the info needed to populate the hbs page numbers
    // Also to show total number of comments and current page information
    return res.render('comments', {
      title: 'Comments',
      error: req.query.error,
      comments: comments,
      loggedIn: req.session.isLoggedIn,
      page_button_data: page_button_data,
      current_page: page_num,
      total_pages: total_pages,    
      total_comments: total_comments,
      // Determine previous and next controls
      prev: page_num > 1,
      prev_page: page_num - 1,
      next: page_num < total_pages,
      next_page: page_num + 1
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
    db.prepare(`INSERT INTO comments (user_id, text) VALUES (?, ?)`).run(author, text);

    return res.redirect('/comments');
  }
});

// A route that lets users react to comments with upvotes/downvotes
// User's are limited to 1 reaction per comment
router.post('/comment/reactions', (req, res) => {
  // The user can only upvote/downvote if logged in
  if (req.session && req.session.isLoggedIn) {
    // Set upvote and downvote variables
    let upvote = 0;
    let downvote = 0;

    // See which reaction was selected
    if (req.body.upvote) {
      upvote = 1;
    }
    if (req.body.downvote) {
      downvote = 1;
    }

    // Ensure we have the comment ID to look up in the database
    if (!req.body.comment_id) {
      return res.redirect('/comments?error=' + encodeURIComponent('Missing comment ID.'));
    }

    // Check to see if the user already reacted to this comment
    const reaction = db.prepare(`
	    SELECT upvote, downvote FROM reactions 
	    WHERE user_id = ? AND comment_id = ?
	    `).get(req.session.userId, req.body.comment_id);

    // If no previous reaction exists add it
    if (!reaction) {
      db.prepare(`
	    INSERT INTO reactions (user_id, comment_id, upvote, downvote) VALUES (?, ?, ?, ?)
	    `).run(req.session.userId, req.body.comment_id, upvote, downvote);
    }
    // If the reaction already exists, update their choice (if it changed) 
    else {
      // Check to see if their choice changed
      if (reaction.upvote !== upvote || reaction.downvote !== downvote) {
        db.prepare(`
		UPDATE reactions SET upvote = ?, downvote = ?
		WHERE user_id = ? AND comment_id = ?
		`).run(upvote, downvote, req.session.userId, req.body.comment_id);
      }
    }

    return res.redirect('/comments');
  }
  // If the user doesn't have an account,
  // instead send them to the login page
  else {
    return res.render('login');
  }
});

module.exports = router;
