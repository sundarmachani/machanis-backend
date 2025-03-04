import express from "express";
import { upload } from "../config/cloudinaryConfig.js";

const router = express.Router();

// Upload endpoint (POST request)
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ imageUrl: req.file.path }); // Return Cloudinary image URL
});

export default router;
