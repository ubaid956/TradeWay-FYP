import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { Parser as Json2CsvParser } from 'json2csv';

import Product from '../models/Product.js';
import User from '../models/User.js';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_FINISH_VALUES,
  PRODUCT_GRADE_VALUES,
  PRODUCT_UNIT_VALUES
} from '../../shared/taxonomy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PRODUCT_COUNT = Number(process.env.SAMPLE_PRODUCT_COUNT) || 300;
const REQUIRED_SELLERS = 5;
const REQUIRED_BUYERS = 3;

const pakistanCities = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Peshawar',
  'Quetta',
  'Faisalabad',
  'Multan',
  'Sialkot',
  'Hyderabad'
];

const latRange = { min: 24.0, max: 37.0 };
const lngRange = { min: 61.0, max: 76.0 };

const colors = [
  'White', 'Black', 'Grey', 'Beige', 'Cream', 'Brown',
  'Green', 'Gold', 'Ivory'
];

const finishes = PRODUCT_FINISH_VALUES;
const grades = PRODUCT_GRADE_VALUES;

const baseTags = [
  'flooring', 'countertop', 'tiles', 'blocks',
  'export quality', 'interior', 'exterior',
  'slabs', 'bookmatched'
];

const units = PRODUCT_UNIT_VALUES;

const categoryPool = PRODUCT_CATEGORY_VALUES.length ? PRODUCT_CATEGORY_VALUES : ['marble'];

const categoryMetaByValue = PRODUCT_CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category;
  return acc;
}, {});

const categoryCoverageCount = categoryPool.length;

const pickCategoryForIndex = (index) => {
  if (index <= categoryCoverageCount) {
    return categoryPool[(index - 1) % categoryCoverageCount];
  }
  return pickRandom(categoryPool);
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
};
const pickRandom = (arr) => arr[randInt(0, arr.length - 1)];
const pickRandomSubset = (arr, maxCount = 4) => {
  const count = randInt(1, maxCount);
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    if (!copy.length) break;
    const idx = randInt(0, copy.length - 1);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
};
const randomDateInLastYear = () => {
  const now = Date.now();
  const yearMs = 365 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.floor(Math.random() * yearMs));
};

const ensureUsers = async (role, desiredCount) => {
  const existing = await User.find({ role }).limit(desiredCount).select('_id').lean();
  const ids = existing.map((u) => u._id);

  const toCreate = Math.max(0, desiredCount - ids.length);
  if (!toCreate) {
    return ids;
  }

  const timestamp = Date.now();
  const newUsers = Array.from({ length: toCreate }, (_, idx) => ({
    name: `${role.toUpperCase()} Sample ${idx + 1}`,
    email: `${role}.sample.${timestamp}.${idx}@tradeway.local`,
    phone: `${timestamp}${idx}`.padEnd(11, '0'),
    password: `sample-${timestamp}-${idx}`,
    role,
  }));

  const created = await User.insertMany(newUsers);
  return [...ids, ...created.map((u) => u._id)];
};

