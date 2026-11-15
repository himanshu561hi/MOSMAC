import mongoose from 'mongoose';

const pageRevisionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    changeSummary: { type: String, default: 'Page content modified' },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const contentPageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      maxlength: [200, 'Page title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Page slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Page content is required']
    },
    seoTitle: {
      type: String,
      trim: true,
      default: ''
    },
    seoDescription: {
      type: String,
      trim: true,
      default: ''
    },
    featuredImageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true
    },
    publishedAt: {
      type: Date,
      default: null
    },
    revisions: {
      type: [pageRevisionSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

contentPageSchema.index({ status: 1, slug: 1 });

export const ContentPage =
  mongoose.models.ContentPage || mongoose.model('ContentPage', contentPageSchema);
export default ContentPage;
