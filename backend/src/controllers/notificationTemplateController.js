import { notificationTemplateService } from '../services/notificationTemplateService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function listTemplates(req, res, next) {
  try {
    const templates = await notificationTemplateService.listTemplates();
    return sendSuccess(res, HTTP_STATUS.OK, 'Notification templates retrieved', { templates });
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const template = await notificationTemplateService.getTemplateByType(req.params.type);
    return sendSuccess(res, HTTP_STATUS.OK, 'Notification template retrieved', { template });
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const template = await notificationTemplateService.updateTemplate(req.params.id, req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.OK, 'Notification template updated', { template });
  } catch (error) {
    next(error);
  }
}

export async function previewTemplate(req, res, next) {
  try {
    const { type } = req.params;
    const variables = req.body.variables || req.body.sampleVariables || {};
    const template = await notificationTemplateService.getTemplateByType(type);
    const rendered = notificationTemplateService.renderTemplate(template, variables);
    return sendSuccess(res, HTTP_STATUS.OK, 'Template rendered successfully', {
      preview: rendered,
      ...rendered
    });
  } catch (error) {
    next(error);
  }
}

export default {
  listTemplates,
  getTemplate,
  updateTemplate,
  previewTemplate
};
