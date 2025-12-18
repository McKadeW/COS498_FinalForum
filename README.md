# COS498 Final Forum Project
This project is an extension of the Wild West Forum (COS498_MidtermForum repository). It extends its functionality and strengthens 
its security. It is a forum application built with Node.js, Express, SQLite, Handlebars (HBS), and Socket.IO. The application supports 
user authentication, forum comments with pagination, a live chat, comment reactions by upvoting and downvoting, and secure account 
recovery through user generates question/answer.

## 1. Overview

This project implements a web forum where users can:

* Register and authenticate securely
* Post and paginate comments
* Upvote and downvote comments (one reaction per user per comment)
* Participate in a live chat using Socket.IO
* Recover their account using a security question instead of email-based resets
* Change account password, email, display name, and customization options in their profile page

## 2. Setup & Installation

**Application Dependencies:**

* Node.js
* npm
* SQLite3
* Nginx Proxy Manager

**Further Packages/Modules:**

* "argon2": "^0.44.0",
* "better-sqlite3": "^12.5.0",
* "cors": "^2.8.5",
* "express": "^5.2.1",
* "express-session": "^1.18.2",
* "hbs": "^4.2.0",
* "nodemailer": "^7.0.11",
* "socket.io": "^4.8.1"

**Clone the Repository**

```
git clone <repository-url>
cd COS498_FinalForum/nodejs

```

**Install Dependencies**

```
npm install

```

## 3. Running the Application

**Development**

```
node server.js

```

The application will run on: http://localhost:3012

**Production**
Run Nginx Proxy Manager and forward traffic to port 3012.

**Setting up Nginx Proxy Manager:**

- **Step 1 - Get a Domain**
You can purchase and configure a domain through a registrar like Squarespace. After buying it, you must update the domain's 
nameservers to your hosting platform (DigitalOcean was used in this project) so you can manage DNS there. Then you add DNS 
records (A record for the root domain and a CNAME or A record for www) to point the domain to your server’s IP. Once DNS 
finishes propagating, your domain will load your server instead of the raw IP.

- **Step 2 - Setup Nginx Proxy Manager and Configure SSL Certificate**

Spin up the project (in root directory) to setup the Nginx proxy manager:

```
docker compose up -d --build
```

Once the containers are running, navigate to http://localhost:5001 to view the admin dashboard. You will be prompted to 
create an account. Once completed, go to Certificates->Add Certificates->Let's Encrypt via HTTP, add relevant domain names 
into the pop-up form. Navigate to Hosts->Proxy Hosts->Add Proxy Host, add the domain names here and configure these values:
- scheme: http
- Forward Hostname/IP: your Node.js container name, not domain name
- Forward Port: The port for the project, currently it's defined as 3012
- Block Common Exploits: True
- Websockets Support: True

Now go to the SSL tab and select your domain from the SSL Certificate dropdown, and set Force SSL to True. Save.

- **Step 3 - View HTTPS Site**

Now you should be able to naviagte to your domain name and see the application.

## 4. Database Schema

The application uses Better SQLite3 with the following core tables:

**users**

The core table storing account credentials, hashed passwords, security questions for recovery, and account lockout 
status for security.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    recovery_question TEXT NOT NULL,
    recovery_answer TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    display_name TEXT NOT NULL,
    profile_data TEXT,
    failed_login_attemps INTEGER DEFAULT 0,
    locked_until INTEGER DEFAULT 0
);

```

**sessions**

Manages active user logins by linking a unique session ID to a user, allowing the server to maintain state across 
different requests.

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT NOT NULL UNIQUE,
    expires INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**comments**

Stores the main forum content. Each entry records the text content and links back to the user who posted it.

```sql
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

```

**login_attempts**

A table that tracks user login history through IP address and usernames to trigger an account lockout after too many attemtps.

```sql
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    username TEXT NOT NULL,
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    success INTEGER DEFAULT 0
);
```

**messages**

Specifically for the live chat feature, this table manages chats so that their history can be reloaded.

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**reactions**

A table that manages upvotes and downvotes on forum comments. It uses a unique constraint on the user/comment pair to 
ensure each user can only react to a comment once.

```sql
CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    comment_id INTEGER NOT NULL,
    upvote INTEGER NOT NULL DEFAULT 0,
    downvote INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, comment_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(comment_id) REFERENCES comments(id)
);

