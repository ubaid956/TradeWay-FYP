import Job from '../models/Job.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Shipment from '../models/Shipment.js';
import User from '../models/User.js';
import { sendPushToUsers } from '../utils/push.js';

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

		// Notify all drivers that a new cargo job has been posted
		try {
			const drivers = await User.find({ role: 'driver', pushToken: { $exists: true, $ne: null } }).select('pushToken');
			if (drivers?.length) {
				await sendPushToUsers(drivers, {
					title: 'New cargo job available',
					body: `${job.product?.title || 'Cargo'} pickup ready` ,
					data: { type: 'job_created', jobId: String(job._id), productId: String(job.product?._id || '') }
				});
			}
		} catch (notifyErr) {
			console.warn('Push notify (job create) failed:', notifyErr?.message || notifyErr);
		}

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
			.populate('shipment')
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
		const { notes, vehicleNumber } = req.body || {};

		const job = await Job.findById(jobId)
			.populate('product', 'title')
			.populate('vendor', 'name phone')
			.populate('buyer', 'name phone');
			
		if (!job) {
			return res.status(404).json({ success: false, message: 'Job not found' });
		}
		if (job.status !== 'open') {
			return res.status(400).json({ success: false, message: 'Job is no longer available' });
		}

		// Get driver details
		const driver = await User.findById(driverId).select('name phone');
		if (!driver) {
			return res.status(404).json({ success: false, message: 'Driver not found' });
		}

		// Update job
		job.driver = driverId;
		job.status = 'assigned';
		appendStatusHistory(job, 'assigned', driverId, notes);
		await job.save();

		// Create shipment for tracking
		const shipment = new Shipment({
			orderId: job.order || job._id, // Use job ID if no order
			driverId: driverId,
			vehicleNumber: vehicleNumber || 'N/A',
			origin: {
				address: job.origin?.address || 'Pickup Location',
				location: {
					type: 'Point',
					coordinates: [
						job.origin?.longitude || 67.0011,
						job.origin?.latitude || 24.8607
					]
				},
				name: job.origin?.label || 'Origin'
			},
			destination: {
				address: job.destination?.address || 'Delivery Location',
				location: {
					type: 'Point',
					coordinates: [
						job.destination?.longitude || 74.3587,
						job.destination?.latitude || 31.5204
					]
				},
				name: job.destination?.label || 'Destination'
			},
			estimatedDeliveryTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
			status: 'pending',
			statusHistory: [{
				status: 'pending',
				message: 'Job assigned to driver',
				timestamp: new Date()
			}],
			distance: job.cargoDetails?.distance || 0,
			items: [{
				name: job.product?.title || 'Cargo',
				quantity: 1,
				weight: job.cargoDetails?.weight || 0
			}],
			notes: notes || ''
		});

		await shipment.save();

		// Add shipment reference to job
		job.shipment = shipment._id;
		await job.save();

		return res.json({ 
			success: true, 
			message: 'Job assigned successfully. Shipment created for tracking.',
			data: { 
				job, 
				shipment: {
					id: shipment._id,
					status: shipment.status
				}
			}
		});
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

		// Update shipment status if exists
		if (job.shipment) {
			const shipmentStatusMap = {
				'assigned': 'picked_up',
				'in_transit': 'in_transit',
				'delivered': 'delivered',
				'cancelled': 'cancelled'
			};
			
			const shipmentStatus = shipmentStatusMap[status];
			if (shipmentStatus) {
				await Shipment.findByIdAndUpdate(job.shipment, {
					status: shipmentStatus,
					$push: {
						statusHistory: {
							status: shipmentStatus,
							message: notes || `Status updated to ${status}`,
							timestamp: new Date()
						}
					},
					...(status === 'delivered' ? { actualDeliveryTime: new Date() } : {})
				});
			}
		}

		// Update order status
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
