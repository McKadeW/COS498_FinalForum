// This is the main server.js file for this project
// It manages the interactions between routes

const express = require('express');
const hbs = require('hbs');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('./sqlite-session-store');
const http = require('http');
const db = require('./db');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3012;

const authRouter = require('./routes/auth');
const commentRouter = require('./routes/comments');
const pageRouter = require('./routes/pages');
const liveChatRouter = require('./routes/live_chat');

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// Allow the /liveChat/send POST route handle broadcasts
// Source: https://github.com/socketio/socket.io/discussions/4157
app.set('io', io);

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
const sessionMiddleware = session({
  store: sessionStore,
  secret: 'Wild-West-Forum-Secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60
  }
});
app.use(sessionMiddleware);

// Routes ------------------------------
app.use('/', pageRouter);
app.use('/', authRouter);
app.use('/', commentRouter);
app.use('/', liveChatRouter);

// Share the session with Socket.IO
io.engine.use(sessionMiddleware);

// Socket.IO event handlers
// Broadcasting a message to all users can be found in ./routes/live_chat.js
io.on('connection', (socket) => {
  const session = socket.request.session;
    
  // Check if user is authenticated
  if (!session.isLoggedIn) {
    socket.disconnect();
    return;
  }
    
  // Send welcome message once connected
  socket.emit('connected', {
    message: `Welcome ${session.display_name}!`,
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown, this will help the session to close the db gracefully since we're now using it.
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  sessionStore.close();
  process.exit(0);
});
