import express from "express";
import animeController from "../controllers/animeController.js";

const router = express.Router();

// Home page
// Test: GET http://localhost:3000/
router.get("/", animeController.showHome);

export default router;