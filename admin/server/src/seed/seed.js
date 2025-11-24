import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import IndustryUpdate from '../models/IndustryUpdate.js';

dotenv.config();

function monthsBack(date, m) {
  return new Date(date.getFullYear(), date.getMonth() - m, 15);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    IndustryUpdate.deleteMany({})
  ]);

  // Admin + Analyst
  const [admin, analyst, sellerA, sellerB, buyerA, buyerB] = await User.create([
    { fullName: 'Admin User',   email: 'admin@tradeway.com',   role: 'admin',   passwordHash: await bcrypt.hash('admin123', 10) },
    { fullName: 'Analyst User', email: 'analyst@tradeway.com', role: 'analyst', passwordHash: await bcrypt.hash('analyst123', 10) },
    { fullName: 'Marble Co A',  email: 'sellerA@tradeway.com', role: 'seller' },
    { fullName: 'Marble Co B',  email: 'sellerB@tradeway.com', role: 'seller' },
    { fullName: 'Buyer One',    email: 'buyerA@tradeway.com',  role: 'buyer' },
    { fullName: 'Buyer Two',    email: 'buyerB@tradeway.com',  role: 'buyer' }
  ]);

  const prods = await Product.create([
    { sellerId: sellerA._id, title:'Carrara Slab', type:'processed', category:'Carrara', grade:'A', pricePerUnit: 95 },
    { sellerId: sellerA._id, title:'Travertine Block', type:'raw', category:'Travertine', grade:'B', pricePerUnit: 55 },
    { sellerId: sellerB._id, title:'Emperador Slab', type:'processed', category:'Emperador', grade:'A', pricePerUnit: 110 }
  ]);

  const now = new Date();
  const orders = [];
  for (let m = 10; m >= 0; m--) {
    const date = monthsBack(now, m);
    // Alternate sellers/products to create variance
    const prod = prods[m % prods.length];
    const seller = [prod.sellerId];
    const buyer = m % 2 === 0 ? buyerA : buyerB;
    const qty = 8 + (m % 5) * 3;
    const unitPrice = prod.pricePerUnit + (m - 5) * 2; // small linear trend

    orders.push({
      productId: prod._id,
      buyerId: buyer._id,
      sellerId: seller[0],
      quantity: qty,
      unitPrice,
      status: m % 7 === 0 ? 'cancelled' : 'delivered',
      originRegion: m % 2 === 0 ? 'Punjab' : 'KPK',
      destinationRegion: m % 3 === 0 ? 'Sindh' : 'Punjab',
      createdAt: date,
      updatedAt: date
    });
  }
  await Order.insertMany(orders);

  await IndustryUpdate.insertMany([
    { title: 'Global Marble Prices Stable', summary: 'Regional demand steady; premium grades hold.', source: 'Trade Journal', link: '#', tags: ['pricing','demand'], publishedAt: new Date(), published: true },
    { title: 'Cutting Tech Innovation', summary: 'New waterjet techniques reduce waste by ~12%.', source: 'StoneTech', link: '#', tags: ['innovation'], publishedAt: new Date(), published: true }
  ]);

  console.log('Seeded OK.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
