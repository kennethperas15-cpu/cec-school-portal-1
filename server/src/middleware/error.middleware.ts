import { Request, Response, NextFunction } from 'express';

export const errormiddlewareMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  const databaseUnavailable = error instanceof Error && (
    error.name === 'SequelizeConnectionError' ||
    error.name === 'SequelizeHostNotFoundError' ||
    error.name === 'SequelizeConnectionRefusedError'
  );
  const configurationUnavailable = error instanceof Error && (
    error.message === 'Google OAuth is not configured' ||
    error.message === 'Email delivery is not configured'
  );
  res.status(databaseUnavailable || configurationUnavailable ? 503 : 500).json({
    success: false,
    message: databaseUnavailable
      ? 'Database is unavailable. Please try again later.'
      : configurationUnavailable
        ? `${message}. Configure the server environment before using this feature.`
        : message
  });
};
