import Product from '../models/Product.js';
import { gradeMarbleImages, prepareInlineImages } from '../services/marbleGradingService.js';

export const gradeMarbleController = async (req, res, next) => {
  const { productId, imageUrls = [], promptContext } = req.body || {};

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'productId is required.'
    });
  }

  let product;

  try {
    product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const uploadedFiles = req.files?.images
      ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
      : [];

    const resolvedUrls = Array.isArray(imageUrls) && imageUrls.length
      ? imageUrls
      : (!uploadedFiles.length ? product.images || [] : []);

    const { inlineImages, evidence } = await prepareInlineImages({
      uploadedFiles,
      remoteUrls: resolvedUrls
    });

    if (!inlineImages.length) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one image via upload or imageUrls.'
      });
    }

    const currentGrading = product.grading?.toObject ? product.grading.toObject() : (product.grading || {});
    if (currentGrading && typeof currentGrading === 'object') {
      delete currentGrading.metadata;
    }

    product.grading = {
      ...currentGrading,
      status: 'pending',
      requestedBy: req.user?._id || null,
      requestedAt: new Date(),
      completedAt: null,
      lastError: undefined
    };
    await product.save();

    const { structured, promptVersion } = await gradeMarbleImages({
      product,
      inlineImages,
      additionalContext: promptContext
    });

    const requestedAt = product.grading?.requestedAt || new Date();

    product.grading = {
      status: 'completed',
      grade: structured.grade,
      confidence: structured.confidence,
      summary: structured.summary,
      issues: structured.issues,
      recommendations: structured.recommendations,
      evaluatedImages: evidence.map((item) => ({
        url: item.url,
        label: item.label,
        uploadedAt: new Date()
      })),
      metadata: {
        model: structured.model,
        promptVersion
      },
      rawResponse: structured.raw,
      requestedBy: req.user?._id || null,
      requestedAt,
      completedAt: new Date(),
      lastError: undefined
    };

    await product.save();

    return res.json({
      success: true,
      data: product.grading
    });
  } catch (error) {
    if (product) {
      const failedGrading = product.grading?.toObject ? product.grading.toObject() : (product.grading || {});
      if (failedGrading && typeof failedGrading === 'object') {
        delete failedGrading.metadata;
      }

      product.grading = {
        ...failedGrading,
        status: 'failed',
        lastError: error.message,
        completedAt: new Date()
      };
      await product.save().catch((saveError) => {
        console.error('Failed to persist grading failure state:', saveError.message);
      });
    }

    return next(error);
  }
};
