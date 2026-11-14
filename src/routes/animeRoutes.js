import express from "express";
import animeController from "../controllers/animeController.js";

const router = express.Router();

// Home page
// Test: GET http://localhost:3000/
router.get("/", animeController.showHome);

// Catalog: grid, or one title with ?anime=ID
// Test: GET http://localhost:3000/catalog?genre=Sci-Fi&sort=rating
router.get("/catalog", animeController.showCatalog);

export default router;