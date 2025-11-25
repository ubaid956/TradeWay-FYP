import Job from '../models/Job.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

const JOB_STATUSES = ['open', 'assigned', 'in_transit', 'delivered', 'cancelled'];
const STATUS_TRANSITIONS = {
	open: ['assigned', 'cancelled'],
	assigned: ['in_transit', 'cancelled'],
	in_transit: ['delivered', 'cancelled'],
	delivered: [],
	cancelled: []
};

const appendStatusHistory = (job, status, userId, notes) => {
	if (!Array.isArray(job.statusHistory)) {
		job.statusHistory = [];
	}
	job.statusHistory.push({ status, updatedAt: new Date(), updatedBy: userId, notes });
};

export const createJob = async (req, res) => {
	try {
		if (!['vendor', 'admin'].includes(req.user.role)) {
			return res.status(403).json({ success: false, message: 'Only vendors can create cargo jobs' });
		}

		const vendorId = req.user._id || req.user.id;
		const {
			orderId,
			productId,
			buyerId: buyerInput,
			origin,
			destination,
			pickupContact,
			deliveryContact,
			cargoDetails,
			price,
			notes
		} = req.body || {};

		if (!orderId && !productId) {
			return res.status(400).json({ success: false, message: 'orderId or productId is required' });
		}

		let order = null;
		let product = null;
		let buyerId = buyerInput;

		if (orderId) {
			order = await Order.findById(orderId).populate(['product', 'buyer']);
			if (!order) {
				return res.status(404).json({ success: false, message: 'Order not found' });
			}
			if (order.seller?.toString() !== vendorId.toString()) {
				return res.status(403).json({ success: false, message: 'Not authorized to create job for this order' });
			}
			product = order.product;
			buyerId = order.buyer?._id || order.buyer;
		}

		if (!product) {
			const prodDoc = await Product.findById(productId);
			if (!prodDoc) {
				return res.status(404).json({ success: false, message: 'Product not found' });
			}
			if (prodDoc.seller?.toString() !== vendorId.toString()) {
				return res.status(403).json({ success: false, message: 'Not authorized to ship this product' });
			}
			product = prodDoc;
		}

		if (!buyerId) {
			buyerId = order?.buyer?._id || order?.buyer;
		}

		if (!buyerId) {
			return res.status(400).json({ success: false, message: 'Unable to determine buyer for this job' });
		}

		const job = new Job({
			vendor: vendorId,
			buyer: buyerId,
			product: product._id,
			order: order?._id,
			origin,
			destination,
			pickupContact,
			deliveryContact,
			cargoDetails,
			price,
			notes,
			status: 'open'
		});

		appendStatusHistory(job, 'open', vendorId);
		await job.save();

		if (order && !order.job) {
			order.job = job._id;
			await order.save();
		}

		await job.populate([
			{ path: 'product', select: 'title images location' },
			{ path: 'buyer', select: 'name phone' }
		]);

		return res.status(201).json({ success: true, message: 'Cargo job posted', data: job });
	} catch (error) {
		console.error('Create job error:', error);
		return res.status(500).json({ success: false, message: 'Failed to create job', error: error.message });
	}
};

export const getVendorJobs = async (req, res) => {
	try {
		if (!['vendor', 'admin'].includes(req.user.role)) {
			return res.status(403).json({ success: false, message: 'Access restricted to vendors' });
		}
		const vendorId = req.user._id || req.user.id;
		const { status } = req.query;
		const filter = { vendor: vendorId };
		if (status && JOB_STATUSES.includes(status)) {
			filter.status = status;
		}

		const jobs = await Job.find(filter)
			.populate('product', 'title images')
			.populate('buyer', 'name phone')
			.populate('driver', 'name phone')
			.sort({ createdAt: -1 });

		return res.json({ success: true, data: jobs });
	} catch (error) {
		console.error('Get vendor jobs error:', error);
		return res.status(500).json({ success: false, message: 'Failed to load jobs', error: error.message });
	}
};

