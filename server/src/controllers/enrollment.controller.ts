import { Request, Response } from 'express';
export const enrollmentcontrollerController = {
  async getAll(_req: Request, res: Response) { res.json({ data: [] }); },
  async create(req: Request, res: Response) { res.status(201).json(req.body); }
};

