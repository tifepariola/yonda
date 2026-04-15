import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so that any thrown error is forwarded
 * to next() — and therefore to the global error handler — instead of becoming
 * an unhandled promise rejection that leaves the request hanging (no response,
 * which the browser mis-reports as a CORS error).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
