import { Request, Response } from 'express';
import { apiService } from '@/services/api.service';

export const apiController = {
  async getAll(req: Request, res: Response) {
    const result = await apiService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await apiService.create(req.body);
    res.status(201).json(created);
  }
};