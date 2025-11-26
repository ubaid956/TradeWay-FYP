import Product from '../models/Product.js';
import { gradeMarbleImages, prepareInlineImages } from '../services/marbleGradingService.js';
import { PRODUCT_GRADE_VALUES } from '../../shared/taxonomy.js';

const isGradingConfigured = Boolean(process.env.AI_API_KEY);

const normalizeGradeLabel = (grade) => (typeof grade === 'string' ? grade.trim().toLowerCase() : '');

const applySpecificationGrade = (product, nextGrade) => {
  const specDoc = product.specifications?.toObject
    ? product.specifications.toObject()
    : { ...(product.specifications || {}) };

  const prevGrade = specDoc.grade || undefined;

  if (nextGrade) {
    specDoc.grade = nextGrade;
  } else {
    delete specDoc.grade;
  }

  if (prevGrade !== nextGrade) {
    product.specifications = specDoc;
    product.markModified('specifications');
  }
};

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

    const gradingInitiatedAt = new Date();

    const currentGrading = product.grading?.toObject ? product.grading.toObject() : (product.grading || {});
    if (currentGrading && typeof currentGrading === 'object') {
      delete currentGrading.metadata;
    }

    if (!isGradingConfigured) {
      const disabledMessage = 'AI grading is not configured on the server (missing AI_API_KEY). Product was posted without grading.';

      product.grading = {
        ...currentGrading,
        status: 'skipped',
        summary: disabledMessage,
        grade: currentGrading?.grade,
        requestedBy: req.user?._id || null,
        requestedAt: gradingInitiatedAt,
        completedAt: gradingInitiatedAt,
        lastError: disabledMessage
      };

      await product.save();

      return res.status(200).json({
        success: true,
        message: disabledMessage,
        warning: disabledMessage,
        data: product.grading,
        meta: {
          gradingDisabled: true
        }
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

  const requestedAt = product.grading?.requestedAt || gradingInitiatedAt;
    const normalizedGrade = normalizeGradeLabel(structured.grade);
    const specGrade = PRODUCT_GRADE_VALUES.includes(normalizedGrade) ? normalizedGrade : undefined;
    applySpecificationGrade(product, specGrade);

    product.grading = {
      status: 'completed',
      grade: normalizedGrade || structured.grade || undefined,
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
