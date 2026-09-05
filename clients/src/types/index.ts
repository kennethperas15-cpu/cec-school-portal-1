import { Request, Response } from 'express';
import { indexService } from '@/services/index.service';

export const indexController = {
  async getAll(req: Request, res: Response) {
    const result = await indexService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await indexService.create(req.body);
    res.status(201).json(created);
  }
};