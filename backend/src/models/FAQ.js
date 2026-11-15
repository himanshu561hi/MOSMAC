import mongoose from 'mongoose';

export const FAQ_CATEGORIES = [
  'Orders & Shipping',
  'Payments & Refunds',
  'Account & Security',
  'Returns & Exchanges',
  'General & Product Care'
];

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'FAQ question is required'],
      trim: true,
      maxlength: [300, 'Question cannot exceed 300 characters']
    },
    answer: {
      type: String,
      required: [true, 'FAQ answer is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'FAQ category is required'],
      trim: true,
      default: 'General & Product Care',
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

faqSchema.index({ isActive: 1, category: 1, displayOrder: 1 });

export const FAQ = mongoose.models.FAQ || mongoose.model('FAQ', faqSchema);
export default FAQ;
