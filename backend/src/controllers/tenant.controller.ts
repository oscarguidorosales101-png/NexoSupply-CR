import { Request, Response, NextFunction } from 'express';
import {
  getCompanyProfile,
  updateCompanyProfile,
  updateCompanyConfig,
  listCompanyMembers,
  inviteMemberToCompany,
  listRolesAndPermissions,
} from '../services/tenant.service';
import { sendSuccess } from '../utils/response';

export async function getProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await getCompanyProfile(req.tenant!.id);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await updateCompanyProfile(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateConfigHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await updateCompanyConfig(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function listMembersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const members = await listCompanyMembers(req.tenant!.id);
    sendSuccess(res, members, 200);
  } catch (error) {
    next(error);
  }
}

export async function inviteMemberHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, rolId } = req.body;
    const invitation = await inviteMemberToCompany(req.tenant!.id, req.user!.id, email, rolId);
    sendSuccess(res, invitation, 201);
  } catch (error) {
    next(error);
  }
}

export async function listRolesPermissionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listRolesAndPermissions(req.tenant!.id);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
