import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import sendMail from '../utils/sendmail.js';

import cloudinary from '../cloudinaryConfig.js';

import admin from 'firebase-admin';
// @desc    Register new user
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const allowedRoles = ['buyer', 'vendor', 'driver'];
    const requestedRole = allowedRoles.includes(role) ? role : 'buyer';
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin users cannot be created via this endpoint.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: requestedRole
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    const userWithoutPassword = { ...user._doc };
    delete userWithoutPassword.password;

    res.json({
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email }).select('+password'); // Explicitly select password
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // 2. Compare passwords (ensure password is not undefined)
    if (!password || !user.password) {
      return res.status(400).json({ message: 'Password missing' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    // 4. Return response (exclude password)
    const userWithoutPassword = { ...user._doc };
    delete userWithoutPassword.password;

    res.json({
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const googleSignIn = async (req, res) => {
  const { token } = req.body;

  try {
    console.log('Firebase Google Sign-In attempt with token:', token ? 'Token received' : 'No token');

    // 1. Verify Firebase ID token and get user info
    let firebaseUser;
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      firebaseUser = await admin.auth().getUser(decodedToken.uid);
    } catch (firebaseError) {
      console.error('Firebase Auth Error:', firebaseError.message);
      throw new Error('Invalid Firebase token - please try signing in again');
    }

    const { email, displayName: name, photoURL: picture, uid: googleId } = firebaseUser;
    console.log('Firebase user info received:', { email, name, googleId });

    // 2. Find or create the user in your database
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        pic: picture,
        googleId,
        authType: 'google',
        password: 'google_auth', // just to satisfy required field
        role: 'buyer', // Default role for Google sign-in users
      });
    }

    // 3. Generate JWT for your app
    const appToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // 4. Respond with your token and user info
    console.log('Google Sign-In successful for user:', user.email);
    res.status(200).json({
      token: appToken,
      user,
    });

  } catch (err) {
    console.error('Google Sign-In Error:', err?.response?.data || err.message);
    console.error('Full error:', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    // Fetch users excluding passwords
    const users = await User.find({}).select('-password');

    // Use Promise.all to add lastPreviewMessage and lastPreviewTime for each user
    const usersWithMessages = await Promise.all(
      users.map(async (user) => {
        const lastPrivateMessage = await Message.findOne({
          isPrivate: true,
          $or: [
            { sender: user._id },
            { recipient: user._id }
          ]
        })
          .sort({ createdAt: -1 })
          .select('text createdAt')
          .lean();

        // Format createdAt to "h:mm AM/PM"
        const formatTime = (date) => {
          if (!date) return null;
          return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        };

        return {
          ...user.toObject(),
          lastPreviewMessage: lastPrivateMessage?.text || null,
          lastPreviewTime: formatTime(lastPrivateMessage?.createdAt) || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithMessages.length,
      data: usersWithMessages
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
};



// @desc    Get specific user by ID
// @route   GET /api/users/:id
// @access  Private (you can restrict to Admin or Self later)
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch user without password
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user without password
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
};

// Test Cloudinary connection
export const testCloudinary = async (req, res) => {
  try {
    console.log('Testing Cloudinary connection...');

    // Test with a simple 1x1 pixel image
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const result = await cloudinary.uploader.upload(testImage, {
      resource_type: 'auto',
      folder: 'tradeway-test'
    });

    console.log('Cloudinary test successful:', result.secure_url);
    res.json({
      success: true,
      message: 'Cloudinary connection successful',
      url: result.secure_url
    });
  } catch (error) {
    console.error('Cloudinary test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary connection failed',
      error: error.message
    });
  }
};

export const emailVerify = async (req, res) => {
  const { email } = req.body;
  try {
    const oldUser = await User.findOne({ email });

    if (!oldUser) {
      return res.status(404).json({
        error: true,
        message: "This email is not registered in our app. Please sign up first."
      });
    }

    const code = Math.floor(10000 + Math.random() * 90000).toString(); // Always 5 digits
    oldUser.otp = code;
    oldUser.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    await oldUser.save();

    const mailOptions = {
      from: {
        name: 'Trady Way',
        address: process.env.USER,
      },
      to: email,
      subject: "FORGOT PASSWORD",
      text: `Your verification code is ${code}. This code will expire in 5 minutes.`,
      html: `
        <html>
          <body>
            <p>Your verification code is:</p>
            <h2>${code}</h2>
            <p>This code will expire in <strong>5 minutes</strong>.</p>
          </body>
        </html>
      `,
    };

    await sendMail(mailOptions);

    return res.status(200).json({
      message: "OTP sent successfully. This OTP will expire in 5 minutes.",
      user: oldUser
    });
  } catch (error) {
    console.error("Error in emailVerify:", error);
    return res.status(500).json({ message: "Something went wrong while processing your request." });
  }
};


export const verifyOtp = async (req, res) => {
  const { OTP } = req.body;

  try {
    if (!OTP) {
      return res.status(400).json({ error: true, message: "OTP is required" });
    }

    // Find user by OTP
    const user = await User.findOne({ otp: OTP });

    if (!user) {
      return res.status(404).json({ error: true, message: "Invalid OTP or user not found" });
    }

    if (user.isOtpExpired()) {
      return res.status(400).json({ error: true, message: "OTP has expired" });
    }

    // Optionally, you could mark the OTP as "verified"
    // or set a temporary token to allow password update

    return res.status(200).json({
      message: "OTP verified successfully",
      userId: user._id // or generate a session token
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ error: true, message: "Internal Server Error", details: error.message });
  }
};



export const updatePassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  try {
    if (!userId || !newPassword) {
      return res.status(400).json({ error: true, message: "User ID and new password are required" });
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({ error: true, message: "New password cannot be the same as the old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiresAt = null;

    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("Password update error:", error);
    return res.status(500).json({ error: true, message: "Internal Server Error", details: error.message });
  }
};


export const updateProfile = async (req, res) => {
  const userId = req.user._id;
  const profilePic = req.files?.profilePic;

  // Destructure body fields that can be updated
  const { name, email, phone, bio, location, language, pushToken } = req.body || {};

  try {
    const updateData = {};

    // ✅ Upload new profile picture if provided
    if (profilePic) {
      try {
        console.log('Profile pic received:', {
          name: profilePic.name,
          size: profilePic.size,
          mimetype: profilePic.mimetype,
          hasData: !!profilePic.data,
          isBuffer: Buffer.isBuffer(profilePic.data)
        });

        console.log('Uploading to Cloudinary...');

        // Use upload_stream for in-memory buffer
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto',
              folder: 'tradeway-profiles'
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload stream error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          ).end(profilePic.data);
        });

        console.log('Cloudinary upload successful:', result.secure_url);
        updateData.pic = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({
          message: "Error uploading profile picture",
          error: uploadError.message
        });
      }
    }

    // ✅ Add provided fields dynamically
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;
    if (location) updateData.location = location;
    if (language) updateData.language = language;
    if (pushToken) updateData.pushToken = pushToken;

    // ✅ If no fields are provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update provided" });
    }

    // ✅ Update user's `lastActive` whenever profile is updated
    updateData.lastActive = new Date();

    // ✅ Perform update with validation
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Return clean response
    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        location: updatedUser.location,
        language: updatedUser.language,
        pic: updatedUser.pic,
        pushToken: updatedUser.pushToken,
        role: updatedUser.role,
        isKYCVerified: updatedUser.isKYCVerified,
        rating: updatedUser.rating,
        lastActive: updatedUser.lastActive,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    // ✅ Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    // ✅ Handle duplicate key errors (email/phone uniqueness)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`,
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
