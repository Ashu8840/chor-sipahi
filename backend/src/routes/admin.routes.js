import express from "express";
import {
  getAllUsers,
  banUser,
  unbanUser,
  deleteUser,
  getStats,
  getAllRooms,
  deleteRoom,
} from "../controllers/admin.controller.js";
import {
  getAllReports,
  updateReportStatus,
} from "../controllers/report.controller.js";
import { authenticate, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate, isAdmin);

router.get("/stats", getStats);

router.get("/users", getAllUsers);

router.post("/users/:userId/ban", banUser);

router.post("/users/:userId/unban", unbanUser);

router.delete("/users/:userId", deleteUser);

router.get("/rooms", getAllRooms);

router.delete("/rooms/:roomId", deleteRoom);

router.get("/reports", getAllReports);

router.put("/reports/:reportId", updateReportStatus);

export default router;
