import express from "express";
import partyController from "../controllers/partyController.js";
import { requireAuth } from "../middleware/middleware.js";

// mounted at /parties in app.js
const router = express.Router();

// List upcoming watch parties
// Test: GET http://localhost:3000/parties
router.get("/", partyController.showParties);

// Join / leave a party (capacity is enforced in the service layer)
router.post("/:id/join", requireAuth, partyController.joinParty);
router.post("/:id/leave", requireAuth, partyController.leaveParty);

export default router;