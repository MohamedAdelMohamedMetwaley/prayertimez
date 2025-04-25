const CACHE_NAME = 'prayer-times-v4';
const OFFLINE_URL = 'public/offline.html';
const urlsToCache = [
    './',
    './index.html',
    './public/offline.html',
    './public/styles/output.css',
    './public/app.js',
    './manifest.json',
    './public/icons/icon-192x192.png',
    './public/icons/icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap'
];

// Install event - cache initial resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache resources:', error);
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

// Fetch event - network-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {

                if (response.ok && (urlsToCache.includes(new URL(event.request.url).pathname) || event.request.url.includes("api"))) {
                    console.log(
                        `Caching ${event.request.url} with status ${response.status}`
                    )
                    // Clone the response before using it
                    const responseToCache = response.clone();

                    // Cache the successful response
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }

                return response;
            })
            .catch(async () => {
                // If network fails, try to get from cache
                const cachedResponse = await caches.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                // If the resource isn't in the cache, return the offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }

                // If it's not a navigation request and not in cache, return a basic error response
                return new Response('Network error happened', {
                    status: 408,
                    headers: { 'Content-Type': 'text/plain' },
                });
            })
    );
});

let notificationTimers = [];

self.addEventListener('message', (event) => {
    if (event.data.type === 'SCHEDULE_NOTIFICATIONS') {
        // Clear existing timers
        notificationTimers.forEach(timer => clearTimeout(timer));
        notificationTimers = [];

        const now = new Date();
        const currentTime = now.getHours() * 60 * 60 + now.getMinutes() * 60 + now.getSeconds();

        event.data.data.forEach(({ prayer, time, notificationMinutes }) => {
            const [hours, minutes] = time.split(':');
            let prayerTime = parseInt(hours) * 60 * 60 + parseInt(minutes) * 60;
            let notificationTime = prayerTime - (notificationMinutes * 60);

            // If prayer time is tomorrow (for Fajr)
            if (prayerTime < currentTime) {
                prayerTime += 24 * 60 * 60;
                notificationTime += 24 * 60 * 60;
            }

            // Schedule notification
            if (notificationTime > currentTime) {
                const delay = (notificationTime - currentTime) * 1000;
                const timer = setTimeout(() => {
                    self.registration.showNotification('حان وقت الصلاة', {
                        body: `صلاة ${getPrayerNameInArabic(prayer)} بعد ${notificationMinutes} دقيقة`,
                        icon: 'public/icons/icon-192x192.png'
                    });
                }, delay);
                notificationTimers.push(timer);
            }
        });
    }
});

function getPrayerNameInArabic(prayer) {
    const names = {
        Fajr: 'الفجر',
        Dhuhr: 'الظهر',
        Asr: 'العصر',
        Maghrib: 'المغرب',
        Isha: 'العشاء'
    };
    return names[prayer] || prayer;
}
