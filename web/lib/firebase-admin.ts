import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let firebaseAdmin: App | null = null;

export function initAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  
  try {
    // Check if any Firebase Admin apps are already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseAdmin = existingApps[0];
      return firebaseAdmin;
    }
    
    // Use service account credentials for production
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID || 'inspira-grid-c2e1a',
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'f494b6e5609d0a73e8704f74b3a091522c2d8f0a',
      private_key: (process.env.FIREBASE_PRIVATE_KEY || 
        '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCZ6wJ4WsVvYu2h\nBfTiMCujNJKpEupqPGVRG7HQGPAIaa9VRZZ4uhZ79jggAgpbyPkLrqStAeLBa8qP\nxUGiBAgNfOLgq2/0wWwh0ZHpqIo6+yNgqtajFdVpUVrTs7/HTSed31iMR3m4i+yo\neofNitfBCcpdNdjluUj4X6GpaAUx+/tDWMimel43U/0xQEcGeN2jrzYDzc4SNaHJ\nTItA7KSH40ToW6NCZYo8m7eb6Rg8Pos/0/jcCt+DGuGw8ovHkbpFB6Nmj9JXbwNL\nGPfKfDDOWEBnQVu/vidOlT0N5TXhBYUrrE+YeHtnJRn1lYrMqeuaLx+r6vtfgq+g\nz3LrlcO9AgMBAAECggEAAkvBYcK23bpmdt0EIgibv1zmJXv+VP8uzWGB9ZZITv57\n6qQgV7os4i9SIdYYn0sK6KaeVw9SDtZjszZ7IWZ5KUcC37I8TV9s6b86yOG7osrC\nucB/9aGlKTjuXNM6VIfShAtuwnRBfPl8r6cDlhMQtKoyTibNZAsvawxgI2BawtFX\nEvg+nGHNY0MDYFEh9xn2PLxKjKFaH/Tgpl+EmuuX9QEuffOVCr39bFrxx1N9nyjL\ntZ01ixOmFqGpKvnfkIuKp80zzzrpp1Z6fMa4sIVE1CxpF1I5MEmyF7mHu/ABzRMN\nPrGYxrDKZluwxQA3q63cWC64+5aJPg07prSIBz+ReQKBgQDQsqGmC8EHvyaAu6Vu\nF3Mp0mAQAaXz9Qh506ow014p7E2L5mTK2v0kY5hEvZ/bAHjWV6UxlI/gw2hO+TqI\nD0Djz7hOjEx2zMR30wadlK5W6wMrCJr1zIF6hu1AmTnQiyAw27PfXdpAIxEM/7Z5\nICjuVUY7lIXdNbLZziNcBjW9pQKBgQC8zd2sqgXBS7Ue4qC7Jm1K4wseWPKluX2Q\n52I+jhBPuPy0PMGqYfGeQX2eqSSoDx+Ka5jyizuUSmbWBq8I6c2hwRfUW4Dcr+0g\nn+4t+l7V9AeFvRpRIOXwmnOOsmhhwdMtOrwmkXRJaV8FbNnlVfKRwpcDZA11H/nx\nd2gB6rJCOQKBgBRAwZ8zlNADpODpVOySKgLs/5WOE2TRarkn6WRDnufCnuPsv+tP\nxTE62RQSsui16wQiDU36dNwDGqRPW3bIxCtXhTNaOjFtPcPDHuk7/I9Cz1PlyeQA\nrLAPWAbk1899MOqM56/Nk9iVjpoMVtD6Zf57GA3AJB2LkIfCkXvkvmJhAoGBAIGi\n/O1chL0XRZKiW2iFVw/PW0gIHPvLpDsFlQCMvQhwZRtAiF18CNH399AkJWY7lBWQ\nEaGgFlWYzIlyZ2bAWpARLFKETbO6HCCFj54ERm+zsiKTGGnSI/ATrPqy51cQJfbt\nWFlHEEiD0FnCRs7gN8D7koMihNcCELVKnqCKTMGJAoGAJRhQclhoKGOegpxJkhKQ\nhrofKI1UzZagAcIrnpA4VFGd43Jthr2QsVSnSuBgZ6DN9bS78au0GkJJU+pXRyDA\n6zwKKZOQgvtiD+2EZ8uCZrwoZhnGFTuDWVoz9rTv+m8sfGwoLItP9ILCmP8Kx2j9\nFYkqy3AnH6z+2c0MGCW3tJM=\n-----END PRIVATE KEY-----\n'
      ).replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@inspira-grid-c2e1a.iam.gserviceaccount.com',
      client_id: process.env.FIREBASE_CLIENT_ID || '112759499853718950406',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@inspira-grid-c2e1a.iam.gserviceaccount.com')}`,
      universe_domain: 'googleapis.com'
    };
    
    firebaseAdmin = initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.project_id,
      storageBucket: `${serviceAccount.project_id}.appspot.com`,
    });
    
    console.log('Firebase Admin initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export { getAuth, getFirestore, getStorage };