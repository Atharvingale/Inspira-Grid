const admin = require('firebase-admin');

class MessageModel {
  constructor() {
    // Initialize Firestore lazily to avoid initialization issues
    this.db = null;
    this.collection = null;
    this.conversationsCollection = null;
  }

  // Get Firestore instance (initialize if needed)
  getDB() {
    if (!this.db) {
      try {
        this.db = admin.firestore();
        this.collection = this.db.collection('messages');
        this.conversationsCollection = this.db.collection('conversations');
      } catch (error) {
        console.error('Error initializing Firestore in MessageModel:', error);
        throw new Error('Failed to initialize database connection');
      }
    }
    return this.db;
  }

  // Create a new message
  async create(messageData) {
    try {
      this.getDB(); // Ensure DB is initialized
      const messageRef = this.collection.doc();
      const message = {
        id: messageRef.id,
        ...messageData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await messageRef.set(message);

      // Update conversation's last message timestamp
      await this.conversationsCollection.doc(messageData.conversationId).update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: messageData.message,
        lastMessageSender: messageData.senderName
      });

      return { ...message, id: messageRef.id };
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }
  }

  // Create a new conversation
  async createConversation(conversationData) {
    try {
      this.getDB(); // Ensure DB is initialized
      const conversationRef = this.conversationsCollection.doc();
      const conversation = {
        id: conversationRef.id,
        ...conversationData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await conversationRef.set(conversation);
      return { ...conversation, id: conversationRef.id };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get all conversations for a user
  async getUserConversations(userId) {
    try {
      this.getDB(); // Ensure DB is initialized
      const conversationsSnapshot = await this.conversationsCollection
        .where('participantIds', 'array-contains', userId)
        .orderBy('lastMessageAt', 'desc')
        .get();

      const conversations = [];
      for (const doc of conversationsSnapshot.docs) {
        const conversationData = { id: doc.id, ...doc.data() };
        
        // Get unread message count for this user
        const unreadCount = await this.getUnreadMessageCount(doc.id, userId);
        conversationData.unreadCount = unreadCount;

        // For direct messages, get the other participant's name
        if (conversationData.type === 'direct' && conversationData.participantIds.length === 2) {
          const otherParticipantId = conversationData.participantIds.find(id => id !== userId);
          if (otherParticipantId) {
            const userDoc = await this.db.collection('users').doc(otherParticipantId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              conversationData.name = userData.displayName || userData.email?.split('@')[0] || 'Unknown User';
              conversationData.participantName = conversationData.name;
            }
          }
        }

        conversations.push(conversationData);
      }

      return conversations;
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  // Get messages for a conversation with pagination
  async getConversationMessages(conversationId, page = 1, limit = 50) {
    try {
      this.getDB(); // Ensure DB is initialized
      const offset = (page - 1) * limit;

      const messagesSnapshot = await this.collection
        .where('conversationId', '==', conversationId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      })).reverse(); // Reverse to show oldest first

      // Get total count for pagination
      const totalSnapshot = await this.collection
        .where('conversationId', '==', conversationId)
        .get();
      
      const totalCount = totalSnapshot.size;

      return { messages, totalCount };
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  // Check if user has access to a conversation
  async checkConversationAccess(conversationId, userId) {
    try {
      this.getDB(); // Ensure DB is initialized
      const conversationDoc = await this.conversationsCollection.doc(conversationId).get();
      if (!conversationDoc.exists) {
        return false;
      }

      const conversationData = conversationDoc.data();
      return conversationData.participantIds.includes(userId);
    } catch (error) {
      console.error('Error checking conversation access:', error);
      return false;
    }
  }

  // Mark messages as read for a user
  async markMessagesAsRead(conversationId, userId) {
    try {
      this.getDB(); // Ensure DB is initialized
      const messagesSnapshot = await this.collection
        .where('conversationId', '==', conversationId)
        .where('senderId', '!=', userId)
        .get();

      const batch = this.db.batch();
      
      messagesSnapshot.docs.forEach(doc => {
        const messageData = doc.data();
        if (!messageData.readBy.includes(userId)) {
          batch.update(doc.ref, {
            readBy: admin.firestore.FieldValue.arrayUnion(userId)
          });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  // Get unread message count for a user in a conversation
  async getUnreadMessageCount(conversationId, userId) {
    try {
      this.getDB(); // Ensure DB is initialized
      const unreadSnapshot = await this.collection
        .where('conversationId', '==', conversationId)
        .where('senderId', '!=', userId)
        .get();

      let unreadCount = 0;
      unreadSnapshot.docs.forEach(doc => {
        const messageData = doc.data();
        if (!messageData.readBy.includes(userId)) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Find existing direct conversation between two users
  async findDirectConversation(participantIds) {
    try {
      this.getDB(); // Ensure DB is initialized
      const conversationsSnapshot = await this.conversationsCollection
        .where('type', '==', 'direct')
        .where('participantIds', '==', participantIds)
        .limit(1)
        .get();

      if (conversationsSnapshot.empty) {
        // Try with reversed participant order
        const reversedIds = [...participantIds].reverse();
        const reversedSnapshot = await this.conversationsCollection
          .where('type', '==', 'direct')
          .where('participantIds', '==', reversedIds)
          .limit(1)
          .get();

        if (reversedSnapshot.empty) {
          return null;
        }
        
        const doc = reversedSnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }

      const doc = conversationsSnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error finding direct conversation:', error);
      return null;
    }
  }

  // Search messages in a conversation
  async searchMessages(conversationId, searchQuery, limit = 20) {
    try {
      this.getDB(); // Ensure DB is initialized
      // Note: Firestore doesn't support full-text search natively
      // For production, consider using Algolia or similar service
      const messagesSnapshot = await this.collection
        .where('conversationId', '==', conversationId)
        .orderBy('createdAt', 'desc')
        .limit(100) // Get recent messages first
        .get();

      const messages = messagesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
        }))
        .filter(message => 
          message.message.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, limit);

      return messages;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw new Error('Failed to search messages');
    }
  }

  // Get conversation by ID
  async getConversationById(conversationId) {
    try {
      this.getDB(); // Ensure DB is initialized
      const conversationDoc = await this.conversationsCollection.doc(conversationId).get();
      if (!conversationDoc.exists) {
        return null;
      }

      return { id: conversationDoc.id, ...conversationDoc.data() };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw new Error('Failed to fetch conversation');
    }
  }

  // Delete a message (for admin or sender)
  async deleteMessage(messageId, userId, isAdmin = false) {
    try {
      this.getDB(); // Ensure DB is initialized
      const messageDoc = await this.collection.doc(messageId).get();
      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      if (!isAdmin && messageData.senderId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }

      await this.collection.doc(messageId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  // Update message (edit)
  async updateMessage(messageId, newMessage, userId) {
    try {
      this.getDB(); // Ensure DB is initialized
      const messageDoc = await this.collection.doc(messageId).get();
      if (!messageDoc.exists) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      if (messageData.senderId !== userId) {
        throw new Error('Unauthorized to edit this message');
      }

      // Check if message is recent (allow editing within 5 minutes)
      const messageTime = messageData.createdAt?.toDate?.() || new Date(messageData.createdAt);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (messageTime < fiveMinutesAgo) {
        throw new Error('Message is too old to edit');
      }

      await this.collection.doc(messageId).update({
        message: newMessage,
        edited: true,
        editedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }
}

module.exports = new MessageModel();