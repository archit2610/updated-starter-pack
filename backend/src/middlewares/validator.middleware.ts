import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";
import { Request, Response, NextFunction } from "express";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map((err) => {
    if ("path" in err) {
      return {
        [err.path]: err.msg,
      };
    }

  })
  console.log(extractedErrors);
  throw new ApiError(422, "Recieved data is not valid", extractedErrors);
}
