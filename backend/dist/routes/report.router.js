import { Router } from "express";
import { createResearch, getAllReports, getReport, updateReportById, deleteReport } from "../controllers/reports.controller.js";
import { auth } from "../middlewares/jwt.middleware.js";
const router = Router();
router.route('/create').post(auth, createResearch);
router.route('/get-allReports').get(auth, getAllReports);
router.route('/get-Report/:token').get(auth, getReport);
router.route('/update-report/:token').post(auth, updateReportById);
router.route('/delete-Report/:token').get(auth, deleteReport);
export default router;
//# sourceMappingURL=report.router.js.map