const ApiError = require('../utils/ApiError');

/**
 * Usage: authorize('ADMIN') or authorize('ADMIN', 'SUPER_ADMIN')
 * Must run after `authenticate` middleware.
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient role'));
    }
    return next();
  };
}

module.exports = authorize;
