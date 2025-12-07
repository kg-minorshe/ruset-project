import { openDB } from 'idb';

const DB_NAME = 'ChatCache';
const DB_VERSION = 1;
const STORE_NAME = 'chats';

export async function openChatDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'login' });
                store.createIndex('byTimestamp', 'timestamp');
            }
        },
    });
}

// Сохранить чат
export async function saveChatToCache(login, messages, chatInfo) {
    const db = await openChatDB();
    const existing = await db.get(STORE_NAME, login);
    const updatedChatInfo = chatInfo !== undefined ? chatInfo : existing?.chatInfo;
    await db.put(STORE_NAME, {
        login,
        messages: messages !== undefined ? messages : existing?.messages || [],
        chatInfo: updatedChatInfo,
        timestamp: Date.now(),
    });
}

// Загрузить чат
export async function getCachedChat(login) {
    const db = await openChatDB();
    return await db.get(STORE_NAME, login);
}

// Очистка старого кэша
export async function cleanupOldCache() {
    const db = await openChatDB();
    const now = Date.now();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('byTimestamp');
    let cursor = await index.openCursor();

    while (cursor) {
        if (now - cursor.value.timestamp > 360 * 24 * 60 * 60 * 1000) {
            await cursor.delete();
        }
        cursor = await cursor.continue();
    }

    await tx.done;
}

// Удалить чат по логину
export async function deleteChatFromCache(login) {
    const db = await openChatDB();
    if (login) {
        await db.delete(STORE_NAME, login);
    }
}

// Функция для получения последнего ID сообщения
export async function getLastMessageId(chatLogin) {
    try {
        const db = await openChatDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const cached = await store.get(chatLogin);

        if (cached && cached.messages && cached.messages.length > 0) {
            const lastMessage = cached.messages[cached.messages.length - 1];
            return lastMessage.id;
        }

        return 0;
    }
    catch (error) {
        console.error('Ошибка получения последнего ID сообщения из IndexedDB:', error);
        return 0;
    }
}