export const getDriverJobs = async (req, res) => {
	try {
		if (req.user.role !== 'driver') {
			return res.status(403).json({ success: false, message: 'Access restricted to drivers' });
		}
		const driverId = req.user._id || req.user.id;
		const { includeAssigned = 'true' } = req.query;

		const filter = [{ status: 'open', visibleTo: 'all' }];
		if (includeAssigned !== 'false') {
			filter.push({ driver: driverId });
		}

		const jobs = await Job.find({ $or: filter })
			.populate('product', 'title images')
			.populate('vendor', 'name phone')
			.sort({ createdAt: -1 });

		return res.json({ success: true, data: jobs });
	} catch (error) {
		console.error('Get driver jobs error:', error);
		return res.status(500).json({ success: false, message: 'Failed to load jobs', error: error.message });
	}
};

export const getJobById = async (req, res) => {
	try {
		const { jobId } = req.params;
		const job = await Job.findById(jobId)
			.populate('product', 'title images location')
			.populate('vendor', 'name phone')
			.populate('driver', 'name phone')
			.populate('buyer', 'name phone');

		if (!job) {
			return res.status(404).json({ success: false, message: 'Job not found' });
		}

		const userId = req.user._id || req.user.id;
		const role = req.user.role;
		const isVendor = job.vendor?._id?.toString() === userId.toString();
		const isDriver = job.driver?._id?.toString() === userId.toString();
		const isBuyer = job.buyer?._id?.toString() === userId.toString();
		const isAdmin = role === 'admin';

		if (!(isVendor || isDriver || isBuyer || isAdmin)) {
			return res.status(403).json({ success: false, message: 'Not authorized to view this job' });
		}

		return res.json({ success: true, data: job });
	} catch (error) {
		console.error('Get job detail error:', error);
		return res.status(500).json({ success: false, message: 'Failed to load job', error: error.message });
	}
};

export const assignJob = async (req, res) => {
	try {
		if (req.user.role !== 'driver') {
			return res.status(403).json({ success: false, message: 'Only drivers can claim jobs' });
		}
		const { jobId } = req.params;
		const driverId = req.user._id || req.user.id;
		const { notes } = req.body || {};

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ success: false, message: 'Job not found' });
		}
		if (job.status !== 'open') {
			return res.status(400).json({ success: false, message: 'Job is no longer available' });
		}

		job.driver = driverId;
		job.status = 'assigned';
		appendStatusHistory(job, 'assigned', driverId, notes);
		await job.save();

		return res.json({ success: true, message: 'Job assigned successfully', data: job });
	} catch (error) {
		console.error('Assign job error:', error);
		return res.status(500).json({ success: false, message: 'Failed to assign job', error: error.message });
	}
};

export const updateJobStatus = async (req, res) => {
	try {
		const { jobId } = req.params;
		const { status, notes } = req.body || {};
		const userId = req.user._id || req.user.id;
		const role = req.user.role;

		if (!JOB_STATUSES.includes(status)) {
			return res.status(400).json({ success: false, message: 'Invalid status value' });
		}

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ success: false, message: 'Job not found' });
		}

		const isVendor = job.vendor?.toString() === userId.toString();
		const isDriver = job.driver && job.driver.toString() === userId.toString();
		const isAdmin = role === 'admin';

		if (!(isVendor || isDriver || isAdmin)) {
			return res.status(403).json({ success: false, message: 'Not authorized to update this job' });
		}

		const allowed = STATUS_TRANSITIONS[job.status] || [];
		if (!allowed.includes(status)) {
			return res.status(400).json({
				success: false,
				message: `Cannot change status from ${job.status} to ${status}`
			});
		}

		job.status = status;
		appendStatusHistory(job, status, userId, notes);
		await job.save();

		if (status === 'delivered' && job.order) {
			await Order.findByIdAndUpdate(job.order, {
				status: 'Completed',
				'delivery.actualDelivery': new Date(),
				'delivery.deliveryNotes': notes || 'Delivered via cargo job'
			});
		}

		if (status === 'cancelled' && job.order) {
			await Order.findByIdAndUpdate(job.order, {
				status: 'Canceled',
				'delivery.deliveryNotes': notes || 'Cargo job cancelled'
			});
		}

		return res.json({ success: true, message: 'Job status updated', data: job });
	} catch (error) {
		console.error('Update job status error:', error);
		return res.status(500).json({ success: false, message: 'Failed to update job', error: error.message });
	}
};
