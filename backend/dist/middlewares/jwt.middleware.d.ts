import { Request, Response, NextFunction } from "express";
import { User } from "../db/schema.js";
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
export declare const auth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=jwt.middleware.d.ts.map