import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

/** POST /api/auth/login { email, password } */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ ok: false, error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(401).json({ ok: false, error: 'invalid_credentials' });

  if (!['admin','analyst'].includes(user.role)) {
    return res.status(403).json({ ok: false, error: 'not_admin' });
  }

  const token = jwt.sign({ _id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token, user: { _id: user._id, email: user.email, role: user.role, fullName: user.fullName } });
});

export default router;
