import { exportReportService } from '../services/exportReportService.js';

export async function exportOrdersReport(req, res, next) {
  try {
    const { period, startDate, endDate, orderStatus, paymentStatus } = req.query;
    const csvData = await exportReportService.exportOrdersReport({
      period,
      startDate,
      endDate,
      orderStatus,
      paymentStatus
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-report.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

export async function exportTaxReport(req, res, next) {
  try {
    const { period, startDate, endDate } = req.query;
    const csvData = await exportReportService.exportTaxReport({ period, startDate, endDate });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="gst-tax-report.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

export async function exportCouponsReport(req, res, next) {
  try {
    const csvData = await exportReportService.exportCouponsReport();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="coupons-report.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
}

export default {
  exportOrdersReport,
  exportTaxReport,
  exportCouponsReport
};
