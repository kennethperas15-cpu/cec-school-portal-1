import { Request, Response } from 'express';
import { messageStoreService } from '@/services/messagestore.service';

export const messageStoreController = {
  async getAll(req: Request, res: Response) {
    const result = await messageStoreService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await messageStoreService.create(req.body);
    res.status(201).json(created);
  }
};