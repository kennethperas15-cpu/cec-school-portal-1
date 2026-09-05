import { Request, Response } from 'express';
import { message.serviceService } from '@/services/message.service.service';

export const message.serviceController = {
  async getAll(req: Request, res: Response) {
    const result = await message.serviceService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await message.serviceService.create(req.body);
    res.status(201).json(created);
  }
};