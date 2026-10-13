const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

/**
 * Reads the JWT from the httpOnly cookie (falls back to Authorization header
 * for API clients / mobile), verifies it, loads the user, and attaches it as
 * req.user. Rejects if the token is missing/invalid or the user no longer
 * exists / is inactive.
 */

const authenticate = asyncHandler(async (req, _res, next) => {

    let token = req.cookies?.[env.cookies.accessTokenName];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {

        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new ApiError(401, 'Not authenticated. Please log in.');
    }

    let decoded;
    try {
        decoded = verifyAccessToken(token);
    } catch (err) {
        throw new ApiError(401, 'Session expired or invalid. Please log in again.');
    }

    const user = await userRepository.findById(decoded.sub);
    if (!user) {
        throw new ApiError(401, 'User no longer exists');
    }
    if (!user.isActive) {
        throw new ApiError(403, 'This account has been deactivated');
    }

    req.user = user;
    next();
});

module.exports = authenticate;
