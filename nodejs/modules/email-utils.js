// modules/email-utils.js

/*
validateEmail checks if an email address follows valid format
*/
function validateEmail(email) {
  const errors = [];
  
  // Ensure the function was called with proper params
  if (!email) {
    errors.push('Email is required');
    return { valid: false, errors };
  }
  
  // A common regex test case to validate emails (GeeksForGeeks)
  // Source: https://www.geeksforgeeks.org/javascript/how-to-validate-email-address-using-regexp-in-javascript/
  let validFormat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Validate email
  if (!validFormat.test(email)) {
    errors.push('Email must be in a valid format, such as user@example.com');
  }
  
  // Return errors (if any)
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateEmail
};