```

Overall, the users table holds all the others together. When a user interacts with the app, to post a comment, send a 
live message, leave a reaction, etc. the database uses the user_id as a connector to verify the user's identity. This is 
supported by the sessions and login_attempts tables as they ensure that only authenticated users can modify/view content.
Additionally, Sessions are stored using a SQLite session store.

## 5. Environment Variables & Configuration

This project has a few environment variables to note.

**Environment Variables**

* PORT=3012
* NODE_ENV=production

## 6. Email / Account Recovery

Email-based password resets were removed due to a current incompatibility with the system. As a result, Q/A based account 
recovery was implemented. When a user registers an account, they are prompted to fill out an account recovery question 
(e.g What's your favorite color?) and their answer to it. If the user forgets their password, they can fill out a form with 
their username and email address. This will display their recovery question. If they answer the question correclty, their password
will become the one they just enetered (assuming it's valid).

## 7. Security Features Implemented

* Authentication: Password hashing using argon2 and session-based authentication with a SQLite store.
* Login Protection: Login attempt tracking, temporary lockouts after repeated failures, and IP-based tracking.
* Authorization: Users can only access/view pages if they are logged in and have an active session.
* Account Recovery: Recovery answers are hashed, where no sensitive information is exposed.
* Changing Account Info: Users can change their account password, email, display name, and profile customization, as long as
they know their current password (and it's correct).
* Display Names: The user's username is never displayed, instead their display name is shared. This way their accounts 
stay more secure.

## 8. Live Chat API Documentation

**Socket.IO Interactions**

The server used Socket.IO to create a live chat. This chat allows authenticated users to post messages that are broadcast to all users. When a 
user opens the forum, a connection is established with the socket. The server then identifies the user and sends a welcome message using their 
display name. Once a user submits a message, it is emitted to the server, where it is processed and "broadcast" it to every other connected 
user using "io.emit". 

**A Little About Socket.io**

using 'socket' in Socket.io is a local function call (only happens to that user who is making the call), while 'io' is global (triggers for 
all users). This is how we can get different functionality. For example, '.on' waits until it is called to run by a '.emit'. the '.emit'
specifies the '.on' it wants to call and can send data toit, usually to perform some sort of logic. This is how we are able to emit broadcasts
with 'io.emit', we ouptut a message to all connected users.

**REST Endpoints For Live Chat**

* GET /liveChat: Displays the live chat page, also showing the chat history.
* POST /liveChat/send: Processes a new chat message, saves it to the database, and emits it to all users.

## 9. Design Decisions & Trade-offs

* Switching to SQlite3 database instead of array storage (seen in Wild West Forum):

This switch makes it easier to access and manage data. It's also relatively lightweight, which works well for a project of this size that has
many overlapping fields of data. Using SQlite also improves the runtime of the application as a lot of data can be parsed/gathered from 1
'db.prepare' call, instead of iterating and parsing an array on each lookup.

* Argon2 Hashing:

In order to keep user account information more secure, this project uses argon2 to hash sensitive account information.

* Using REST API Routes to handle Socket.io Interactions:

Some of the socket.io interactions are managed in server.js, but when a user sends a new message, it's sent to '/liveChat/send'. This is so that
the route can handle chat broadcasts independently from the rest of the io functionality. The socket.io implementation also automatically 
disconnects if the user's session ends.

* Establishing Pagination:

I decided to calculate what commnents to display based on the user-selected page number by using an offset equal to the page number * number of
comments per page - 20 (20 comments/page). This way, only necessary comments would be pulled from the database instead of all of them.

* Reactions (Upvotes/Downvotes):

I created a seperate tables to manage user reactions so that logic between reactions and comments could remain seperate. It stores information on
if a user has left a reaction on a specified comment (limiting user's to 1 reaction per comment). This is later joined with the comments table 
for display.

* Live Chat UI Attributes:

When implementing the live chat feature, I wanted to make sure users had easy access to the form fields for adding a new message. As a result, I
made the form field fixed on the screen so that it didn't scroll with the messages.

* Database Persistence

The 'database' folder is mounted in a volume within the docker-compose.yml. This way the changes made to the database will remain synchronous.

## 10. Known Limitations & Issues

* Comment upvotes/downvotes appear on page reload.
* Password recovery questions/answers cannot be changed/accessed after registration.
* Some routes may render instead of redirect (and vice versa). This doesn't effect the flow/logic of the application but might not always have 
an up to date URL when you enter a new page.
