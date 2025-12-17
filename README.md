# COS498_FinalForum
COS498 Final Forum Project

A full-stack forum application built with Node.js, Express, SQLite, Handlebars (HBS), and Socket.IO.
The application supports user authentication, forum comments with pagination, live chat, comment reactions, and secure account recovery.

Table of Contents

Project Overview

Setup & Installation

Running the Application

Database Schema

Environment Variables & Configuration

Nginx Proxy Manager Setup

Email / Account Recovery Configuration

Security Features Implemented

Chat API Documentation

Design Decisions & Trade-offs

Known Limitations & Issues

1. Project Overview

This project implements a web forum where users can:

Register and authenticate securely

Post and paginate comments

Upvote and downvote comments (one reaction per user per comment)

Participate in a live chat using Socket.IO

Recover their account using a security question instead of email-based resets

The system prioritizes clarity, security, and maintainability over unnecessary complexity.

2. Setup & Installation
Prerequisites

Node.js (v18+ recommended)

npm

SQLite3

Nginx Proxy Manager (optional, for production)

Clone the Repository
git clone <repository-url>
cd COS498_FinalForum/nodejs

Install Dependencies
npm install

3. Running the Application
Development
node server.js


The application will run on:

http://localhost:3012

Production

Run behind Nginx Proxy Manager and forward traffic to port 3012.

4. Database Schema

The application uses SQLite with the following core tables:

users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  profile_data TEXT,
  recovery_question TEXT NOT NULL,
  recovery_answer TEXT NOT NULL,
  last_login DATETIME
);

comments
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

reactions
CREATE TABLE reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  comment_id INTEGER NOT NULL,
  upvote INTEGER NOT NULL DEFAULT 0,
  downvote INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, comment_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(comment_id) REFERENCES comments(id)
);

messages (Live Chat)
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

5. Environment Variables & Configuration

This project intentionally minimizes environment variables for simplicity.

Optional Environment Variables
PORT=3012
NODE_ENV=production


Sessions are stored using a SQLite-backed session store.

6. Nginx Proxy Manager Setup
Example Configuration

Domain: forum.example.com

/bin/bash: line 1: q: command not found
Forward Hostname: localhost

Forward Port: 3012

Websockets Support: ✅ Enabled

Socket.IO requires WebSocket support to be enabled.

7. Email / Account Recovery Configuration

Email-based password resets were intentionally removed due to reliability and configuration complexity.

Account Recovery Design

Users set a security question and answer at registration

Answers are hashed using bcrypt

Password recovery requires:

Username

Email

Correct answer to security question

Design trade-off:
This avoids SMTP misconfiguration issues but requires users to remember their recovery answer.

8. Security Features Implemented
Authentication

Password hashing using bcrypt

Session-based authentication

SQLite-backed session store

Login Protection

Login attempt tracking

Temporary lockouts after repeated failures

IP-based tracking

Authorization

Users can only:

Edit their own comments

React once per comment

Access live chat if authenticated

Account Recovery

Recovery answers are hashed (never stored in plaintext)

No sensitive information exposed during recovery flow

Inline comments throughout the auth routes explain password hashing, validation, and comparison logic.

9. Chat API Documentation
Socket.IO Events
Client → Server
socket.emit('sendMessage', {
  message: "Hello world"
});

Server → Client
socket.emit('connected', {
  message: "Welcome DisplayName!"
});

socket.emit('message', {
  display_name: "User",
  message: "Hello",
  timestamp: "2025-01-01T12:00:00Z"
});

REST Endpoint (Chat History)
GET /liveChat


Returns the chat page with recent messages loaded from the database.

10. Design Decisions & Trade-offs
Why SQLite?

Lightweight

Easy to inspect/debug

No external database service required

Why Session-Based Auth (Not JWT)?

Simpler server-side invalidation

Works cleanly with Socket.IO

Easier to reason about for coursework

Why Separate Reactions Table?

Prevents multiple votes per user

Allows independent upvote/downvote counts

Scales better than embedding counts in comments

Why Security Questions Instead of Email Reset?

SMTP setup caused reliability issues

Recovery questions are deterministic and local

Easier to test and grade reliably

11. Known Limitations & Issues

No real-time update of comment reactions (page reload required)

Live chat does not persist message edits

No admin/moderation system

No file uploads or media embedding

Password recovery answers cannot be changed post-registration

Final Notes

This project emphasizes:

Secure authentication practices

Clear route organization

Maintainable database design

Practical trade-offs appropriate for a course project
