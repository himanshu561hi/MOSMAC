import { adminCustomerService } from '../services/adminCustomerService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function listCustomers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { search, status, role, sortBy, sortOrder } = req.query;

    const result = await adminCustomerService.listCustomers({
      page,
      limit,
      search,
      status,
      role: role || (req.path.includes('/customers') ? 'customer' : undefined),
      sortBy,
      sortOrder
    });

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Customers list retrieved successfully',
      { customers: result.customers, users: result.customers },
      result.pagination
    );
  } catch (error) {
    next(error);
  }
}

export async function getCustomerProfile(req, res, next) {
  try {
    const profile = await adminCustomerService.getCustomerProfile(req.params.id);
    return sendSuccess(res, HTTP_STATUS.OK, 'Customer profile retrieved', profile);
  } catch (error) {
    next(error);
  }
}

export async function addCustomerNote(req, res, next) {
  try {
    const { note } = req.body;
    const authorName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
    const updatedNotes = await adminCustomerService.addCustomerNote(req.params.id, {
      note,
      authorId: req.user._id,
      authorName
    });
    return sendSuccess(res, HTTP_STATUS.CREATED, 'Staff note added successfully', { notes: updatedNotes });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    const updatedUser = await adminCustomerService.updateCustomerStatus(
      req.params.id,
      { status, reason },
      req.user
    );
    return sendSuccess(res, HTTP_STATUS.OK, `Customer status updated to ${status}`, { customer: updatedUser });
  } catch (error) {
    next(error);
  }
}

export async function exportCustomers(req, res, next) {
  try {
    const { search, status } = req.query;
    const csvData = await adminCustomerService.exportCustomersCsv({ search, status });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

export default {
  listCustomers,
  getCustomerProfile,
  addCustomerNote,
  updateCustomerStatus,
  exportCustomers
};
