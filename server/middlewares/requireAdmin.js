import userModel from "../models/userModel.js";

// Must run after userAuth. Looking up the role on each request keeps role
// changes effective immediately instead of relying on a stale JWT claim.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.userId).select('role');

    if (!user) {
      return res.status(401).json({ success: false, message: "User account not found" });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    return res.status(500).json({ success: false, message: "Unable to verify admin access" });
  }
};

export default requireAdmin;
