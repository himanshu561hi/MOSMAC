import mongoose from 'mongoose';
import env from '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Brand } from '../src/models/Brand.js';

const MONGODB_URI = env.MONGODB_URI;

const SUBCATEGORIES_DATA = {
  'smart-watches': [
    {
      name: 'Bluetooth Calling Watches',
      slug: 'bluetooth-calling-watches',
      description: 'Hands-free calling watches with clear HD mics, built-in speakers & dial pad.',
      imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80',
      displayOrder: 1
    },
    {
      name: 'Sports & Fitness Trackers',
      slug: 'fitness-sports-trackers',
      description: 'Activity bands and smartwatches with SpO2, heart rate, GPS & 100+ sports modes.',
      imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=80',
      displayOrder: 2
    },
    {
      name: 'AMOLED & Luxury Wearables',
      slug: 'amoled-luxury-wearables',
      description: 'Premium stainless steel and arched AMOLED curved display designer timepieces.',
      imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80',
      displayOrder: 3
    },
    {
      name: 'Watch Straps & Accessories',
      slug: 'watch-straps-accessories',
      description: 'Silicone, leather, magnetic Milanese mesh straps and fast magnetic chargers.',
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
      displayOrder: 4
    }
  ],
  'electronics': [
    {
      name: 'Wireless Earbuds & Audio',
      slug: 'wireless-audio-earbuds',
      description: 'Active noise cancellation TWS earbuds, neckbands, and studio over-ear headphones.',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      displayOrder: 1
    },
    {
      name: 'Bluetooth Speakers',
      slug: 'bluetooth-speakers',
      description: 'Deep bass portable party speakers, soundbars, and IPX7 waterproof outdoor audio.',
      imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
      displayOrder: 2
    },
    {
      name: 'Computer & Mobile Accessories',
      slug: 'computer-mobile-accessories',
      description: 'Ergonomic wireless mice, mechanical keyboards, fast charging docks & cables.',
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
      displayOrder: 3
    },
    {
      name: 'Smart Home & Power',
      slug: 'smart-home-power',
      description: 'Smart ambient lighting, GaN high-watt chargers, power banks & travel adapters.',
      imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&auto=format&fit=crop&q=80',
      displayOrder: 4
    }
  ],
  'fashion': [
    {
      name: "Men's Watches & Eyewear",
      slug: 'mens-watches-eyewear',
      description: 'Bold chronograph watches, polarized aviators, and everyday luxury accessories.',
      imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
      displayOrder: 1
    },
    {
      name: "Women's Designer Watches",
      slug: 'womens-designer-watches',
      description: 'Rose gold, crystal embellished, and minimalist elegant timepieces for every occasion.',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
      displayOrder: 2
    },
    {
      name: 'Everyday Carry & Wallets',
      slug: 'everyday-carry-wallets',
      description: 'Genuine leather RFID-blocking wallets, sleek cardholders, and travel organizers.',
      imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
      displayOrder: 3
    },
    {
      name: 'Sunglasses & Frames',
      slug: 'sunglasses-frames',
      description: 'UV400 protective polarized sunglasses, retro wayfarers, and classic clubmasters.',
      imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
      displayOrder: 4
    }
  ]
};

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const rootCategories = await Category.find({ parentId: null });
  console.log(`Found ${rootCategories.length} root categories.`);

  for (const rootCat of rootCategories) {
    const subcats = SUBCATEGORIES_DATA[rootCat.slug];
    if (!subcats) continue;

    console.log(`Processing subcategories for ${rootCat.name} (${rootCat.slug})...`);

    for (const sub of subcats) {
      let existing = await Category.findOne({ slug: sub.slug });
      if (!existing) {
        existing = await Category.create({
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          imageUrl: sub.imageUrl,
          parentId: rootCat._id,
          ancestors: [{ _id: rootCat._id, name: rootCat.name, slug: rootCat.slug }],
          displayOrder: sub.displayOrder,
          isActive: true
        });
        console.log(`  + Created subcategory: ${sub.name} (${sub.slug})`);
      } else {
        existing.parentId = rootCat._id;
        existing.ancestors = [{ _id: rootCat._id, name: rootCat.name, slug: rootCat.slug }];
        existing.imageUrl = sub.imageUrl;
        existing.description = sub.description;
        existing.isActive = true;
        await existing.save();
        console.log(`  ✓ Updated subcategory: ${sub.name}`);
      }
    }
  }

  // Assign existing products to appropriate subcategories
  const bluetoothSub = await Category.findOne({ slug: 'bluetooth-calling-watches' });
  const amoledSub = await Category.findOne({ slug: 'amoled-luxury-wearables' });
  const fastrackBrand = await Brand.findOne({ slug: 'fasttrack' });
  const boatBrand = await Brand.findOne({ slug: 'boat' });
  const titanBrand = await Brand.findOne({ slug: 'titan' });

  // Update existing products
  if (bluetoothSub) {
    await Product.updateMany(
      { slug: 'fastrack-reflex-play-bluetooth-calling-smartwatch' },
      { $set: { categoryId: bluetoothSub._id } }
    );
    console.log('Assigned Reflex Play to Bluetooth Calling Watches');
  }

  if (amoledSub) {
    await Product.updateMany(
      { slug: 'fastrack-limitless-fs1-pro-smart-watch' },
      { $set: { categoryId: amoledSub._id } }
    );
    console.log('Assigned Limitless FS1 to AMOLED & Luxury Wearables');
  }

  // Create additional showcase products if not present
  const sampleProducts = [
    {
      title: 'boAt Airdopes 141 ANC TWS Earbuds',
      slug: 'boat-airdopes-141-anc-tws-earbuds',
      description: 'Up to 32dB Active Noise Cancellation, 42 Hours playback, Beast Mode 50ms low latency and ENx tech quad mics.',
      subcatSlug: 'wireless-audio-earbuds',
      brandSlug: 'boat',
      basePrice: 149900,
      baseMrp: 449000,
      badge: 'BESTSELLER',
      rating: 4.5,
      ratingCount: 340,
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'boAt Stone 350 10W Bluetooth Speaker',
      slug: 'boat-stone-350-10w-bluetooth-speaker',
      description: '10W immersive stereo sound, 12 hours playtime, IPX7 water and splash resistance, TWS dual pairing.',
      subcatSlug: 'bluetooth-speakers',
      brandSlug: 'boat',
      basePrice: 129900,
      baseMrp: 349000,
      badge: 'TRENDING',
      rating: 4.3,
      ratingCount: 198,
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Titan Neo Analog Chronograph Watch for Men',
      slug: 'titan-neo-analog-chronograph-watch-for-men',
      description: 'Sleek black dial with stainless steel silver strap, 50m water resistance, and high precision quartz movement.',
      subcatSlug: 'mens-watches-eyewear',
      brandSlug: 'titan',
      basePrice: 399500,
      baseMrp: 549500,
      badge: 'HOT',
      rating: 4.7,
      ratingCount: 412,
      image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Titan Raga Viva Rose Gold Analog Watch',
      slug: 'titan-raga-viva-rose-gold-analog-watch',
      description: 'Contemporary jewelry-inspired rose gold metal strap, mineral glass crystal, and shimmering dial finish.',
      subcatSlug: 'womens-designer-watches',
      brandSlug: 'titan',
      basePrice: 429500,
      baseMrp: 599500,
      badge: 'BESTSELLER',
      rating: 4.8,
      ratingCount: 285,
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Fastrack Sporty Polarized UV400 Sunglasses',
      slug: 'fastrack-sporty-polarized-uv400-sunglasses',
      description: 'Lightweight TR90 frame, 100% UV protection polarized lenses with anti-glare scratch resistant coating.',
      subcatSlug: 'sunglasses-frames',
      brandSlug: 'fasttrack',
      basePrice: 119900,
      baseMrp: 199900,
      badge: 'NEW',
      rating: 4.2,
      ratingCount: 92,
      image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'boAt Wave Call 2 Smart Watch with 1.83" HD Display',
      slug: 'boat-wave-call-2-smart-watch-hd-display',
      description: 'Advanced BT Calling, 700+ Active Modes, Live Cricket Scores, DIY Watch Face Studio and 5-day battery.',
      subcatSlug: 'bluetooth-calling-watches',
      brandSlug: 'boat',
      basePrice: 129900,
      baseMrp: 499900,
      badge: 'HOT',
      rating: 4.3,
      ratingCount: 512,
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Fastrack Active Pulse Pro Fitness Tracker',
      slug: 'fastrack-active-pulse-pro-fitness-tracker',
      description: 'Sleep analysis, SpO2 & 24/7 pulse tracking, 14-day battery life, 5ATM swim-proof design.',
      subcatSlug: 'fitness-sports-trackers',
      brandSlug: 'fasttrack',
      basePrice: 89900,
      baseMrp: 169900,
      badge: 'TRENDING',
      rating: 4.4,
      ratingCount: 164,
      image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'Titan Magnetic Milanese Loop Watch Strap 22mm',
      slug: 'titan-magnetic-milanese-loop-watch-strap-22mm',
      description: 'Premium aerospace-grade woven stainless steel mesh with infinite magnetic adjustment.',
      subcatSlug: 'watch-straps-accessories',
      brandSlug: 'titan',
      basePrice: 69900,
      baseMrp: 129900,
      badge: 'NEW',
      rating: 4.6,
      ratingCount: 78,
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80'
    }
  ];

  for (const item of sampleProducts) {
    const existing = await Product.findOne({ slug: item.slug });
    if (!existing) {
      const subcat = await Category.findOne({ slug: item.subcatSlug });
      const brand = await Brand.findOne({ slug: item.brandSlug });
      if (!subcat || !brand) {
        console.warn(`Skipping ${item.title}: subcategory or brand missing`);
        continue;
      }

      await Product.create({
        title: item.title,
        slug: item.slug,
        description: item.description,
        categoryId: subcat._id,
        brandId: brand._id,
        images: [
          {
            url: item.image,
            alt: item.title,
            isPrimary: true,
            order: 0
          }
        ],
        status: 'published',
        isFeatured: true,
        badges: [item.badge],
        hasVariants: false,
        variants: [
          {
            sku: `${item.brandSlug.toUpperCase().slice(0, 3)}-${item.subcatSlug.toUpperCase().slice(0, 4)}-01`,
            title: 'Standard',
            price: item.basePrice,
            mrp: item.baseMrp,
            costPrice: Math.round(item.basePrice * 0.6),
            stockQuantity: 40,
            reservedQuantity: 0,
            lowStockThreshold: 5,
            isActive: true
          }
        ],
        basePrice: item.basePrice,
        baseMrp: item.baseMrp,
        ratings: {
          average: item.rating,
          count: item.ratingCount
        },
        seo: {
          metaTitle: `${item.title} | MOSMAC`,
          metaDescription: `Buy ${item.title} online with verified warranty and free delivery across India on MOSMAC.`
        }
      });
      console.log(`  + Created product: ${item.title}`);
    } else {
      console.log(`  ✓ Product exists: ${item.title}`);
    }
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
