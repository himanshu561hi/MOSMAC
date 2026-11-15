import { AuditLog } from '../models/AuditLog.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'secret',
  'authorization',
  'cardnumber',
  'cvv',
  'accesstoken'
]);

function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }
  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      clean[key] = redactSensitiveData(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const auditService = {
  async log({
    actorId,
    actorRole,
    actorEmail = '',
    action,
    resourceType,
    resourceId = '',
    changes = null,
    notes = '',
    ipAddress = 'Unknown',
    userAgent = 'Unknown',
    requestId = ''
  }) {
    try {
      const sanitizedChanges = changes ? redactSensitiveData(changes) : null;
      return await AuditLog.create({
        actorId,
        actorRole,
        actorEmail,
        action,
        resourceType,
        resourceId: String(resourceId),
        changes: sanitizedChanges,
        notes,
        ipAddress,
        userAgent,
        requestId,
        timestamp: new Date()
      });
    } catch (err) {
      // Non-blocking: fail-safe logging so operational business mutations do not crash if logging fails
      console.error('[AUDIT LOG ERROR]:', err.message);
      return null;
    }
  },

  async getLogs({ page = 1, limit = 25, action, resourceType, actorId, startDate, endDate } = {}) {
    const query = {};
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (actorId) query.actorId = actorId;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'firstName lastName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
};

export default auditService;
