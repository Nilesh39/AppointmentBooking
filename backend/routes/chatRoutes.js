import express from 'express';
import {
  sendMessage,
  getChatHistory,
  getChatContacts,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/message', sendMessage);
router.get('/history/:otherUserId', getChatHistory);
router.get('/contacts', getChatContacts);

export default router;