const buildProducts = (sellerIds, buyerIds) => {
  const products = [];
  for (let i = 1; i <= PRODUCT_COUNT; i += 1) {
    const sellerId = sellerIds[i % sellerIds.length];
    const color = pickRandom(colors);
    const finish = pickRandom(finishes);
    const grade = pickRandom(grades);
    const city = pickRandom(pakistanCities);
    const category = pickCategoryForIndex(i);
    const categoryMeta = categoryMetaByValue[category] || { label: category };
    const readableCategory = categoryMeta.label || category;

    const thickness = randFloat(1.5, 3.0);
    const length = randInt(180, 320);
    const width = randInt(60, 200);
    const height = randInt(2, 20);

    const price = randFloat(5, 120);
    const quantity = randInt(10, 1000);
    const availableQuantity = randInt(5, quantity);
    const minimumOrder = randInt(1, Math.min(availableQuantity, 50));

    const isAvailable = Math.random() < 0.9;
    const isSold = Math.random() < 0.15;
    const isShippingAvailable = Math.random() < 0.8;

    const createdAt = randomDateInLastYear();
    const updatedAt = new Date(createdAt.getTime() + randInt(0, 60 * 86400 * 1000));

    let soldTo = null;
    let soldAt = null;
    let soldPrice = null;
    let isActive = true;

    if (isSold && buyerIds.length) {
      soldTo = buyerIds[randInt(0, buyerIds.length - 1)];
      soldAt = new Date(createdAt.getTime() + randInt(1, 90 * 86400 * 1000));
      soldPrice = price * randFloat(0.9, 1.2);
      isActive = Math.random() < 0.7;
    }

    const tags = Array.from(new Set([
      ...pickRandomSubset(baseTags, 5),
      color.toLowerCase(),
      grade,
      category,
      'sample-dataset'
    ]));

    products.push({
      seller: sellerId,
      title: `${color} ${grade.charAt(0).toUpperCase() + grade.slice(1)} ${readableCategory} - Pakistan #${i}`,
      description: `High-quality ${readableCategory.toLowerCase()} sourced from ${city}, Pakistan with ${finish} finish and ${color.toLowerCase()} tones. ${categoryMeta.description || 'Suitable for modern flooring, countertops, and bespoke architectural work.'}`,
      category,
      tags,
      price,
      quantity,
      unit: pickRandom(units),
      images: [
        `https://cdn.marbledemo.com/pakistan/${i}-1.jpg`,
        `https://cdn.marbledemo.com/pakistan/${i}-2.jpg`,
      ],
      location: city,
      coordinates: {
        latitude: randFloat(latRange.min, latRange.max, 6),
        longitude: randFloat(lngRange.min, lngRange.max, 6),
      },
      specifications: {
        color,
        finish,
        thickness,
        dimensions: { length, width, height },
        origin: 'Pakistan',
        grade,
      },
      availability: {
        isAvailable,
        availableQuantity,
        minimumOrder,
      },
      shipping: {
        isShippingAvailable,
        shippingCost: isShippingAvailable ? randFloat(50, 2000) : 0,
        estimatedDelivery: isShippingAvailable ? randInt(3, 20) : null,
      },
      isActive,
      isSold,
      soldTo,
      soldAt,
      soldPrice,
      createdAt,
      updatedAt,
    });
  }

  return products;
};

const writeJsonSnapshot = (products) => {
  const dataDir = path.resolve(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const outputPath = path.join(dataDir, 'sampleProducts.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`✓ Wrote ${products.length} products to ${outputPath}`);
};

const writeCsvSnapshot = (products) => {
  const csvRows = products.map((product) => ({
    seller: product.seller,
    title: product.title,
    description: product.description,
    category: product.category,
    tags: (product.tags || []).join('|'),
    price: product.price,
    quantity: product.quantity,
    unit: product.unit,
    images: (product.images || []).join('|'),
    location: product.location,
    latitude: product.coordinates?.latitude ?? '',
    longitude: product.coordinates?.longitude ?? '',
    color: product.specifications?.color ?? '',
    finish: product.specifications?.finish ?? '',
    thickness: product.specifications?.thickness ?? '',
    length: product.specifications?.dimensions?.length ?? '',
    width: product.specifications?.dimensions?.width ?? '',
    height: product.specifications?.dimensions?.height ?? '',
    origin: product.specifications?.origin ?? '',
    grade: product.specifications?.grade ?? '',
    isAvailable: product.availability?.isAvailable ?? true,
    availableQuantity: product.availability?.availableQuantity ?? '',
    minimumOrder: product.availability?.minimumOrder ?? '',
    isShippingAvailable: product.shipping?.isShippingAvailable ?? false,
    shippingCost: product.shipping?.shippingCost ?? 0,
    estimatedDelivery: product.shipping?.estimatedDelivery ?? '',
    isActive: product.isActive,
    isSold: product.isSold,
    soldTo: product.soldTo ?? '',
    soldAt: product.soldAt ? new Date(product.soldAt).toISOString() : '',
    soldPrice: product.soldPrice ?? '',
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : '',
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : '',
  }));

  const parser = new Json2CsvParser({
    header: true,
  });

  const csv = parser.parse(csvRows);
  const dataDir = path.resolve(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  const outputPath = path.join(dataDir, 'sampleProducts.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log(`✓ Wrote CSV snapshot to ${outputPath}`);
};

const seedDatabase = async (products) => {
  await Product.deleteMany({ tags: 'sample-dataset' });
  await Product.insertMany(products);
  console.log(`✓ Inserted ${products.length} sample products into MongoDB`);
};

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing in your server/.env file.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  try {
    const [sellerIds, buyerIds] = await Promise.all([
      ensureUsers('vendor', REQUIRED_SELLERS),
      ensureUsers('buyer', REQUIRED_BUYERS),
    ]);

    const products = buildProducts(sellerIds, buyerIds);
    writeJsonSnapshot(products);
    writeCsvSnapshot(products);
    await seedDatabase(products);
    console.log('Sample dataset ready.');
  } catch (error) {
    console.error('Sample data generation failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
