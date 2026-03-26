import { Request, Response } from 'express';
import * as userService from '../services/users.service';
import { deleteUsersByIds } from '../services/users.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const search = req.query.search as string;
    const role = req.query.role as string;

    const sortBy = req.query.sortBy as string;
    const sortDir = req.query.sortDir as 'asc' | 'desc';

    const result = await userService.fetchUsers({
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

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const user = await userService.fetchUserById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const data = req.body;

    const currentUserRole = req.user.role;

    console.log('req.user', req);

    const user = await userService.updateUser(userId, data, currentUserRole!);

    res.json({
      message: 'User updated',
      user,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error',
    });
  }
};

export const deleteUsersBulk = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Only superAdmin can delete users' });
    }

    const { ids } = req.body as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'User ids are required' });
    }

    const normalizedIds = [...new Set(ids)].map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

    if (normalizedIds.length === 0) {
      return res.status(400).json({ message: 'No valid user ids provided' });
    }

    const currentUserId = req.user?.id;

    if (currentUserId && normalizedIds.includes(currentUserId)) {
      return res.status(400).json({
        message: 'You cannot delete your own account',
      });
    }

    const result = await deleteUsersByIds(normalizedIds);

    return res.status(200).json({
      message: 'Users deleted successfully',
      deletedCount: result.deletedCount,
      ids: normalizedIds,
    });
  } catch (err) {
    console.error('Bulk delete users error:', err);
    return res.status(500).json({ message: 'Failed to delete users' });
  }
};
