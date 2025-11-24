// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  authType: {
    type: String,
    enum: ['google', 'manual'],
    default: 'manual',
  },
  bio: {
    type: String,
    maxlength: 50,
    default: ""
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    maxlength: 100,
    default: "Sharjah, UAE"
  },
  password: String,
  role: { type: String, enum: ['admin', 'vendor', 'driver', 'buyer'], required: true },
  isKYCVerified: { type: Boolean, default: false },
  kycDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'KYC' },
  language: { type: String, default: 'en' },
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  otp: {
    type: String,
    default: null
  },
  pic: {
    type: String,
    required: true,
    default: "null"
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  pushToken: { type: String, default: null },
});

userSchema.methods.isOtpExpired = function () {
  return this.otpExpiresAt ? new Date() > this.otpExpiresAt : true;
};
userSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};
userSchema.statics.isRecentlyActive = function (lastActive) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(lastActive) > fiveMinutesAgo;
};
const User = mongoose.model('User', userSchema);
export default User;
