import userModel from "../models/userModel.js";
import { sendError } from "../utils/apiError.js";

// Must run after userAuth. Looking up the role on each request keeps role
// changes effective immediately instead of relying on a stale JWT claim.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.userId).select('role');

    if (!user) {
      return sendError(res, 401, 'User account not found', 'USER_NOT_FOUND');
    }

    if (user.role !== 'admin') {
      return sendError(res, 403, 'Admin access required', 'ADMIN_ACCESS_REQUIRED');
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    return sendError(res, 500, 'Unable to verify admin access', 'ADMIN_AUTHORIZATION_FAILED');
  }
};

export default requireAdmin;
