import { Router } from "express";
import User from "../models/User.js"
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

// Get logged-in user profile
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;
