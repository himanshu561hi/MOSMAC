import mongoose from 'mongoose';

const focusCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: 'Flat' }, // e.g. 'Flat', 'Minimum'
    discount: { type: String, default: '25% Off' }, // e.g. '25% Off', '50% Off'
    minDiscount: { type: Number, default: 0 },
    maxPrice: { type: Number, default: null },
    discountType: { type: String, default: 'percentage' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const offersDealsConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true
    },
    sectionsVisibility: {
      dealsOfTheDay: { type: Boolean, default: true },
      offersInFocus: { type: Boolean, default: true },
      couponsGrid: { type: Boolean, default: true },
      mosmacSelect: { type: Boolean, default: true },
      allOffersCatalog: { type: Boolean, default: true }
    },
    dealsOfTheDay: {
      title: { type: String, default: 'Deals of the Day' },
      subtitle: { type: String, default: 'Limited-time special price drops on beauty essentials' },
      badge: { type: String, default: 'FLASH SALE' },
      bannerImageUrl: { type: String, default: '' }
    },
    offersInFocus: {
      title: { type: String, default: 'Offers In Focus' },
      subtitle: { type: String, default: 'Tap any discount tier to explore matching curated essentials' },
      cards: {
        type: [focusCardSchema],
        default: [
          {
            id: 'flat-25',
            label: 'Flat',
            discount: '25% Off',
            minDiscount: 25,
            discountType: 'percentage',
            isActive: true,
            order: 1
          },
          {
            id: 'min-50',
            label: 'Minimum',
            discount: '50% Off',
            minDiscount: 50,
            discountType: 'percentage',
            isActive: true,
            order: 2
          },
          {
            id: 'min-30',
            label: 'Minimum',
            discount: '30% Off',
            minDiscount: 30,
            discountType: 'percentage',
            isActive: true,
            order: 3
          }
        ]
      }
    },
    mosmacSelectSpotlight: {
      title: { type: String, default: 'Curated by MOSMAC Select' },
      subtitle: { type: String, default: "Editor's private reserve & certified luxury essentials" }
    }
  },
  {
    timestamps: true
  }
);

export const OffersDealsConfig =
  mongoose.models.OffersDealsConfig || mongoose.model('OffersDealsConfig', offersDealsConfigSchema);

export default OffersDealsConfig;
