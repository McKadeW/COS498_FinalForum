// This is the main server.js file for this project
// It manages the interactions between routes

const express = require('express');
const hbs = require('hbs');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('./sqlite-session-store');
const app = express();
const PORT = process.env.PORT || 3012;

const authRouter = require('./routes/auth');
const commentRouter = require('./routes/comments');
const pageRouter = require('./routes/pages');

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
app.use('/', pageRouter);
app.use('/', authRouter);
app.use('/', commentRouter);

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
