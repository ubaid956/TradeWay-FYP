import { Router } from 'express';
import IndustryUpdate from '../models/IndustryUpdate.js';

const router = Router();

router.get('/updates', async (req, res) => {
  try {
    const items = await IndustryUpdate.find({ published: true })
      .sort({ publishedAt: -1 })
      .limit(30)
      .lean();
    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Failed to load industry updates:', error);
    return res.status(500).json({ message: 'Failed to load industry updates' });
  }
});

router.post('/updates', async (req, res) => {
  try {
    const { _id, ...payload } = req.body || {};
    if (payload.publishedAt && !Number.isNaN(Date.parse(payload.publishedAt))) {
      payload.publishedAt = new Date(payload.publishedAt);
    } else {
      delete payload.publishedAt;
    }

    const doc = _id
      ? await IndustryUpdate.findByIdAndUpdate(_id, payload, { new: true })
      : await IndustryUpdate.create(payload);

    return res.json({ ok: true, item: doc });
  } catch (error) {
    console.error('Failed to upsert industry update:', error);
    return res.status(500).json({ message: 'Failed to save industry update' });
  }
});

export default router;
