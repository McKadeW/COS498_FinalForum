const express = require('express');
const hbs = require('hbs');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('./sqlite-session-store');
const argon2 = require('argon2');
const db = require('./db');
const { validatePassword, hashPassword, comparePassword } = require('./modules/password-utils');
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
app.use(express.static('public'));

// Session configuration with SQLite store
const sessionStore = new SQLiteStore({
  db: path.join(__dirname, 'sessions.db'),
  table: 'sessions'
});

// Session Middleware
app.use(session({
  store: sessionStore,
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
  try {
    const username = req.body.username;
    const password = req.body.password;
  
    if (!username || !password) {
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

    // Hash the password before storing
    const passwordHash = await hashPassword(password);

    // Add new user into database
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, email, profile_data)
      VALUES (?, ?, NULL, '{}')
    `);
    const result = stmt.run(username, passwordHash);

    return res.redirect('/login');

  } catch (error) {
    console.error('Registration Error:', error);
    return res.redirect('/register?error=1'); //NEW ERRORS NEEDED
  }
});

// Login page
app.get('/login', (req, res) => {
  return res.render('login', {
	title: 'Login',
	error: req.query.error
  });
});

// Login form
app.post('/login', async (req, res) => {
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
    req.session.isLoggedIn = true;
    
    // Redirect to success page
    return res.redirect('/');

  } catch (error) {
    console.error('Login Error:', error);
    return res.redirect('/login?error=1'); //FIX
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

// Graceful shutdown, this will help the session to close the db gracefully since we're now using it.
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  sessionStore.close();
  process.exit(0);
});

