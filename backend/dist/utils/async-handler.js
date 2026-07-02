function asyncHandler(requestHandler) {
    return function (req, res, next) {
        Promise.resolve(requestHandler(req, res, next)).catch(next);
    };
}
export { asyncHandler };
//# sourceMappingURL=async-handler.js.map