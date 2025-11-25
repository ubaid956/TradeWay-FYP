import Requirement from '../models/Requirement.js';

const isBuyerOrAdmin = (user) => {
	if (!user) return false;
	const role = (user.role || '').toLowerCase();
	return role === 'buyer' || role === 'admin';
};

const parseTags = (tags) => {
	if (!tags) return undefined;
	if (Array.isArray(tags)) {
		return tags.filter(Boolean).map(tag => tag.trim()).filter(Boolean);
	}
	if (typeof tags === 'string') {
		return tags
			.split(',')
			.map(tag => tag.trim())
			.filter(Boolean);
	}
	return undefined;
};

const coerceNumber = (value) => {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isNaN(parsed) ? undefined : parsed;
};

const buildRequirementPayload = (body = {}) => {
	const {
		title,
		productType,
		gradePreference,
		description,
		quantity,
		quantityAmount,
		quantityUnit,
		location,
		locationCity,
		locationAddress,
		budget,
		budgetAmount,
		budgetCurrency,
		needByDate,
		contactPreference,
		status,
		tags,
	} = body;

	const payload = {};

	if (title !== undefined) payload.title = title;
	if (productType !== undefined) payload.productType = productType;
	if (gradePreference !== undefined) payload.gradePreference = gradePreference;
	if (description !== undefined) payload.description = description;
	if (contactPreference !== undefined) payload.contactPreference = contactPreference;
	if (status !== undefined) payload.status = status;

	const tagsValue = parseTags(tags);
	if (tagsValue !== undefined) payload.tags = tagsValue;

	// Quantity payload (supports nested object or flat fields)
	if (quantity && typeof quantity === 'object') {
		const amount = coerceNumber(quantity.amount ?? quantity.value);
		const unit = quantity.unit || quantityUnit;
		payload.quantity = {
			amount: amount !== undefined ? amount : undefined,
			unit: unit || 'tons',
		};
	} else if (quantityAmount !== undefined) {
		const amount = coerceNumber(quantityAmount);
		payload.quantity = {
			amount,
			unit: quantityUnit || 'tons',
		};
	}

	if (payload.quantity && payload.quantity.amount === undefined) {
		delete payload.quantity;
	}

	// Location payload
	if (location && typeof location === 'object') {
		payload.location = {
			city: location.city || locationCity,
			address: location.address || locationAddress,
		};
	} else if (locationCity || locationAddress || typeof location === 'string') {
		payload.location = {
			city: typeof location === 'string' ? location : locationCity,
			address: locationAddress,
		};
	}

	// Budget payload
	if (budget && typeof budget === 'object') {
		const amount = coerceNumber(budget.amount);
		payload.budget = {
			amount,
			currency: budget.currency || budgetCurrency || 'PKR',
		};
	} else if (budgetAmount !== undefined) {
		const amount = coerceNumber(budgetAmount);
		payload.budget = {
			amount,
			currency: budgetCurrency || 'PKR',
		};
	}

	if (payload.budget && payload.budget.amount === undefined) {
		delete payload.budget;
	}

	if (needByDate) {
		const dateValue = new Date(needByDate);
		if (!Number.isNaN(dateValue.getTime())) {
			payload.needByDate = dateValue;
		}
	}

	return payload;
};

export const createRequirement = async (req, res) => {
	try {
		if (!isBuyerOrAdmin(req.user)) {
			return res.status(403).json({
				success: false,
				message: 'Only buyers can create requirement postings',
			});
		}

		const payload = buildRequirementPayload(req.body);
		const buyerId = req.user._id || req.user.id;

		const missingFields = [];
		if (!payload.title || !payload.title.trim()) missingFields.push('title');
		if (!payload.productType || !payload.productType.trim()) missingFields.push('productType');
		if (!payload.quantity) missingFields.push('quantity');
		if (!payload.budget) missingFields.push('budget');
		if (!payload.location || !payload.location.city) missingFields.push('location');

		if (missingFields.length) {
			return res.status(400).json({
				success: false,
				message: `Missing or invalid fields: ${missingFields.join(', ')}`,
			});
		}

		const requirement = await Requirement.create({
			...payload,
			buyer: buyerId,
		});

		await requirement.populate('buyer', 'name email phone role');

		return res.status(201).json({
			success: true,
			message: 'Requirement created successfully',
			data: requirement,
		});
	} catch (error) {
		console.error('Create requirement error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to create requirement',
			error: error.message,
		});
	}
};

