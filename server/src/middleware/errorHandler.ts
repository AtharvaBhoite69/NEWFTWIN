import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  res.status(500).json({
    success: false,
    error: 'Something went wrong. Please try again later.',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
