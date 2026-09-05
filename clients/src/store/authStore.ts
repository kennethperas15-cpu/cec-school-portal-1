import { Request, Response } from 'express';
import { authStoreService } from '@/services/authstore.service';

export const authStoreController = {
  async getAll(req: Request, res: Response) {
    const result = await authStoreService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await authStoreService.create(req.body);
    res.status(201).json(created);
  }
};