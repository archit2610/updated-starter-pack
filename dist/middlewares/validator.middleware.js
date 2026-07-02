import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";
export const validate = (req, res, next) => {
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
    });
    console.log(extractedErrors);
    throw new ApiError(422, "Recieved data is not valid", extractedErrors);
};
//# sourceMappingURL=validator.middleware.js.map