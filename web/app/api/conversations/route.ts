import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

initAdmin();
const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Query conversations where user is a participant
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef
      .where('participantIds', 'array-contains', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get participant details
      const participants = [];
      for (const participantId of data.participantIds) {
        try {
          const userDoc = await db.collection('users').doc(participantId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            participants.push({
              id: participantId,
              name: userData?.displayName || userData?.name || 'Unknown User',
              email: userData?.email || '',
              photoURL: userData?.photoURL,
              isOnline: userData?.isOnline || false,
              lastSeen: userData?.lastSeen?.toDate()
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${participantId}:`, error);
          participants.push({
            id: participantId,
            name: 'Unknown User',
            email: '',
            isOnline: false
          });
        }
      }

      // Get last message
      let lastMessage = null;
      if (data.lastMessageId) {
        try {
          const messageDoc = await db
            .collection('conversations')
            .doc(doc.id)
            .collection('messages')
            .doc(data.lastMessageId)
            .get();
          
          if (messageDoc.exists) {
            const messageData = messageDoc.data();
            lastMessage = {
              id: messageDoc.id,
              content: messageData?.content || '',
              senderId: messageData?.senderId || '',
              senderName: messageData?.senderName || '',
              timestamp: messageData?.timestamp?.toDate() || new Date(),
              type: messageData?.type || 'text'
            };
          }
        } catch (error) {
          console.error('Error fetching last message:', error);
        }
      }

      // Calculate unread count
      const unreadCount = data.unreadCounts?.[userId] || 0;

      conversations.push({
        id: doc.id,
        name: data.name,
        participants,
        type: data.type || 'group',
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        lastMessage,
        unreadCount,
        isTyping: data.typingUsers?.filter((id: string) => id !== userId) || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isArchived: data.archivedBy?.includes(userId) || false,
        isMuted: data.mutedBy?.includes(userId) || false
      });
    }

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { participantIds, type, name, projectId, projectTitle } = await request.json();

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Participant IDs are required' },
        { status: 400 }
      );
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([userId, ...participantIds])];

    // For direct conversations, check if one already exists
    if (type === 'direct' && allParticipants.length === 2) {
      const existingConversationSnapshot = await db.collection('conversations')
        .where('type', '==', 'direct')
        .where('participantIds', '==', allParticipants.sort())
        .limit(1)
        .get();

      if (!existingConversationSnapshot.empty) {
        const existingDoc = existingConversationSnapshot.docs[0];
        return NextResponse.json({
          conversation: {
            id: existingDoc.id,
            ...existingDoc.data(),
            createdAt: existingDoc.data().createdAt?.toDate(),
            updatedAt: existingDoc.data().updatedAt?.toDate()
          }
        });
      }
    }

    const conversationData = {
      name: name || null,
      type: type || 'group',
      participantIds: allParticipants,
      projectId: projectId || null,
      projectTitle: projectTitle || null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageId: null,
      unreadCounts: Object.fromEntries(allParticipants.map(id => [id, 0])),
      typingUsers: [],
      archivedBy: [],
      mutedBy: []
    };

    const docRef = await db.collection('conversations').add(conversationData);

    // Get participant details for response
    const participants = [];
    for (const participantId of allParticipants) {
      try {
        const userDoc = await db.collection('users').doc(participantId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          participants.push({
            id: participantId,
            name: userData?.displayName || userData?.name || 'Unknown User',
            email: userData?.email || '',
            photoURL: userData?.photoURL,
            isOnline: userData?.isOnline || false
          });
        }
      } catch (error) {
        participants.push({
          id: participantId,
          name: 'Unknown User',
          email: '',
          isOnline: false
        });
      }
    }

    const newConversation = {
      id: docRef.id,
      ...conversationData,
      participants,
      unreadCount: 0,
      isTyping: [],
      isArchived: false,
      isMuted: false
    };

    return NextResponse.json({ conversation: newConversation }, { status: 201 });

    } catch (_error) {
      console.error('Error creating conversation:', _error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}