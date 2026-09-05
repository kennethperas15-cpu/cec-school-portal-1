import { Request, Response } from 'express';
import { vite.configService } from '@/services/vite.config.service';

export const vite.configController = {
  async getAll(req: Request, res: Response) {
    const result = await vite.configService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await vite.configService.create(req.body);
    res.status(201).json(created);
  }
};