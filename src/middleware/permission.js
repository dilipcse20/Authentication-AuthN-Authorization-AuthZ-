const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants/roles');

/**
 * Usage: checkPermission('DELETE_USERS')
 * SUPER_ADMIN always passes. Must run after `authenticate`.
 */
function checkPermission(requiredPermission) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }
    if (!req.user.permissions?.includes(requiredPermission)) {
      return next(new ApiError(403, `Forbidden: missing permission ${requiredPermission}`));
    }
    return next();
  };
}

module.exports = checkPermission;
