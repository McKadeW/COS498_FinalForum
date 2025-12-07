const express = require('express');
const hbs = require('hbs');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const argon2 = require('argon2');
const { db } = require('./db');
const app = express();
const PORT = process.env.PORT || 3012;

// Configure Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register partials directory
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// System "in-memory" data
// Array of objects { username: string, password: string }
//const users = [];
// Array of objects { author: string, text: string, createdAt: Date }
//const comments = [];

// Session Middleware
app.use(session({
  secret: 'Wild-West-Forum-Secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));

// Routes ------------------------------

// Home page
app.get('/', (req, res) => {
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

// Registration page
app.get('/register', (req, res) => {
  return res.render('register', {
	title: 'Register',
	error: req.query.error
  });
});

// Resgistration form
app.post('/register', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  
  // Verify a unique username
  for (let i = 0; i < users.length; i++){
	if (username === users[i].username){
	  return res.redirect('/register?error=1');
	}
  }

  // If not taken add the user info to the DB
  // and redirect to the login page
  users.push({username, password});
  return res.redirect('/login');
  
});

// Login page
app.get('/login', (req, res) => {
  return res.render('login', {
	title: 'Login',
	error: req.query.error
  });
});

// Login form
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Simple authentication
  if (username && password) {
	let userFound = 0;
	// Verify that the user has an account
	for (let i = 0; i < users.length; i++){
        	if (username === users[i].username && password === users[i].password){
          		userFound = 1;
			// Set session data
        		req.session.isLoggedIn = true;
        		req.session.username = username;
        		return res.redirect('/');
        	}
	}

	// If the user info isn't found, they don't have 
	// an account. Redirect back to login page with error.
	if (!userFound){
		return res.redirect('/login?error=1');	
	}
  }
  // If the user didn't enter username and password, error
  else {
	return res.redirect('/login?error=1');
  }
});

// Logout action
app.post('/logout', (req, res) => {
  // Destroy the session cookie, go to home page
  req.session.destroy((err) => {
	if (err) {
            console.log('Error destroying session:', err);
        }
        return res.redirect('/');
  });
});

// Comments (main forum page)
app.get('/comments', (req, res) => {
  // Display the page and all currently posted comments
  // Only shows if the user is logged in
  if (req.session && req.session.isLoggedIn) {
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
app.get('/comment/new', (req, res) => {
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
app.post('/comment', (req, res) => {
  if (!req.session || !req.session.isLoggedIn) {
        return res.render('login');
  }
  
  // Verfiy that the form was properly filled out/valid
  const author = req.session.username;
  const text = req.body.text.toString();
  
  // If invalid, redirect to the form
  if (!author || !text) {
	return res.redirect('/comment/new?error=1');
  }
  else {
	// Add the new comment to memory
	comments.push({
		author: req.session.username,
		text: req.body.text.toString(),
		createdAt: new Date().toLocaleString()
	});
  	return res.redirect('/comments');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

