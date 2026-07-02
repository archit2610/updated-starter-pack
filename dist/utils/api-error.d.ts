declare class ApiError extends Error {
    statusCode: number;
    data: null;
    success: boolean;
    errors: unknown[];
    constructor(statusCode: number, message?: string, errors?: unknown[], stack?: string);
}
export { ApiError };
//# sourceMappingURL=api-error.d.ts.map