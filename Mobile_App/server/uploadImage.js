import cloudinary from './cloudinaryConfig.js';

export const uploadImage = async (file) => {
    try {
        // Use the correct cloudinary API (v2 is already imported as cloudinary)
        const result = await cloudinary.uploader.upload(file.path);
        return result.secure_url; // Returns the URL of the uploaded image
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Error uploading image: ' + error.message);
    }
};
