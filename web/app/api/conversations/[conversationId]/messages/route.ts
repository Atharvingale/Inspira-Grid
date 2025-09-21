import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

initAdmin();
const db = getFirestore();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { conversationId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    // Verify user is participant in conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.participantIds?.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (before) {
      const beforeTimestamp = new Date(before);
      query = query.where('timestamp', '<', beforeTimestamp);
    }

    const snapshot = await query.get();
    
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId,
        content: data.content,
        senderId: data.senderId,
        senderName: data.senderName,
        senderPhoto: data.senderPhoto,
        timestamp: data.timestamp?.toDate(),
        type: data.type || 'text',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        reactions: data.reactions || [],
        replyTo: data.replyTo,
        edited: data.edited || false,
        editedAt: data.editedAt?.toDate(),
        isDeleted: data.isDeleted || false
      };
    }).reverse(); // Reverse to get chronological order

    // Mark messages as read for this user
    await markMessagesAsRead(conversationId, userId);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { conversationId } = await context.params;
    const { content, type, replyTo, fileUrl, fileName, fileSize } = await request.json();

    if (!content?.trim() && !fileUrl) {
      return NextResponse.json(
        { error: 'Message content or file is required' },
        { status: 400 }
      );
    }

    // Verify user is participant in conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.participantIds?.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get sender info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const messageData = {
      conversationId,
      content: content?.trim() || '',
      senderId: userId,
      senderName: userData?.displayName || userData?.name || 'Unknown User',
      senderPhoto: userData?.photoURL,
      timestamp: new Date(),
      type: type || 'text',
      fileUrl,
      fileName,
      fileSize,
      reactions: [],
      replyTo: replyTo || null,
      edited: false,
      isDeleted: false
    };

    // Add message to subcollection
    const messageRef = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add(messageData);

    // Update conversation with last message info and increment unread counts
    const updateData: any = {
      lastMessageId: messageRef.id,
      updatedAt: new Date()
    };

    // Increment unread count for all participants except sender
    const unreadUpdates: any = {};
    for (const participantId of conversationData.participantIds) {
      if (participantId !== userId) {
        unreadUpdates[`unreadCounts.${participantId}`] = (conversationData.unreadCounts?.[participantId] || 0) + 1;
      }
    }

    await db.collection('conversations').doc(conversationId).update({
      ...updateData,
      ...unreadUpdates
    });

    const newMessage = {
      id: messageRef.id,
      ...messageData
    };

    return NextResponse.json({ message: newMessage }, { status: 201 });

  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    // Reset unread count for this user
    await db.collection('conversations').doc(conversationId).update({
      [`unreadCounts.${userId}`]: 0
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}