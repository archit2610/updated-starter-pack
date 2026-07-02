import express from "express";
import cookieparser from "cookie-parser";
import cors from "cors";
import Authentication from "./routes/auth.routes.js";
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieparser());
app.use("/api/v1/healthcheck", Authentication);
app.use((err, req, res, next) => {
    const status = err.statusCode ?? 500;
    res.status(status).json({ success: false, message: err.message, errors: err.errors });
});
export default app;
//# sourceMappingURL=app.js.map