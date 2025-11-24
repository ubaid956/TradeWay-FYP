import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getGroupMessages,
    createMessage,
    sendPrivateMessage,
    getPrivateChat
} from '../controllers/messageController.js';

const router = express.Router();

router.use(protect);

router.get('/:groupId', getGroupMessages);
router.post('/', createMessage);
router.post('/private', sendPrivateMessage);
router.get('/private/:userId', getPrivateChat);
export default router;