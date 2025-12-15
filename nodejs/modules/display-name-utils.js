// modules/display-name-utils.js

// A function that validates a users display name
function validateDisplayName(displayName) {
  const errors = [];

  // Must have display name
  if (!displayName) {
    errors.push('Display name is required');
    return { valid: false, errors };
  }

  // Display name must be 3 or more characters
  if (displayName.length < 3) {
    errors.push('Display name must be at least 3 characters long');
  }

  // Must be less than 30 characters
  if (displayName.length > 30) {
    errors.push('Display name must be at most 30 characters long');
  }

  // Allow only letters and underscores
  if (/[^a-zA-Z_]/.test(displayName)) {
    errors.push('Display name contains invalid characters');
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(displayName)) {
    errors.push('Display name must contain at least one letter');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateDisplayName
};

