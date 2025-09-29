import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

initAdmin();
const db = admin.firestore();
const auth = admin.auth();

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { conversationId, messageId } = await context.params;
    const { action, content, emoji } = await request.json();

    // Verify user is participant in conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.participantIds?.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messageRef = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(messageId);

    const messageDoc = await messageRef.get();
    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const messageData = messageDoc.data();

    switch (action) {
      case 'edit':
        // Only allow editing own messages
        if (messageData?.senderId !== userId) {
          return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 });
        }

        if (!content?.trim()) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        await messageRef.update({
          content: content.trim(),
          edited: true,
          editedAt: new Date()
        });

        return NextResponse.json({ 
          message: {
            id: messageId,
            ...messageData,
            content: content.trim(),
            edited: true,
            editedAt: new Date()
          }
        });

      case 'addReaction': {
        if (!emoji) {
          return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
        }

        const reactions = messageData?.reactions || [];
        const existingReaction = reactions.find((r: any) => r.emoji === emoji);

        if (existingReaction) {
          // Add user to existing reaction if not already present
          if (!existingReaction.users.includes(userId)) {
            existingReaction.users.push(userId);
            existingReaction.count = existingReaction.users.length;
          }
        } else {
          // Create new reaction
          reactions.push({
            emoji,
            users: [userId],
            count: 1
          });
        }

        await messageRef.update({ reactions });

        return NextResponse.json({ 
          message: {
            id: messageId,
            ...messageData,
            reactions
          }
        });
      }

      case 'removeReaction': {
        if (!emoji) {
          return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
        }

        const updatedReactions = (messageData?.reactions || [])
          .map((r: any) => {
            if (r.emoji === emoji) {
              const updatedUsers = r.users.filter((id: string) => id !== userId);
              return updatedUsers.length > 0 ? {
                ...r,
                users: updatedUsers,
                count: updatedUsers.length
              } : null;
            }
            return r;
          })
          .filter(Boolean);

        await messageRef.update({ reactions: updatedReactions });

        return NextResponse.json({ 
          message: {
            id: messageId,
            ...messageData,
            reactions: updatedReactions
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { conversationId, messageId } = await context.params;

    // Verify user is participant in conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.participantIds?.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messageRef = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(messageId);

    const messageDoc = await messageRef.get();
    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const messageData = messageDoc.data();

    // Only allow deleting own messages
    if (messageData?.senderId !== userId) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
    }

    // Soft delete - mark as deleted instead of removing
    await messageRef.update({
      isDeleted: true,
      content: 'This message has been deleted',
      deletedAt: new Date()
    });

    return NextResponse.json({ 
      message: {
        id: messageId,
        ...messageData,
        isDeleted: true,
        content: 'This message has been deleted'
      }
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}