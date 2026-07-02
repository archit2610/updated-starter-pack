import type { Request, Response, NextFunction } from "express";
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare function asyncHandler(requestHandler: AsyncRequestHandler): (req: Request, res: Response, next: NextFunction) => void;
export { asyncHandler };
//# sourceMappingURL=async-handler.d.ts.map