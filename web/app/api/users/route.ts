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
    const currentUserId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const projectId = searchParams.get('projectId');

    let users: any[] = [];

    if (projectId) {
      // Get users from project participants
      const projectDoc = await db.collection('projects').doc(projectId).get();
      if (projectDoc.exists) {
        const projectData = projectDoc.data();
        const participantIds = projectData?.participants || [];
        
        // Get user details for each participant
        for (const participantId of participantIds) {
          if (participantId !== currentUserId) {
            try {
              const userDoc = await db.collection('users').doc(participantId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (!query || 
                    userData?.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                    userData?.name?.toLowerCase().includes(query.toLowerCase()) ||
                    userData?.email?.toLowerCase().includes(query.toLowerCase())) {
                  users.push({
                    id: participantId,
                    name: userData?.displayName || userData?.name || 'Unknown User',
                    email: userData?.email || '',
                    photoURL: userData?.photoURL,
                    isOnline: userData?.isOnline || false,
                    lastSeen: userData?.lastSeen?.toDate()
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching user ${participantId}:`, error);
            }
          }
        }
      }
    } else {
      // Search all users in the users collection
      const usersQuery = db.collection('users').limit(limit);
      
      const snapshot = await usersQuery.get();
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (doc.id !== currentUserId) {
          if (!query || 
              userData?.displayName?.toLowerCase().includes(query.toLowerCase()) ||
              userData?.name?.toLowerCase().includes(query.toLowerCase()) ||
              userData?.email?.toLowerCase().includes(query.toLowerCase())) {
            users.push({
              id: doc.id,
              name: userData?.displayName || userData?.name || 'Unknown User',
              email: userData?.email || '',
              photoURL: userData?.photoURL,
              isOnline: userData?.isOnline || false,
              lastSeen: userData?.lastSeen?.toDate()
            });
          }
        }
      });
    }

    // If no users found in Firestore, try Firebase Auth
    if (users.length === 0 && !projectId) {
      try {
        const auth = getAuth();
        const listUsersResult = await auth.listUsers(limit);
        
        listUsersResult.users.forEach(userRecord => {
          if (userRecord.uid !== currentUserId) {
            if (!query || 
                userRecord.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                userRecord.email?.toLowerCase().includes(query.toLowerCase())) {
              users.push({
                id: userRecord.uid,
                name: userRecord.displayName || userRecord.email?.split('@')[0] || 'Unknown User',
                email: userRecord.email || '',
                photoURL: userRecord.photoURL,
                isOnline: false // We don't have online status from Auth
              });
            }
          }
        });
      } catch (error) {
        console.error('Error fetching users from Auth:', error);
      }
    }

    // Sort by name and limit results
    users.sort((a, b) => a.name.localeCompare(b.name));
    users = users.slice(0, limit);

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}