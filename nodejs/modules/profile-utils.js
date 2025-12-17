// modules/profile-utils.js

// This function validates hex color input from the user
// to be used in profile customization
function validateProfileColor(color) {
  const errors = [];

  // Ensure proper function params
  if (!color) {
    errors.push('Hex color is required');
    return { valid: false, errors };
  }

  // A regex format to text for hex color codes (GeeksForGeeks)
  // https://www.geeksforgeeks.org/dsa/how-to-validate-hexadecimal-color-code-using-regular-expression/
  let validFormat = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  // Validate hex color
  if (!validFormat.test(color)) {
    errors.push('Hex color must be in a valid format, such as #ff000');
  }

  // Return errors (if any)
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateProfileColor
};
