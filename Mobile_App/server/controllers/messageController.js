import Message from '../models/Message.js';

import User from '../models/User.js';  
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
    const { groupId, text } = req.body;

    const message = await Message.create({
      sender: req.user._id,
      group: groupId,
      text,
    });

    const populatedMessage = await Message.populate(message, {
      path: 'sender',
      select: 'name pic currentStatus mood'
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send private message
export const sendPrivateMessage = async (req, res) => {
  try {
    const { recipientId, text } = req.body;

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      text,
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