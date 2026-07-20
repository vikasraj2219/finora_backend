// Wraps an async controller/middleware so rejected promises are forwarded to next()
// instead of needing a try/catch in every controller.
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
