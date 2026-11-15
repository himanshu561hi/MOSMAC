import mongoose from 'mongoose';

export const ATTRIBUTE_TYPES = ['text', 'number', 'boolean', 'select', 'multiselect'];

const attributeDefinitionSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Attribute name is required'],
      trim: true,
      minlength: [2, 'Attribute name must be at least 2 characters'],
      maxlength: [50, 'Attribute name cannot exceed 50 characters']
    },
    code: {
      type: String,
      required: [true, 'Attribute code is required'],
      trim: true,
      lowercase: true,
      minlength: [2, 'Attribute code must be at least 2 characters'],
      maxlength: [50, 'Attribute code cannot exceed 50 characters']
    },
    type: {
      type: String,
      enum: ATTRIBUTE_TYPES,
      required: [true, 'Attribute type is required']
    },
    unit: {
      type: String,
      trim: true,
      default: ''
    },
    options: {
      type: [String],
      default: []
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    isFilterable: {
      type: Boolean,
      default: true,
      index: true
    },
    validation: {
      min: { type: Number },
      max: { type: Number },
      pattern: { type: String }
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

// Unique code per category
attributeDefinitionSchema.index({ categoryId: 1, code: 1 }, { unique: true });

export const AttributeDefinition =
  mongoose.models.AttributeDefinition ||
  mongoose.model('AttributeDefinition', attributeDefinitionSchema);

export default AttributeDefinition;

