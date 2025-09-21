/**
 * Service Worker for Inspira Grid PWA
 * 
 * Provides offline functionality, caching strategies, and push notifications
 * for the project collaboration platform.
 */

const CACHE_NAME = 'inspira-grid-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;
const API_CACHE = `${CACHE_NAME}-api`;

// Files to cache immediately (App Shell)
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add your critical CSS and JS files here when they're built
];

// Routes that should work offline
const OFFLINE_FALLBACK_PAGES = [
  '/dashboard',
  '/dashboard/projects',
  '/dashboard/messages',
  '/dashboard/teams',
  '/offline'
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = {
  // Cache first for relatively static data
  CACHE_FIRST: [
    '/api/users/profile',
    '/api/projects/templates',
    '/api/settings'
  ],
  // Network first with cache fallback
  NETWORK_FIRST: [
    '/api/projects',
    '/api/applications',
    '/api/teams',
    '/api/milestones'
  ],
  // Stale while revalidate for real-time but cacheable data
  STALE_WHILE_REVALIDATE: [
    '/api/notifications',
    '/api/messages/conversations',
    '/api/activities'
  ]
};

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  [STATIC_CACHE]: 50,
  [DYNAMIC_CACHE]: 100,
  [IMAGE_CACHE]: 100,
  [API_CACHE]: 200
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache static assets
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(STATIC_ASSETS);
        
        console.log('[SW] Static assets cached successfully');
        
        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Take control of all clients immediately
        await self.clients.claim();
        
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('inspira-grid-') && name !== CACHE_NAME
        );
        
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        console.log('[SW] Service worker activated successfully');
      } catch (error) {
        console.error('[SW] Failed to activate service worker:', error);
      }
    })()
  );
});

// Fetch event - handle requests with appropriate caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with different caching strategies
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Determine caching strategy based on endpoint
    if (API_CACHE_PATTERNS.CACHE_FIRST.some(pattern => pathname.includes(pattern))) {
      return await cacheFirstStrategy(request, API_CACHE);
    } else if (API_CACHE_PATTERNS.STALE_WHILE_REVALIDATE.some(pattern => pathname.includes(pattern))) {
      return await staleWhileRevalidateStrategy(request, API_CACHE);
    } else {
      return await networkFirstStrategy(request, API_CACHE);
    }
  } catch (error) {
    console.error('[SW] API request failed:', error);
    
    // Return cached response if available, otherwise return error response
    const cachedResponse = await getCachedResponse(request, API_CACHE);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        offline: true,
        message: 'You are currently offline. Some features may be limited.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle image requests
async function handleImageRequest(request) {
  try {
    return await cacheFirstStrategy(request, IMAGE_CACHE);
  } catch (error) {
    console.error('[SW] Image request failed:', error);
    
    // Return placeholder image for failed image loads
    const placeholderResponse = await getCachedResponse(
      new Request('/icons/icon-192x192.png'),
      STATIC_CACHE
    );
    
    return placeholderResponse || new Response('', { status: 404 });
  }
}

// Handle navigation requests (page loads)
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Navigation request failed:', error);
    
    // Try to return cached page
    const cachedResponse = await getCachedResponse(request, DYNAMIC_CACHE);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback page
    const url = new URL(request.url);
    if (OFFLINE_FALLBACK_PAGES.some(page => url.pathname.startsWith(page))) {
      const offlinePage = await getCachedResponse(
        new Request('/offline'),
        STATIC_CACHE
      );
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    // Last resort: return basic offline response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Inspira Grid</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: #0f172a;
              color: white;
            }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            .offline-message { font-size: 18px; margin-bottom: 20px; }
            .retry-button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📡</div>
          <h1>You're Offline</h1>
          <p class="offline-message">
            No internet connection detected. Some features may be limited until you're back online.
          </p>
          <button class="retry-button" onclick="window.location.reload()">
            Try Again
          </button>
          <script>
            // Auto-retry when online
            window.addEventListener('online', () => {
              window.location.reload();
            });
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    return await cacheFirstStrategy(request, STATIC_CACHE);
  } catch (error) {
    console.error('[SW] Static request failed:', error);
    return new Response('', { status: 404 });
  }
}

// Caching Strategies

// Cache First: Check cache first, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await getCachedResponse(request, cacheName);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Not in cache, fetch from network and cache
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    await putInCache(request, networkResponse.clone(), cacheName);
  }
  
  return networkResponse;
}

