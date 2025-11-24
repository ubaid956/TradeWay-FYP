import { Router } from 'express';
import IndustryUpdate from '../models/IndustryUpdate.js';

const router = Router();

router.get('/updates', async (req, res) => {
  const items = await IndustryUpdate.find({ published: true })
    .sort({ publishedAt: -1 })
    .limit(30);
  res.json({ ok: true, items });
});

/** Admin create/edit (optional, can comment out in prod) */
router.post('/updates', async (req, res) => {
  const { _id, ...payload } = req.body || {};
  let doc;
  if (_id) {
    doc = await IndustryUpdate.findByIdAndUpdate(_id, payload, { new: true });
  } else {
    doc = await IndustryUpdate.create(payload);
  }
  res.json({ ok: true, item: doc });
});

export default router;
