import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function ensureEnvAdminUser({ email, password, name, phone }) {
  const emailRegex = new RegExp(`^${escapeRegex(email)}$`, 'i');
  let user = await User.findOne({ email: emailRegex });
  const hashedPassword = await bcrypt.hash(password, 10);
  const normalizedPhone = phone && phone.trim() ? phone.trim() : undefined;

  if (!user) {
    user = await User.create({
      name: name || 'System Admin',
      email,
      phone: normalizedPhone,
      password: hashedPassword,
      role: 'admin'
    });
  } else {
    let dirty = false;
    if (user.email !== email) {
      user.email = email;
      dirty = true;
    }
    if (user.role !== 'admin') {
      user.role = 'admin';
      dirty = true;
    }
    const passwordMatches = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!passwordMatches) {
      user.password = hashedPassword;
      dirty = true;
    }
    if (name && user.name !== name) {
      user.name = name;
      dirty = true;
    }
    if (normalizedPhone && user.phone !== normalizedPhone) {
      user.phone = normalizedPhone;
      dirty = true;
    }
    if (dirty) {
      await user.save();
    }
  }

  return user;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envEmail || !envPassword) {
      return res.status(500).json({ ok: false, error: 'admin_credentials_missing' });
    }

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'missing_credentials' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEnvEmail = envEmail.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedEnvPassword = envPassword.trim();

    if (normalizedEmail !== normalizedEnvEmail || normalizedPassword !== normalizedEnvPassword) {
      return res.status(401).json({ ok: false, error: 'invalid_credentials' });
    }

    const user = await ensureEnvAdminUser({
      email: normalizedEnvEmail,
      password: normalizedEnvPassword,
      name: process.env.ADMIN_NAME,
      phone: process.env.ADMIN_PHONE
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      ok: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.name || user.email
      }
    });
  } catch (error) {
    console.error('Failed to login admin:', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

export default router;
