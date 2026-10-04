import { failure } from '../utils/apiResponse.js';
import { logEvent } from '../utils/logger.js';

export function notFound(req, res) {
  return failure(res, 'This API endpoint does not exist.', 404);
}

export function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.parse.failed' ? 400
    : error.type === 'entity.too.large' ? 413
    : error.name === 'ZodError' ? 400
    : error.code === '23505' || error.original?.code === '23505' ? 409
    : error.status || 500;
  logEvent('request_failed', { requestId: req.id, method: req.method, status });
  const message = error.type === 'entity.parse.failed' ? 'Request body must be valid JSON.'
    : status === 413 ? 'The request is too large.'
    : error.name === 'ZodError' ? 'Please check your input. Passwords need at least 10 characters and email addresses must be valid.'
    : status === 409 ? 'This record already exists or an audit is already running.'
    : status < 500 ? error.message : 'Something went wrong. Please try again.';
  return failure(res, message, status);
}

