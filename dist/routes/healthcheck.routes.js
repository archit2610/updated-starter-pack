import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controllers.js";
const router = Router();
router.route("/").get(healthCheck);
export default router;
//# sourceMappingURL=healthcheck.routes.js.map