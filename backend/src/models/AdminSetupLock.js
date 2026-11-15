import mongoose from 'mongoose';

const adminSetupLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'initial_super_admin_setup'
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    superAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const AdminSetupLock =
  mongoose.models.AdminSetupLock || mongoose.model('AdminSetupLock', adminSetupLockSchema);

export default AdminSetupLock;
