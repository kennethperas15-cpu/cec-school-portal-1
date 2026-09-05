import { Request, Response } from 'express';
import { useAuthService } from '@/services/useauth.service';

export const useAuthController = {
  async getAll(req: Request, res: Response) {
    const result = await useAuthService.findAll(req.user);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const created = await useAuthService.create(req.body);
    res.status(201).json(created);
  }
};