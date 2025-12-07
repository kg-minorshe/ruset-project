class HttpCacheService {
    constructor() {
        this.preloaded = new Set();
        this.loadingPromises = new Map();
    }

    // Проверка валидности URL
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;

        // Проверяем абсолютные URL
        if (url.startsWith('http')) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }

        // Относительные URL считаем валидными
        return url.length > 0;
    }

    // Проверка доступности ресурса (без блокировки)
    async checkResourceAccess(url) {
        if (typeof window === 'undefined') return false;

        try {
            // Для браузера проверяем через HEAD запрос
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                cache: 'no-cache',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return true; // Предполагаем, что ресурс доступен
        }
    }

    // Создание URL с параметрами оптимизации
    createOptimizedUrl(url, options = {}) {
        if (!this.isValidUrl(url)) {
            console.warn('Invalid URL provided for optimization:', url);
            return url;
        }

        try {
            // Для относительных URL просто добавляем параметры
            if (!url.startsWith('http')) {
                const separator = url.includes('?') ? '&' : '?';
                const params = new URLSearchParams();

                if (options.width) params.set('w', options.width);
                if (options.quality) params.set('q', options.quality);
                if (options.format) params.set('f', options.format);

                const paramsString = params.toString();
                return paramsString ? `${url}${separator}${paramsString}` : url;
            }

            // Для абсолютных URL используем URL API
            const urlObj = new URL(url);

            if (options.width) urlObj.searchParams.set('w', options.width);
            if (options.quality) urlObj.searchParams.set('q', options.quality);
            if (options.format) urlObj.searchParams.set('f', options.format);

            return urlObj.toString();
        } catch (error) {
            console.warn('Failed to create optimized URL:', url, error);
            return url;
        }
    }

    // Предзагрузка медиафайла с полной обработкой ошибок
    async preload(url, type = 'blob') {
        // Проверки
        if (typeof window === 'undefined') {
            return null;
        }

        if (!this.isValidUrl(url)) {
            console.warn('Preload skipped: invalid URL', url);
            return null;
        }

        if (this.preloaded.has(url)) {
            return null;
        }

        const cacheKey = `${type}:${url}`;

        // Проверяем есть ли уже активная загрузка
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        // Создаем новую загрузку
        const loadPromise = this.fetchWithCache(url, type, cacheKey);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const result = await loadPromise;
            this.preloaded.add(url);
            return result;
        } catch (error) {
            console.warn('Preload failed (non-blocking):', url, error.message);
            return null;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    // Загрузка с оптимизацией кэширования
    async fetchWithCache(url, type = 'blob', cacheKey) {
        try {
            // Настройки для fetch
            const fetchOptions = {
                cache: 'force-cache',
                mode: 'cors',
                credentials: 'same-origin',
                headers: {
                    'Accept': this.getAcceptHeader(type)
                }
            };

            // Добавляем таймаут
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            fetchOptions.signal = controller.signal;

            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            let data;
            if (type === 'blob') {
                data = await response.blob();
            } else {
                data = await response.arrayBuffer();
            }

            return {
                data,
                headers: {
                    'cache-control': response.headers.get('cache-control'),
                    'etag': response.headers.get('etag'),
                    'last-modified': response.headers.get('last-modified'),
                    'content-type': response.headers.get('content-type')
                },
                url: response.url,
                status: response.status
            };
        } catch (error) {
            // Более детальная обработка ошибок
            if (error.name === 'AbortError') {
                console.warn('Fetch timeout:', url);
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.warn('Network error (likely CORS):', url, error.message);
            } else {
                console.warn('Fetch error:', url, error.message);
            }

            // Не блокируем выполнение - пробуем создать фейковый ответ
            return {
                data: null,
                headers: {},
                url,
                status: 0,
                error: error.message
            };
        }
    }

    // Получение заголовка Accept в зависимости от типа
    getAcceptHeader(type) {
        switch (type) {
            case 'blob':
                return 'image/*,video/*,audio/*,*/*';
            case 'arrayBuffer':
                return '*/*';
            default:
                return '*/*';
        }
    }

    // Предзагрузка через link prefetch как fallback
    async preloadWithLink(url) {
        if (typeof window === 'undefined' || !this.isValidUrl(url)) return;

        try {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'prefetch';
            preloadLink.href = url;

            const mediaType = this.getMediaType(url);
            if (mediaType !== 'fetch') {
                preloadLink.as = mediaType;
            }

            document.head.appendChild(preloadLink);

            // Удаляем элемент через 30 секунд
            setTimeout(() => {
                if (preloadLink.parentNode) {
                    preloadLink.parentNode.removeChild(preloadLink);
                }
            }, 30000);

        } catch (error) {
            console.debug('Link prefetch failed (non-blocking):', url, error.message);
        }
    }

    // Определяем тип медиа для prefetch
    getMediaType(url) {
        if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
        if (url.match(/\.(mp3|wav|ogg|webm)$/i)) return 'audio';
        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
        return 'fetch';
    }

    // Предзагрузка группы медиафайлов
    async preloadBatch(mediaArray, type = 'blob') {
        if (typeof window === 'undefined' || !Array.isArray(mediaArray) || mediaArray.length === 0) {
            return [];
        }

        // Ограничиваем количество параллельных загрузок
        const limitedMedia = mediaArray.slice(0, 10);
        const promises = limitedMedia.map(media => {
            if (!media || !media.url) {
                return Promise.resolve(null);
            }

            return this.preload(media.url, type).catch(err => {
                console.warn('Batch preload item failed (non-blocking):', media.url, err.message);
                return null;
            });
        });

        return Promise.all(promises);
    }
}

export const httpCache = new HttpCacheService();