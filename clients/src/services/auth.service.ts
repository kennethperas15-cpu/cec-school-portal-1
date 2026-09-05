import { Request, Response } from 'express';
import { auth.serviceService } from '@/services/auth.service.service';

export const auth.serviceController = {
  async getAll(req: Request, res: Response) {
    const result = await auth.serviceService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await auth.serviceService.create(req.body);
    res.status(201).json(created);
  }
};