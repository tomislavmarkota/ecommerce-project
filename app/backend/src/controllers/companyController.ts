import { Request, Response } from 'express';
import * as companyService from '../services/company.service';

export const getCompanies = async (_req: Request, res: Response) => {
  try {
    const companies = await companyService.fetchCompanies();
    res.json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching companies' });
  }
};
