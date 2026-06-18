const CACHE_NAME = 'zgu-model-offline-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/blueprint_f1.svg',
  '/README.md'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension/other schemas
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never intercept or cache Next.js framework/hot development chunks
  if (url.pathname.includes('/_next/')) {
    return;
  }

  // Handle weather API fallback
  if (url.pathname.includes('/api/weather')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the successful request
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(() => {
          // If offline, return the cached weather or general seasonal fallback metadata
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            
            const fallbackResponse = {
              current: {
                cloud_cover: 60,
                weather_code: 3, 
                wind_speed_10m: 6.5,
                wind_direction_10m: 180
              },
              polar: {
                isPolarDay: false,
                isPolarNight: false,
                isWhiteNights: false,
                periodName: "Обычная смена дня и ночи",
                description: "Суточный ритм смены солнца и сумерек в автономном режиме."
              },
              is_offline_fallback: true
            };
            
            return new Response(JSON.stringify(fallbackResponse), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Cache First strategy for images, fonts and static assets
  const isStaticAsset = 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.woff') || 
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch and update cache in background (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* ignore background update error when offline */});
          return cachedResponse;
        }
        
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Return offline placeholder or fail gracefully
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
    return;
  }

  // Network First with Cache Fallback for other files (HTML page, etc.)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If we cache "/", match it for any navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
