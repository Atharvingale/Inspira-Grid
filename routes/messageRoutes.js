import express from 'express';
import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp, limit, startAfter, getDoc } from 'firebase/firestore';
import { isAuthenticated } from '../middleware/auth.js';
import Message from '../models/message.js';
import User from '../models/user.js';

const router = express.Router();

// Get messages page
router.get('/messages', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        
        // Get recent conversations
        const messagesQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const conversations = new Map();
        
        for (const doc of messagesSnapshot.docs) {
            const messageData = doc.data();
            const otherUserId = messageData.sender === userId ? messageData.recipient : messageData.sender;
            
            if (!conversations.has(otherUserId)) {
                // Get other user's details
                const userQuery = query(collection(db, 'users'), where('user_id', '==', otherUserId));
                const userSnapshot = await getDocs(userQuery);
                const userData = userSnapshot.docs[0]?.data() || { name: 'Unknown User' };
                
                conversations.set(otherUserId, {
                    user: {
                        user_id: otherUserId,
                        username: userData.name,
                        profile_pic: userData.profile_pic
                    },
                    lastMessage: {
                        content: messageData.content,
                        createdAt: messageData.createdAt,
                        read: messageData.read
                    },
                    unread: 0
                });
            }
            
            const conversation = conversations.get(otherUserId);
            if (!messageData.read && messageData.recipient === userId) {
                conversation.unread++;
            }
        }

        res.render('messages', {
            user: req.session.user,
            conversations: Array.from(conversations.values()),
            selectedUserId: null,
            selectedUsername: null,
            title: 'Messages',
            currentPage: 'messages'
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).render('error', { 
            error: 'Failed to load messages',
            title: 'Error',
            user: req.session.user,
            currentPage: 'messages'
        });
    }
});

// Get conversation with specific user
router.get('/messages/:userId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const selectedUserId = req.params.userId;
        
        console.log('Getting conversation with user:', selectedUserId);
        
        // Get user details using document ID
        const userDocRef = doc(db, 'users', selectedUserId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            console.log('User not found:', selectedUserId);
            return res.status(404).render('error', {
                error: 'User not found',
                title: 'Error',
                user: req.session.user,
                currentPage: 'messages'
            });
        }

        const userData = userDoc.data();
        console.log('Found user:', userData);

        // Get messages between users
        const messagesQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = [];
        
        for (const messageDoc of messagesSnapshot.docs) {
            const messageData = messageDoc.data();
            if (messageData.participants.includes(selectedUserId)) {
                messages.push({
                    id: messageDoc.id,
                    ...messageData,
                    sender: {
                        user_id: messageData.sender,
                        username: messageData.sender === userId ? req.session.user.name : userData.name
                    },
                    recipient: {
                        user_id: messageData.recipient,
                        username: messageData.recipient === userId ? req.session.user.name : userData.name
                    }
                });
            }
        }

        console.log('Found messages:', messages.length);

        // Mark unread messages as read
        const unreadMessages = messages.filter(m => !m.read && m.recipient.user_id === userId);
        for (const message of unreadMessages) {
            const messageRef = doc(db, 'messages', message.id);
            await updateDoc(messageRef, { read: true });
        }

        // Get recent conversations for the sidebar
        const conversationsQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        
        const conversationsSnapshot = await getDocs(conversationsQuery);
        const conversations = new Map();
        
        for (const convDoc of conversationsSnapshot.docs) {
            const messageData = convDoc.data();
            const otherUserId = messageData.sender === userId ? messageData.recipient : messageData.sender;
            
            if (!conversations.has(otherUserId)) {
                // Get other user's details using document ID
                const otherUserRef = doc(db, 'users', otherUserId);
                const otherUserDoc = await getDoc(otherUserRef);
                const otherUserData = otherUserDoc.exists() ? otherUserDoc.data() : { name: 'Unknown User' };
                
                conversations.set(otherUserId, {
                    user: {
                        user_id: otherUserId,
                        username: otherUserData.name,
                        profile_pic: otherUserData.profile_pic
                    },
                    lastMessage: {
                        content: messageData.content,
                        createdAt: messageData.createdAt,
                        read: messageData.read
                    },
                    unread: 0
                });
            }
            
            const conversation = conversations.get(otherUserId);
            if (!messageData.read && messageData.recipient === userId) {
                conversation.unread++;
            }
        }

        res.render('messages', {
            user: req.session.user,
            messages: messages.reverse(), // Reverse to show oldest first
            conversations: Array.from(conversations.values()),
            selectedUserId: selectedUserId,
            selectedUsername: userData.name,
            selectedUser: userData,
            title: 'Messages',
            currentPage: 'messages'
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).render('error', {
            error: 'Failed to load conversation',
            title: 'Error',
            user: req.session.user,
            currentPage: 'messages'
        });
    }
});

