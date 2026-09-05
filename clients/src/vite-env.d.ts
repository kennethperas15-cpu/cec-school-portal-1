import { Request, Response } from 'express';
import { vite-env.dService } from '@/services/vite-env.d.service';

export const vite-env.dController = {
  async getAll(req: Request, res: Response) {
    const result = await vite-env.dService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await vite-env.dService.create(req.body);
    res.status(201).json(created);
  }
};