import { Request, Response } from 'express';
import { socketService } from '@/services/socket.service';

export const socketController = {
  async getAll(req: Request, res: Response) {
    const result = await socketService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await socketService.create(req.body);
    res.status(201).json(created);
  }
};