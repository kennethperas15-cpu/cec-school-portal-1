import { Request, Response } from 'express';
import { notificationStoreService } from '@/services/notificationstore.service';

export const notificationStoreController = {
  async getAll(req: Request, res: Response) {
    const result = await notificationStoreService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await notificationStoreService.create(req.body);
    res.status(201).json(created);
  }
};