export const getRequirements = async (req, res) => {
	try {
		const {
			page = 1,
			limit = 10,
			status,
			productType,
			city,
			search,
			minBudget,
			maxBudget,
			sort = 'recent',
		} = req.query;

		const filter = {};
		if (status) filter.status = status;
		if (productType) filter.productType = { $regex: productType, $options: 'i' };
		if (city) filter['location.city'] = { $regex: city, $options: 'i' };

		const budgetFilter = {};
		const min = coerceNumber(minBudget);
		const max = coerceNumber(maxBudget);
		if (min !== undefined) budgetFilter.$gte = min;
		if (max !== undefined) budgetFilter.$lte = max;
		if (Object.keys(budgetFilter).length) {
			filter['budget.amount'] = budgetFilter;
		}

		if (search) {
			filter.$or = [
				{ title: { $regex: search, $options: 'i' } },
				{ productType: { $regex: search, $options: 'i' } },
				{ description: { $regex: search, $options: 'i' } },
				{ 'location.city': { $regex: search, $options: 'i' } },
			];
		}

		const parsedLimit = Math.min(parseInt(limit, 10) || 10, 50);
		const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
		const skip = (parsedPage - 1) * parsedLimit;

		const sortOption = {
			recent: { createdAt: -1 },
			budget_desc: { 'budget.amount': -1 },
			budget_asc: { 'budget.amount': 1 },
			urgency: { needByDate: 1 },
		}[sort] || { createdAt: -1 };

		const [requirements, total] = await Promise.all([
			Requirement.find(filter)
				.populate('buyer', 'name email phone role')
				.sort(sortOption)
				.skip(skip)
				.limit(parsedLimit),
			Requirement.countDocuments(filter),
		]);

		return res.json({
			success: true,
			data: requirements,
			pagination: {
				currentPage: parsedPage,
				totalPages: Math.ceil(total / parsedLimit),
				totalItems: total,
				pageSize: parsedLimit,
			},
		});
	} catch (error) {
		console.error('Get requirements error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch requirements',
			error: error.message,
		});
	}
};

export const getRequirementById = async (req, res) => {
	try {
		const { requirementId } = req.params;
		const requirement = await Requirement.findById(requirementId).populate('buyer', 'name email phone role');

		if (!requirement) {
			return res.status(404).json({
				success: false,
				message: 'Requirement not found',
			});
		}

		return res.json({
			success: true,
			data: requirement,
		});
	} catch (error) {
		console.error('Get requirement by id error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch requirement',
			error: error.message,
		});
	}
};

export const getUserRequirements = async (req, res) => {
	try {
		const buyerId = req.user._id || req.user.id;
		const { status } = req.query;

		const filter = { buyer: buyerId };
		if (status) filter.status = status;

		const requirements = await Requirement.find(filter)
			.sort({ createdAt: -1 })
			.limit(50);

		return res.json({
			success: true,
			data: requirements,
		});
	} catch (error) {
		console.error('Get user requirements error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch user requirements',
			error: error.message,
		});
	}
};

export const updateRequirement = async (req, res) => {
	try {
		const { requirementId } = req.params;
		const buyerId = req.user._id || req.user.id;
		const role = (req.user.role || '').toLowerCase();

		const requirement = await Requirement.findById(requirementId);

		if (!requirement) {
			return res.status(404).json({
				success: false,
				message: 'Requirement not found',
			});
		}

		if (requirement.buyer.toString() !== buyerId.toString() && role !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Not authorized to update this requirement',
			});
		}

		const updates = buildRequirementPayload(req.body);
		Object.assign(requirement, updates);

		await requirement.save();
		await requirement.populate('buyer', 'name email phone role');

		return res.json({
			success: true,
			message: 'Requirement updated successfully',
			data: requirement,
		});
	} catch (error) {
		console.error('Update requirement error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to update requirement',
			error: error.message,
		});
	}
};

export const deleteRequirement = async (req, res) => {
	try {
		const { requirementId } = req.params;
		const buyerId = req.user._id || req.user.id;
		const role = (req.user.role || '').toLowerCase();

		const requirement = await Requirement.findById(requirementId);

		if (!requirement) {
			return res.status(404).json({
				success: false,
				message: 'Requirement not found',
			});
		}

		if (requirement.buyer.toString() !== buyerId.toString() && role !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Not authorized to delete this requirement',
			});
		}

		await requirement.deleteOne();

		return res.json({
			success: true,
			message: 'Requirement deleted successfully',
		});
	} catch (error) {
		console.error('Delete requirement error:', error);
		return res.status(500).json({
			success: false,
			message: 'Failed to delete requirement',
			error: error.message,
		});
	}
};
