import { staffService } from '../services/staffService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function listStaff(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { role, status } = req.query;

    const result = await staffService.listStaff({ page, limit, role, status });
    return sendSuccess(res, HTTP_STATUS.OK, 'Staff accounts retrieved', { staff: result.staff }, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function createStaff(req, res, next) {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    const newStaff = await staffService.createStaff(
      { firstName, lastName, email, phone, password, role },
      req.user
    );
    return sendSuccess(res, HTTP_STATUS.CREATED, 'Staff account created successfully', { staff: newStaff });
  } catch (error) {
    next(error);
  }
}

export async function updateStaffRole(req, res, next) {
  try {
    const { role, status } = req.body;
    const updatedStaff = await staffService.updateStaffRole(
      req.params.id,
      { role, status },
      req.user
    );
    return sendSuccess(res, HTTP_STATUS.OK, 'Staff role updated successfully', { staff: updatedStaff });
  } catch (error) {
    next(error);
  }
}

export async function revokeStaffSessions(req, res, next) {
  try {
    const result = await staffService.revokeStaffSessions(req.params.id, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, result.message);
  } catch (error) {
    next(error);
  }
}

export default {
  listStaff,
  createStaff,
  updateStaffRole,
  revokeStaffSessions
};
