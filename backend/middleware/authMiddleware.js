import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
    let token = req.header("Authorization");

    if (!token) {
        console.warn("Auth Middleware: No token received in request headers.");
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        if (token.startsWith("Bearer ")) {
            token = token.split(" ")[1];
        }

        // console.log("Decoded Token: ", token);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        
        if (!user) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        // console.log(`Authenticated User: ${user.email}`);
        req.user = { id: user._id, isAdmin: user.isAdmin };
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
};

// Admin Middleware
const adminMiddleware = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
};

export { authMiddleware, adminMiddleware };
