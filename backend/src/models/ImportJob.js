import mongoose from 'mongoose';

const importErrorSchema = new mongoose.Schema(
  {
    row: { type: Number, required: true },
    column: { type: String, default: '' },
    value: { type: String, default: '' },
    reason: { type: String, required: true },
    suggestion: { type: String, default: '' }
  },
  { _id: false }
);

const importJobSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      enum: [
        'products',
        'categories',
        'brands',
        'attributes',
        'inventory',
        'coupons',
        'cms-pages',
        'faqs',
        'banners'
      ],
      index: true
    },
    filename: {
      type: String,
      required: true
    },
    fileChecksum: {
      type: String,
      default: ''
    },
    templateVersion: {
      type: String,
      default: '1.0.0'
    },
    importMode: {
      type: String,
      enum: ['create_only', 'update_existing', 'create_update'],
      default: 'create_only'
    },
    status: {
      type: String,
      enum: ['pending', 'validated', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    totalRows: {
      type: Number,
      default: 0
    },
    validRows: {
      type: Number,
      default: 0
    },
    invalidRows: {
      type: Number,
      default: 0
    },
    existingRows: {
      type: Number,
      default: 0
    },
    newRows: {
      type: Number,
      default: 0
    },
    createdCount: {
      type: Number,
      default: 0
    },
    updatedCount: {
      type: Number,
      default: 0
    },
    skippedCount: {
      type: Number,
      default: 0
    },
    errors: [importErrorSchema],
    previewRows: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    stagedData: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    importedByEmail: {
      type: String,
      default: ''
    },
    summary: {
      type: String,
      default: ''
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true
  }
);

importJobSchema.index({ module: 1, createdAt: -1 });

export const ImportJob = mongoose.model('ImportJob', importJobSchema);
export default ImportJob;
