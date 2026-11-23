import mongoose from 'mongoose';
import { ROLES, ALL_ROLES } from '../constants/roles.js';
import { comparePassword, hashToken, generateRandomToken } from '../services/passwordService.js';

const refreshSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true
    },
    tokenHash: {
      type: String,
      required: true
    },
    previousTokenHash: {
      type: String,
      default: null
    },
    previousTokenRotatedAt: {
      type: Date,
      default: null
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return password hash in default queries
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true
    },
    role: {
      type: String,
      enum: ALL_ROLES,
      default: ROLES.CUSTOMER,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deactivated'],
      default: 'active',
      index: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    tokenVersion: {
      type: Number,
      default: 1
    },
    refreshSessions: {
      type: [refreshSessionSchema],
      default: []
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      select: false
    },
    lastLoginAt: {
      type: Date
    },
    staffNotes: [
      {
        note: { type: String, required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorName: { type: String, default: 'Staff' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshSessions;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Method: Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not loaded in user document');
  }
  return comparePassword(candidatePassword, this.passwordHash);
};

// Method: Add a new refresh session and prune expired ones
userSchema.methods.addRefreshSession = function ({ sessionId, hashedToken, userAgent, ipAddress }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Prune expired sessions
  const activeSessions = (this.refreshSessions || []).filter((s) => s.expiresAt > new Date());

  // Cap maximum concurrent sessions to 10 per user (oldest first evicted)
  if (activeSessions.length >= 10) {
    activeSessions.shift();
  }

  activeSessions.push({
    sessionId,
    tokenHash: hashedToken,
    userAgent: userAgent || 'Unknown',
    ipAddress: ipAddress || 'Unknown',
    expiresAt
  });

  this.refreshSessions = activeSessions;
};

// Method: Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const rawToken = generateRandomToken(32);
  this.passwordResetToken = hashToken(rawToken);
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
  return rawToken;
};

// Method: Generate email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const rawToken = generateRandomToken(32);
  this.emailVerificationToken = hashToken(rawToken);
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity
  return rawToken;
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;

