import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables or direct values
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ddaebdx3n',
  api_key: process.env.CLOUDINARY_API_KEY || '934264498649928',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'jC_JZ60XVJ5MziXTuCVhCyp06Jw',
  secure: true
});

export default cloudinary;
