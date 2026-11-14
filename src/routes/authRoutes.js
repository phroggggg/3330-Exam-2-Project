import express from "express";
import authController from "../controllers/authController.js";
import { requireAdmin, redirectIfAuthenticated, rateLimit } from "../middleware/middleware.js";

const router = express.Router();
const authLimiter = rateLimit({ max: Number(process.env.AUTH_RATE_LIMIT) || 20 });

// Register / log in / log out
// Test: GET http://localhost:3000/login
router.get("/login", redirectIfAuthenticated, authController.showLogin);
router.post("/login", authLimiter, authController.login);
router.get("/register", redirectIfAuthenticated, authController.showRegister);
router.post("/register", authLimiter, authController.register);
router.post("/logout", authController.logout);

// Admin dashboard (admins only): lists every registered user
// Test: GET http://localhost:3000/admin (after logging in as admin)
router.get("/admin", requireAdmin, authController.showAdmin);

export default router;