// Search users
router.get('/search-users', isAuthenticated, async (req, res) => {
    try {
        const searchQuery = req.query.q?.toLowerCase();
        if (!searchQuery || searchQuery.length < 2) {
            return res.json([]);
        }

        console.log('Searching for:', searchQuery);

        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            console.log('Processing user:', userData);
            
            // Skip current user
            if (userData.user_id === req.session.user.user_id) {
                console.log('Skipping current user');
                return;
            }

            const name = (userData.name || '').toLowerCase();
            const email = (userData.email || '').toLowerCase();
            
            if (name.includes(searchQuery) || email.includes(searchQuery)) {
                console.log('Match found for:', userData.name);
                users.push({
                    user_id: doc.id, // Use document ID as user_id
                    username: userData.name || 'Unknown User',
                    email: userData.email || '',
                    profile_pic: userData.profile_pic || null
                });
            }
        });

        console.log('Total matches:', users.length);
        console.log('Returning results:', users);
        
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ 
            error: 'Failed to search users',
            details: error.message
        });
    }
});

// Load more messages
router.get('/load-messages', isAuthenticated, async (req, res) => {
    try {
        const { userId, lastMessageId } = req.query;
        const currentUserId = req.session.user.user_id;

        let messagesQuery = query(
            collection(db, 'messages'),
            where('participants', 'array-contains', currentUserId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        if (lastMessageId) {
            const lastMessageDoc = await getDoc(doc(db, 'messages', lastMessageId));
            messagesQuery = query(
                collection(db, 'messages'),
                where('participants', 'array-contains', currentUserId),
                orderBy('createdAt', 'desc'),
                startAfter(lastMessageDoc),
                limit(20)
            );
        }

        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = [];

        for (const doc of messagesSnapshot.docs) {
            const messageData = doc.data();
            if (messageData.participants.includes(userId)) {
                messages.push({
                    id: doc.id,
                    ...messageData
                });
            }
        }

        res.json(messages);
    } catch (error) {
        console.error('Error loading more messages:', error);
        res.status(500).json({ error: 'Failed to load more messages' });
    }
});

// Send message
router.post('/send-message', isAuthenticated, async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.session.user.user_id;

        if (!recipientId || !content) {
            return res.status(400).json({ error: 'Recipient and message content are required' });
        }

        console.log('Sending message:', { senderId, recipientId, content });

        // Check if recipient exists
        const recipientQuery = query(collection(db, 'users'), where('user_id', '==', recipientId));
        const recipientSnapshot = await getDocs(recipientQuery);
        
        if (recipientSnapshot.empty) {
            console.log('Recipient not found:', recipientId);
            return res.status(404).json({ error: 'Recipient not found' });
        }

        const recipientData = recipientSnapshot.docs[0].data();
        console.log('Recipient found:', recipientData);

        const messageData = {
            sender: senderId,
            recipient: recipientId,
            content,
            read: false,
            participants: [senderId, recipientId],
            createdAt: serverTimestamp()
        };

        console.log('Creating message:', messageData);

        const messageRef = await addDoc(collection(db, 'messages'), messageData);
        console.log('Message created with ID:', messageRef.id);

        // Get sender data
        const senderQuery = query(collection(db, 'users'), where('user_id', '==', senderId));
        const senderSnapshot = await getDocs(senderQuery);
        const senderData = senderSnapshot.docs[0]?.data() || { username: 'Unknown User' };

        const responseData = {
            success: true,
            message: {
                id: messageRef.id,
                ...messageData,
                sender: {
                    user_id: senderId,
                    username: senderData.username
                },
                recipient: {
                    user_id: recipientId,
                    username: recipientData.username
                }
            }
        };

        console.log('Sending response:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ 
            error: 'Failed to send message',
            details: error.message
        });
    }
});

// Mark message as read
router.post('/mark-read/:messageId', isAuthenticated, async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.session.user.user_id;

        const messageQuery = query(
            collection(db, 'messages'),
            where('__name__', '==', messageId),
            where('recipient', '==', userId)
        );
        
        const messageSnapshot = await getDocs(messageQuery);
        
        if (messageSnapshot.empty) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const messageDoc = messageSnapshot.docs[0];
        await updateDoc(doc(db, 'messages', messageDoc.id), {
            read: true
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});

export default router; 