import { MODULE_DEFINITIONS } from './moduleRegistry.js';
import { excelGenerator } from './excelGenerator.js';
import { auditService } from '../auditService.js';
import { ApiError } from '../../utils/ApiError.js';

export const universalExportService = {
  /**
   * Generates a sanitized Excel export (.xlsx buffer) for a specific module
   */
  async exportModule({ module, query = {}, user }) {
    const moduleDef = MODULE_DEFINITIONS[module];
    if (!moduleDef) {
      throw ApiError.badRequest(`Unknown module: ${module}`);
    }

    if (!moduleDef.supportsExport) {
      throw ApiError.forbidden(`Export is not supported for module '${module}'`);
    }

    const records = await moduleDef.fetchExportData(query, user);

    const buffer = await excelGenerator.generateExport({
      moduleDef,
      records,
      title: moduleDef.name
    });

    // Record audit event
    if (user) {
      await auditService.log({
        actorId: user._id,
        actorRole: user.role,
        actorEmail: user.email,
        action: 'BULK_DATA_EXPORT',
        resourceType: module,
        resourceId: module,
        changes: { count: records.length },
        notes: `Exported ${records.length} records from ${module}`
      });
    }

    return {
      buffer,
      filename: `${module}_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      count: records.length
    };
  }
};

export default universalExportService;
