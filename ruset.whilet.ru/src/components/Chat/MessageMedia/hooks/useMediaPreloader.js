import { useCallback } from "react";
import { httpCache } from "../services/httpCacheService";

export function useMediaPreloader() {
    // Предзагрузка одного медиафайла с обработкой всех ошибок
    const preloadMedia = useCallback(async (media) => {
        try {
            // Проверки входных данных
            if (typeof window === 'undefined') {
                return;
            }

            if (!media || !media.url) {
                return;
            }

            // Выполняем предзагрузку
            const result = await httpCache.preload(media.url, 'blob');

            if (result && result.error) {
                console.warn('Media preload completed with errors:', media.url, result.error);
            }

        } catch (error) {
            // Ловим все возможные ошибки и просто логируем их
            console.warn('Media preload error (non-blocking):', media?.url || 'unknown', error.message);
        }
    }, []);

    // Предзагрузка группы медиафайлов
    const preloadMediaGroup = useCallback(async (mediaArray) => {
        try {
            // Проверки входных данных
            if (typeof window === 'undefined') {
                return;
            }

            if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
                return;
            }

            // Выполняем предзагрузку группы
            const results = await httpCache.preloadBatch(mediaArray, 'blob');

            const successful = results.filter(r => r && !r.error).length;
            const failed = results.filter(r => r && r.error).length;
            const skipped = results.filter(r => r === null).length;

        } catch (error) {
            // Ловим все возможные ошибки и просто логируем их
            console.warn('Media group preload error (non-blocking):', error.message);
        }
    }, []);

    return { preloadMedia, preloadMediaGroup };
}