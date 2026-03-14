import { Request, Response } from 'express';
import { fetchUsers } from '../services/users.service';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const search = req.query.search as string;
    const role = req.query.role as string;

    const sortBy = req.query.sortBy as string;
    const sortDir = req.query.sortDir as 'asc' | 'desc';

    const result = await fetchUsers({
      page,
      limit,
      search,
      role,
      sortBy,
      sortDir,
    });

    res.json({
      page,
      limit,
      total: result.total,
      data: result.data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};
