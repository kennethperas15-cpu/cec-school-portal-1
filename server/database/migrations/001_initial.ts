import { Request, Response } from 'express';
import { 001_initialService } from '@/services/001_initial.service';

export const 001_initialController = {
  async getAll(req: Request, res: Response) {
    const result = await 001_initialService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await 001_initialService.create(req.body);
    res.status(201).json(created);
  }
};