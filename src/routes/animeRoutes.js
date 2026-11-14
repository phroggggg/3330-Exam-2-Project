import express from "express";
import animeController from "../controllers/animeController.js";
import { requireAuth, requireAdmin } from "../middleware/middleware.js";

const router = express.Router();

// Home page
// Test: GET http://localhost:3000/
router.get("/", animeController.showHome);

// Catalog: grid, or one title with ?anime=ID
// Test: GET http://localhost:3000/catalog?genre=Sci-Fi&sort=rating
router.get("/catalog", animeController.showCatalog);

// Admin: add an anime to the catalog (form on /admin)
router.post("/catalog", requireAdmin, animeController.addAnime);

// Reviews (one per user per anime; submitting again edits the existing review)
router.post("/catalog/:id/reviews", requireAuth, animeController.saveReview);
router.post("/catalog/:id/reviews/delete", requireAuth, animeController.removeReview);

// Personal watchlist (status + episode progress)
// Test: GET http://localhost:3000/watchlist (after logging in)
router.get("/watchlist", requireAuth, animeController.showWatchlist);
router.post("/watchlist", requireAuth, animeController.addEntry);
router.post("/watchlist/:id/update", requireAuth, animeController.updateEntry);
router.post("/watchlist/:id/delete", requireAuth, animeController.removeEntry);

export default router;