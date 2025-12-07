import { openDB } from 'idb';

const DB_NAME = 'UserCache';
const DB_VERSION = 1;
const STORE_NAME = 'currentUser';

export async function openUserDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
}

// Сохранить текущего пользователя в кэш
export async function saveCurrentUserToCache(userData) {
    try {
        const db = await openUserDB();
        await db.put(STORE_NAME, {
            ...userData,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error('Error saving current user to cache:', error);
    }
}

// Загрузить текущего пользователя из кэша
export async function getCachedCurrentUser() {
    try {
        const db = await openUserDB();
        const cached = await db.get(STORE_NAME, 'current');

        // Проверяем, не устарели ли данные (больше 1 дня)
        if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
            // Удаляем служебные поля перед возвратом
            const { id, timestamp, ...userData } = cached;
            return userData;
        }

        // Если данные устарели, удаляем их
        if (cached) {
            await db.delete(STORE_NAME, 'current');
        }

        return null;
    } catch (error) {
        console.error('Error loading current user from cache:', error);
        return null;
    }
}

// Очистить кэш текущего пользователя (при выходе)
export async function clearCurrentUserCache() {
    try {
        const db = await openUserDB();
        await db.delete(STORE_NAME, 'current');
    } catch (error) {
        console.error('Error clearing current user cache:', error);
    }
}

// Обновить конкретные поля пользователя в кэше
export async function updateCurrentUserInCache(updates) {
    try {
        const db = await openUserDB();
        const current = await db.get(STORE_NAME, 'current');

        if (current) {
            await db.put(STORE_NAME, {
                ...current,
                ...updates,
                timestamp: Date.now(),
            });
        }
    } catch (error) {
        console.error('Error updating current user in cache:', error);
    }
}