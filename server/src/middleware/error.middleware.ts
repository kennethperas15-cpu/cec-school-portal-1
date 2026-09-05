import { Request, Response, NextFunction } from 'express';
export const errormiddlewareMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

