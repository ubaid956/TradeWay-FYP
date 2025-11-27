import Message from '../models/Message.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { sendPushToUsers } from '../utils/push.js';
// @desc    Get messages for group
export const getGroupMessages = async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.groupId })
      .populate('sender', 'name pic currentStatus mood')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new message
export const createMessage = async (req, res) => {
  try {
    const { groupId, text, type = 'text', metadata, recipientId } = req.body;

    const message = await Message.create({
      sender: req.user._id,
      group: groupId,
      text,
      type,
      metadata,
    });

    const populatedMessage = await Message.populate(message, {
      path: 'sender',
      select: 'name pic currentStatus mood'
    });

    // Push notifications
    try {
      const sender = await User.findById(req.user._id).select('name');
      const title = 'New message';
      const body = `${sender?.name || 'User'}: ${text}`;
      if (recipientId) {
        const recipient = await User.findById(recipientId).select('pushToken');
        await sendPushToUsers([recipient], { title, body, data: { type: 'chat', groupId, senderId: req.user._id } });
      } else if (groupId) {
        const group = await Group.findById(groupId).populate('members', 'pushToken _id');
        const targets = (group?.members || []).filter(m => String(m._id) !== String(req.user._id));
        await sendPushToUsers(targets, { title, body, data: { type: 'group_chat', groupId, senderId: req.user._id } });
      }
    } catch (e) {
      console.error('Push notification error:', e?.message || e);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send private message
export const sendPrivateMessage = async (req, res) => {
  try {
    const { recipientId, text, type = 'text', metadata } = req.body;

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      text,
      type,
      metadata,
      isPrivate: true // This will make group field optional
    });

    const populatedMsg = await Message.populate(message, {
      path: 'sender recipient',
      select: 'name pic'
    });

    res.status(201).json(populatedMsg);
  } catch (error) {
    console.error('Error sending private message:', error);
    res.status(500).json({ 
      message: error.message,
      details: error.errors 
    });
  }
};

// Get private chat history
export const getPrivateChat = async (req, res) => {
  try {
    const messages = await Message.find({
      isPrivate: true,
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name pic');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};