// Network First: Try network first, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await putInCache(request, networkResponse.clone(), cacheName);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await getCachedResponse(request, cacheName);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale While Revalidate: Return cached response immediately, update cache in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await getCachedResponse(request, cacheName);
  
  // Fetch in background to update cache
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      putInCache(request, response.clone(), cacheName);
    }
    return response;
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cached response, wait for network
  return await networkResponsePromise;
}

// Cache Utilities

async function getCachedResponse(request, cacheName) {
  const cache = await caches.open(cacheName);
  return await cache.match(request);
}

async function putInCache(request, response, cacheName) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  
  // Clean up cache if it exceeds max size
  await cleanupCache(cacheName);
}

async function cleanupCache(cacheName) {
  const maxSize = MAX_CACHE_SIZE[cacheName];
  if (!maxSize) return;
  
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Remove oldest entries (FIFO)
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(
      keysToDelete.map(key => cache.delete(key))
    );
  }
}

// Push Notifications
self.addEventListener('push', event => {
  console.log('[SW] Push notification received:', event);
  
  const options = {
    badge: '/icons/icon-72x72.png',
    icon: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      
      options.title = payload.title || 'Inspira Grid';
      options.body = payload.body || 'You have a new notification';
      options.tag = payload.tag || 'general';
      options.data = { ...options.data, ...payload.data };
      
      // Add custom actions based on notification type
      if (payload.type === 'message') {
        options.actions.unshift({
          action: 'reply',
          title: 'Reply',
          icon: '/icons/action-reply.png'
        });
      }
      
    } catch (error) {
      console.error('[SW] Failed to parse push payload:', error);
      options.title = 'Inspira Grid';
      options.body = 'You have a new notification';
    }
  } else {
    options.title = 'Inspira Grid';
    options.body = 'You have a new notification';
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  let targetUrl = '/dashboard';
  
  // Determine target URL based on notification data
  if (data.projectId) {
    targetUrl = `/dashboard/projects/${data.projectId}`;
  } else if (data.conversationId) {
    targetUrl = `/dashboard/messages?conversation=${data.conversationId}`;
  } else if (data.url) {
    targetUrl = data.url;
  }
  
  event.waitUntil(
    (async () => {
      try {
        if (action === 'dismiss') {
          return; // Just close the notification
        }
        
        if (action === 'reply' && data.conversationId) {
          // Handle quick reply (would need to implement reply UI)
          targetUrl = `/dashboard/messages?conversation=${data.conversationId}&reply=true`;
        }
        
        // Focus existing window or open new one
        const clients = await self.clients.matchAll({ 
          type: 'window', 
          includeUncontrolled: true 
        });
        
        // Try to focus existing window with the target URL
        for (const client of clients) {
          if (client.url.includes(targetUrl.split('?')[0])) {
            await client.focus();
            if (client.url !== targetUrl) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        
        // Open new window if no existing window found
        await self.clients.openWindow(targetUrl);
      } catch (error) {
        console.error('[SW] Failed to handle notification click:', error);
      }
    })()
  );
});

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  } else if (event.tag === 'background-sync-time-entries') {
    event.waitUntil(syncOfflineTimeEntries());
  }
});

// Sync offline messages when connection is restored
async function syncOfflineMessages() {
  try {
    // Get offline messages from IndexedDB (would need to implement)
    console.log('[SW] Syncing offline messages...');
    
    // Send offline messages to server
    // Update UI with sync status
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { type: 'messages' }
      });
    });
  } catch (error) {
    console.error('[SW] Failed to sync offline messages:', error);
  }
}

// Sync offline time entries when connection is restored
async function syncOfflineTimeEntries() {
  try {
    console.log('[SW] Syncing offline time entries...');
    
    // Similar to messages, sync time tracking data
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { type: 'time-entries' }
      });
    });
  } catch (error) {
    console.error('[SW] Failed to sync offline time entries:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'content-sync') {
    event.waitUntil(periodicContentSync());
  }
});

async function periodicContentSync() {
  try {
    // Sync critical data in background
    console.log('[SW] Performing periodic content sync...');
    
    // Update cached project data, notifications, etc.
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

// Share Target API handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/dashboard/share' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    const files = formData.getAll('files');
    
    // Store shared content temporarily and redirect to share handler
    const shareData = {
      title,
      text,
      url,
      files: files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }))
    };
    
    // Redirect to share handler with data
    return Response.redirect(
      `/dashboard/projects/create?shared=${encodeURIComponent(JSON.stringify(shareData))}`,
      303
    );
  } catch (error) {
    console.error('[SW] Failed to handle share:', error);
    return Response.redirect('/dashboard', 303);
  }
}

console.log('[SW] Service worker loaded successfully');