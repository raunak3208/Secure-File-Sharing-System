// Success response
exports.success = (data, message = 'Success', statusCode = 200) => {
  return {
    statusCode,
    body: {
      success: true,
      message,
      data,
    },
  };
};

// Error response
exports.error = (error, message = 'Error', statusCode = 500) => {
  return {
    statusCode,
    body: {
      success: false,
      message,
      error: error.message || error,
    },
  };
};

// Validation error
exports.validationError = (errors) => {
  return {
    statusCode: 400,
    body: {
      success: false,
      message: 'Validation failed',
      errors,
    },
  };
};
