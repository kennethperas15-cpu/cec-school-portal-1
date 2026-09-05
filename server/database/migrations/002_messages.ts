import { Request, Response } from 'express';
import { 002_messagesService } from '@/services/002_messages.service';

export const 002_messagesController = {
  async getAll(req: Request, res: Response) {
    const result = await 002_messagesService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await 002_messagesService.create(req.body);
    res.status(201).json(created);
  }
};