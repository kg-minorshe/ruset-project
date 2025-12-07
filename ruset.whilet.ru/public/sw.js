const CACHE_NAME = 'media-cache-v1';
const MEDIA_CACHE_NAME = 'media-files-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Кэшируем медиафайлы
    if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mp3|wav|ogg|pdf|doc|docx|xls|xlsx)$/i)) {
        event.respondWith(
            caches.open(MEDIA_CACHE_NAME)
                .then((cache) => {
                    return cache.match(event.request)
                        .then((response) => {
                            // Если есть в кэше, возвращаем из кэша
                            if (response) {
                                return response;
                            }

                            // Иначе загружаем и кэшируем
                            return fetch(event.request)
                                .then((networkResponse) => {
                                    if (networkResponse && networkResponse.status === 200) {
                                        // Клонируем ответ для кэширования
                                        const responseToCache = networkResponse.clone();
                                        cache.put(event.request, responseToCache);
                                    }
                                    return networkResponse;
                                })
                                .catch((error) => {
                                    console.error('Fetch failed:', error);
                                    throw error;
                                });
                        });
                })
        );
    }
});

// Очистка старого кэша
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME, MEDIA_CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});