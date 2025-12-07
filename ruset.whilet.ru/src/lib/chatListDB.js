import { openDB } from "idb";

const DB_NAME = "ChatListCache";
const DB_VERSION = 1;
const STORE_NAME = "chatList";

export async function openChatListDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("byTimestamp", "timestamp");
      }
    },
  });
}

// Сохранить список чатов
export async function saveChatsToCache(chats) {
  try {
    const db = await openChatListDB();
    const tx = db.transaction(STORE_NAME, "readwrite");

    // Очищаем старые данные
    await tx.store.clear();

    // Сохраняем новые чаты с меткой времени
    for (const chat of chats || []) {
      await tx.store.put({
        ...chat,
        timestamp: Date.now(),
      });
    }

    await tx.done;
  } catch (error) {
    console.error("Error saving chats to cache:", error);
  }
}

// Загрузить список чатов из кэша
export async function getCachedChats() {
  try {
    const db = await openChatListDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const chats = await tx.store.getAll();

    // Сортируем по времени (новые первыми)
    return chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error("Error loading chats from cache:", error);
    return [];
  }
}

// Очистка старого кэша (старше 30 дней)
export async function cleanupOldCache() {
  try {
    const db = await openChatListDB();
    const now = Date.now();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const index = tx.store.index("byTimestamp");
    let cursor = await index.openCursor();

    while (cursor) {
      if (now - cursor.value.timestamp > 30 * 24 * 60 * 60 * 1000) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
  } catch (error) {
    console.error("Error cleaning up old cache:", error);
  }
}

// Удалить конкретный чат из кэша
export async function deleteChatFromCache(chatId) {
  try {
    const db = await openChatListDB();
    await db.delete(STORE_NAME, chatId);
  } catch (error) {
    console.error("Error deleting chat from cache:", error);
  }
}

// Обновить конкретный чат в кэше
export async function updateChatInCache(chatData) {
  try {
    const db = await openChatListDB();
    await db.put(STORE_NAME, {
      ...chatData,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating chat in cache:", error);
  }
}
