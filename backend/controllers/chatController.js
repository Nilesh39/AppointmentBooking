import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Send a message
// @route   POST /api/chat/message
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'Please provide receiverId and content' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver user not found' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get message history between current user and another user
// @route   GET /api/chat/history/:otherUserId
// @access  Private
export const getChatHistory = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name')
      .populate('receiverId', 'name');

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get contacts list (users who have exchanged messages with req.user)
// @route   GET /api/chat/contacts
// @access  Private
export const getChatContacts = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    });

    // Extract unique sender/receiver IDs
    const contactIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() !== currentUserId.toString()) {
        contactIds.add(msg.senderId.toString());
      }
      if (msg.receiverId.toString() !== currentUserId.toString()) {
        contactIds.add(msg.receiverId.toString());
      }
    });

    const contacts = await User.find({ _id: { $in: Array.from(contactIds) } }).select('name email role');

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
