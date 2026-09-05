import { Request, Response } from 'express';
import { notification.serviceService } from '@/services/notification.service.service';

export const notification.serviceController = {
  async getAll(req: Request, res: Response) {
    const result = await notification.serviceService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await notification.serviceService.create(req.body);
    res.status(201).json(created);
  }
};