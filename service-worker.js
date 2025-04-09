const CACHE_NAME = 'prayer-times-v1';
const OFFLINE_URL = 'offline.html';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap'
];

// Install event - cache initial resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    // Handle API requests differently
    if (event.request.url.includes('api.aladhan.com')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response before using it
                    const responseToCache = response.clone();

                    // Cache the API response for 24 hours
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    // If offline, try to return cached API response
                    return caches.match(event.request);
                })
        );
    } else {
        // For non-API requests, use cache-first strategy
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request)
                        .then(response => {
                            // Clone the response before using it
                            const responseToCache = response.clone();

                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                            return response;
                        })
                        .catch(() => {
                            // If offline and resource not in cache, return offline page
                            if (event.request.mode === 'navigate') {
                                return caches.match(OFFLINE_URL);
                            }
                        });
                })
        );
    }
});
