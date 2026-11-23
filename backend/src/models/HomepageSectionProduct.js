import mongoose from 'mongoose';

const homepageSectionProductSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HomepageSection',
      required: [true, 'Section ID is required'],
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
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

// Prevent duplicate assignment of the same product inside the same homepage section
homepageSectionProductSchema.index({ sectionId: 1, productId: 1 }, { unique: true });
homepageSectionProductSchema.index({ sectionId: 1, displayOrder: 1 });

export const HomepageSectionProduct =
  mongoose.models.HomepageSectionProduct ||
  mongoose.model('HomepageSectionProduct', homepageSectionProductSchema);

export default HomepageSectionProduct;
