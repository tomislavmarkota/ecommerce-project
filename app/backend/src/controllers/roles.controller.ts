import { Request, Response } from 'express';
import * as rolesService from '../services/roles.service';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await rolesService.getRoles();

    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
