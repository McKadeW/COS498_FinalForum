// modules/auth-middleware.js
// Contained content to lockout the user after repeated login attempts

const loginTracker = require('./login-tracker');

/**
 Middleware to check username+IP-based login lockout
 Should be used before login route handlers
 Note: This requires the username to be in req.body.username
 */
function checkLoginLockout(req, res, next) {
  const ipAddress = getClientIP(req);
  const username = req.body?.username;
  
  // If no username provided, skip lockout check (will be handled by validation)
  if (!username) {
    return next();
  }
  
  const lockoutStatus = loginTracker.checkLockout(ipAddress, username);
  
  if (lockoutStatus.locked) {
    const minutesRemaining = Math.ceil(lockoutStatus.remainingTime / (60 * 1000));
    return res.redirect('/login/?error=' + encodeURIComponent('Too many failed login attempts. Remaining time before next login attempt: ' + minutesRemaining + ' minutes.'));
  }
  
  next();
}

/**
 Helper function to get client IP address
 Handles proxies and various connection types
 */
function getClientIP(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         'unknown';
}

module.exports = {
  checkLoginLockout,
  getClientIP
};
