import express from "express";
const router = express.Router();
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { Vostok1 } from "../../../../modules/Vostok1/index.js";

class SSEManager {
  constructor(Vostok1) {
    this.Vostok1 = Vostok1;
    this.connections = new Map();
    this.chatRooms = new Map();
    this.chatListConnections = new Map();
    this.lastUpdateCheck = new Map();

    this.db = mysql.createPool({
      port: 3306,
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "RuSet",
      connectionLimit: 15,
      waitForConnections: true,
      queueLimit: 100,
      connectTimeout: 10000,
    });

    this.profileDb = mysql.createPool({
      port: 3306,
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "Profile",
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 50,
      connectTimeout: 10000,
    });

    this.startMessageChecker();
    this.startChatListChecker();
    this.startUpdatesChecker();
    this.startReactionCleanup();
  }

  startMessageChecker() {
    setInterval(() => {
      this.checkForNewMessages();
    }, 1000);
  }

  startChatListChecker() {
    setInterval(() => {
      this.checkForChatListUpdates();
    }, 2000);
  }

  startUpdatesChecker() {
    setInterval(() => {
      this.checkForUpdates();
    }, 500);
  }

  // Автоочистка записей о реакциях старше 30 секунд
  startReactionCleanup() {
    setInterval(async () => {
      try {
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        await this.db.execute(
          `DELETE FROM updates 
                     WHERE type = 'message_reactions' 
                     AND created_at < ?`,
          [thirtySecondsAgo]
        );
      } catch (error) {
        console.error("Ошибка очистки updates:", error);
      }
    }, 10000); // Каждые 10 секунд
  }

  sendSSE(res, event, data) {
    if (res.writableEnded) return false;

    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      console.error("Ошибка отправки SSE:", error);
      return false;
    }
  }

  addConnection(connectionId, res, userId) {
    this.connections.set(connectionId, {
      res,
      userId,
      chats: new Map(),
    });
  }

  addChatListConnection(connectionId, res, userId) {
    this.chatListConnections.set(connectionId, {
      res,
      userId,
      lastUpdate: Date.now(),
    });
  }

  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    for (const chatId of connection.chats.keys()) {
      if (this.chatRooms.has(chatId)) {
        this.chatRooms.get(chatId).delete(connectionId);
        if (this.chatRooms.get(chatId).size === 0) {
          this.chatRooms.delete(chatId);
        }
      }
    }

    this.connections.delete(connectionId);
  }

  removeChatListConnection(connectionId) {
    this.chatListConnections.delete(connectionId);
  }

  async joinChat(connectionId, chatId, lastMessageId, checkSession, uid) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error("Соединение не найдено");
    }

    if (!checkSession) {
      throw new Error("Пользователь не аутентифицирован");
    }

    const userId = uid;

    const hasAccess = await this.hasAccessToChat(userId, chatId);
    if (!hasAccess) {
      throw new Error("Нет доступа к чату");
    }

    const chatIdNum = parseInt(chatId);
    let lastMessageIdNum = parseInt(lastMessageId) || 0;

    if (lastMessageIdNum === 0) {
      const [maxIdResult] = await this.db.execute(
        `SELECT COALESCE(MAX(id), 0) as maxId FROM messages WHERE chat_id = ?`,
        [chatIdNum]
      );
      lastMessageIdNum = maxIdResult[0]?.maxId || 0;
    }

    if (!this.chatRooms.has(chatIdNum)) {
      this.chatRooms.set(chatIdNum, new Set());
    }
    this.chatRooms.get(chatIdNum).add(connectionId);

    connection.chats.set(chatIdNum, lastMessageIdNum);

    if (!this.lastUpdateCheck.has(chatIdNum)) {
      this.lastUpdateCheck.set(chatIdNum, new Map());
    }
    this.lastUpdateCheck.get(chatIdNum).set(connectionId, new Date());

    await this.sendInitialMessages(connectionId, chatId, lastMessageId);

    // ✅ НОВОЕ: Синхронизируем все реакции после подключения
    await this.syncAllReactions(connectionId, chatIdNum);

    this.sendSSE(connection.res, "joined_chat", {
      chat_id: chatId,
      message: "Успешно присоединились к чату",
    });

    return true;
  }

  // ✅ НОВЫЙ МЕТОД: Синхронизация всех реакций при подключении
  async syncAllReactions(connectionId, chatId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Получаем все сообщения чата с реакциями
      const [messages] = await this.db.execute(
        `SELECT DISTINCT mr.message_id 
             FROM message_reactions mr
             JOIN messages m ON mr.message_id = m.id
             WHERE m.chat_id = ?`,
        [chatId]
      );

      // Отправляем обновление реакций для каждого сообщения
      for (const row of messages) {
        await this.sendReactionUpdate(connection, chatId, row.message_id);
      }
    } catch (error) {
      console.error("Ошибка синхронизации реакций:", error);
    }
  }

  async sendInitialMessages(connectionId, chatId, originalLastMessageId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const chatIdNum = parseInt(chatId);
      const lastMessageIdNum = parseInt(originalLastMessageId) || 0;
      const limit = 333;

      let query, params;

      if (lastMessageIdNum === 0) {
        query = `SELECT * FROM messages 
                     WHERE chat_id = ? 
                     ORDER BY id DESC 
                     LIMIT ${limit}`;
        params = [chatIdNum];
      } else {
        query = `SELECT * FROM messages 
                     WHERE chat_id = ? AND id > ? 
                     ORDER BY id ASC 
                     LIMIT ${limit}`;
        params = [chatIdNum, lastMessageIdNum];
      }

      const [messages] = await this.db.execute(query, params);

      const [totalCount] = await this.db.execute(
        `SELECT COUNT(*) as total FROM messages WHERE chat_id = ?`,
        [chatIdNum]
      );
      const totalMessages = totalCount[0]?.total || 0;

      if (messages.length === 0) {
        this.sendSSE(connection.res, "initial_messages", {
          messages: [],
          hasMore: false,
          totalMessages: totalMessages,
          loadedCount: 0,
        });
        return;
      }

      const sortedMessages =
        lastMessageIdNum === 0 ? messages.reverse() : messages;
      const enrichedMessages = await this.enrichMessages(
        sortedMessages,
        connection.userId
      );

      const oldestLoadedId = enrichedMessages[0]?.id || 0;
      const [olderExists] = await this.db.execute(
        `SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND id < ?`,
        [chatIdNum, oldestLoadedId]
      );
      const hasMore = (olderExists[0]?.count || 0) > 0;

      this.sendSSE(connection.res, "initial_messages", {
        messages: enrichedMessages,
        hasMore: hasMore,
        totalMessages: totalMessages,
        loadedCount: enrichedMessages.length,
      });
    } catch (error) {
      console.error("Ошибка отправки начальных сообщений:", error);
      this.sendSSE(connection.res, "error", {
        message: "Ошибка загрузки сообщений",
      });
    }
  }

  async loadOlderMessages(connectionId, chatId, beforeId, limit = 333) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error("Соединение не найдено");
    }

    try {
      const chatIdNum = parseInt(chatId);
      const beforeIdNum = parseInt(beforeId);
      const limitNum = parseInt(limit) || 333;

      const [messages] = await this.db.execute(
        `SELECT * FROM messages 
             WHERE chat_id = ? AND id < ? 
             ORDER BY id DESC 
             LIMIT ${limitNum}`,
        [chatIdNum, beforeIdNum]
      );

      if (messages.length === 0) {
        this.sendSSE(connection.res, "older_messages", {
          messages: [],
          hasMore: false,
        });
        return;
      }

      const sortedMessages = messages.reverse();
      const enrichedMessages = await this.enrichMessages(
        sortedMessages,
        connection.userId
      );

      const hasMore = messages.length === limitNum;

      this.sendSSE(connection.res, "older_messages", {
        messages: enrichedMessages,
        hasMore: hasMore,
      });
    } catch (error) {
      console.error("Ошибка загрузки старых сообщений:", error);
      this.sendSSE(connection.res, "error", {
        message: "Ошибка загрузки старых сообщений",
      });
    }
  }

  async enrichMessages(messages, currentUserId) {
    const enrichedMessages = [];

    for (const message of messages) {
      const [attachments] = await this.db.execute(
        `SELECT * FROM message_attachments WHERE message_id = ?`,
        [message.id]
      );

      const [reactions] = await this.db.execute(
        `SELECT * FROM message_reactions WHERE message_id = ?`,
        [message.id]
      );

      const [views] = await this.db.execute(
        `SELECT user_id, viewed_at FROM message_views WHERE message_id = ?`,
        [message.id]
      );

      const [author] = await this.profileDb.execute(
        `SELECT id, username, login, ico FROM users WHERE id = ? LIMIT 1`,
        [message.user_id]
      );

      const formattedMessage = this.formatMessage(
        message,
        attachments,
        reactions,
        views,
        currentUserId
      );

      if (author.length > 0) {
        formattedMessage.author = {
          id: author[0].id,
          username: author[0].username,
          login: author[0].login,
          avatar: author[0].ico,
        };
      }

      enrichedMessages.push(formattedMessage);
    }

    return enrichedMessages;
  }

  async leaveChat(connectionId, chatId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error("Соединение не найдено");
    }

    const chatIdNum = parseInt(chatId);

    if (this.chatRooms.has(chatIdNum)) {
      this.chatRooms.get(chatIdNum).delete(connectionId);
      if (this.chatRooms.get(chatIdNum).size === 0) {
        this.chatRooms.delete(chatIdNum);
      }
    }

    connection.chats.delete(chatIdNum);

    if (this.lastUpdateCheck.has(chatIdNum)) {
      this.lastUpdateCheck.get(chatIdNum).delete(connectionId);
    }
    return true;
  }

  async checkForNewMessages() {
    try {
      for (const [chatId, connectionIds] of this.chatRooms.entries()) {
        if (connectionIds.size === 0) continue;

        let minLastMessageId = Number.MAX_SAFE_INTEGER;
        for (const connId of connectionIds) {
          const connection = this.connections.get(connId);
          if (connection && connection.chats.has(chatId)) {
            const lastMsgId = connection.chats.get(chatId);
            minLastMessageId = Math.min(minLastMessageId, lastMsgId);
          }
        }

        if (minLastMessageId === Number.MAX_SAFE_INTEGER) {
          minLastMessageId = 0;
        }

        const [messages] = await this.db.execute(
          `SELECT * FROM messages 
                     WHERE chat_id = ? AND id > ? 
                     ORDER BY id ASC`,
          [chatId, minLastMessageId]
        );

        if (messages.length === 0) continue;

        for (const message of messages) {
          const activeViewers = new Set();

          for (const connId of connectionIds) {
            const connection = this.connections.get(connId);
            if (connection) {
              const enrichedMessages = await this.enrichMessages(
                [message],
                connection.userId
              );
              const formattedMessage = enrichedMessages[0];

              this.sendSSE(connection.res, "new_message", {
                type: "new_message",
                data: formattedMessage,
              });

              if (
                connection.userId !== message.user_id &&
                connection.chats.has(chatId)
              ) {
                activeViewers.add(connection.userId);
              }
            }
          }

          if (activeViewers.size > 0) {
            await this.markMessageViewedForUsers(
              chatId,
              message.id,
              [...activeViewers]
            );
          }

          const lastMessageId = messages[messages.length - 1].id;
          for (const connId of connectionIds) {
            const connection = this.connections.get(connId);
            if (connection && connection.chats.has(chatId)) {
              connection.chats.set(chatId, lastMessageId);
            }
          }
        }
    } catch (error) {
      console.error("Ошибка проверки сообщений:", error);
    }
  }

  async checkForUpdates() {
    try {
      for (const [chatId, connectionIds] of this.chatRooms.entries()) {
        if (connectionIds.size === 0) continue;

        for (const connId of connectionIds) {
          const connection = this.connections.get(connId);
          if (!connection) continue;

          const lastCheck = this.lastUpdateCheck.get(chatId)?.get(connId);
          if (!lastCheck) continue;

          // 1. Проверяем удаления через updates
          await this.checkDeletes(connection, chatId, lastCheck);

          // 2. Проверяем реакции через updates (они удаляются через 30 сек)
          await this.checkReactionUpdates(connection, chatId, lastCheck);

          // 3. Проверяем редактирования через updated_at
          await this.checkMessageEdits(connection, chatId, lastCheck);

          // 4. Проверяем просмотры через updated_at
          await this.checkViewUpdates(connection, chatId, lastCheck);

          // Обновляем время последней проверки
          this.lastUpdateCheck.get(chatId).set(connId, new Date());
        }
      }
    } catch (error) {
      console.error("Ошибка проверки обновлений:", error);
    }
  }

  async checkDeletes(connection, chatId, lastCheck) {
    try {
      const [deletes] = await this.db.execute(
        `SELECT message_id, created_at 
                 FROM updates 
                 WHERE chat_id = ? 
                 AND type = 'message_delete' 
                 AND created_at > ?`,
        [chatId, lastCheck]
      );

      for (const deleteRecord of deletes) {
        this.sendSSE(connection.res, "message_deleted", {
          message_id: deleteRecord.message_id,
          chat_id: chatId,
        });
      }
    } catch (error) {
      console.error("Ошибка проверки удалений:", error);
    }
  }

  async checkReactionUpdates(connection, chatId, lastCheck) {
    try {
      // Проверяем записи в updates о реакциях
      const [reactionUpdates] = await this.db.execute(
        `SELECT DISTINCT message_id
             FROM updates
             WHERE chat_id = ?
             AND type = 'message_reactions'
             AND created_at > ?`,
        [chatId, lastCheck]
      );

      // Дополнительно проверяем свежие записи реакций напрямую
      const [recentReactionMessages] = await this.db.execute(
        `SELECT DISTINCT mr.message_id
             FROM message_reactions mr
             JOIN messages m ON mr.message_id = m.id
             WHERE m.chat_id = ?
             AND mr.created_at > ?`,
        [chatId, lastCheck]
      );

      const messageIds = new Set([
        ...reactionUpdates.map((row) => row.message_id),
        ...recentReactionMessages.map((row) => row.message_id),
      ]);

      for (const messageId of messageIds) {
        await this.sendReactionUpdate(connection, chatId, messageId);
      }
    } catch (error) {
      console.error("Ошибка проверки реакций:", error);
    }
  }

  async checkMessageEdits(connection, chatId, lastCheck) {
    try {
      const [editedMessages] = await this.db.execute(
        `SELECT id, text, updated_at 
                 FROM messages 
                 WHERE chat_id = ? 
                 AND is_edited = 1 
                 AND updated_at > ? 
                 AND updated_at > created_at`,
        [chatId, lastCheck]
      );

      for (const message of editedMessages) {
        this.sendSSE(connection.res, "message_edited", {
          message_id: message.id,
          chat_id: chatId,
          text: message.text,
          is_edited: true,
          updated_at: message.updated_at,
        });
      }
    } catch (error) {
      console.error("Ошибка проверки редактирований:", error);
    }
  }

  async checkViewUpdates(connection, chatId, lastCheck) {
    try {
      const [updatedViews] = await this.db.execute(
        `SELECT DISTINCT message_id 
                 FROM message_views 
                 WHERE message_id IN (
                     SELECT id FROM messages WHERE chat_id = ?
                 ) AND updated_at > ?`,
        [chatId, lastCheck]
      );

      for (const row of updatedViews) {
        await this.sendViewUpdate(connection, chatId, row.message_id);
      }
    } catch (error) {
      console.error("Ошибка проверки просмотров:", error);
    }
  }

  async sendReactionUpdate(connection, chatId, messageId) {
    try {
      const [reactions] = await this.db.execute(
        `SELECT * FROM message_reactions WHERE message_id = ?`,
        [messageId]
      );

      const formattedReactions = {};
      reactions.forEach((reaction) => {
        const emoji = reaction.emoji;
        if (!formattedReactions[emoji]) {
          formattedReactions[emoji] = {
            count: 1,
            users: [reaction.user_id],
            hasReacted: reaction.user_id === connection.userId,
          };
        } else {
          formattedReactions[emoji].count++;
          formattedReactions[emoji].users.push(reaction.user_id);
          if (reaction.user_id === connection.userId) {
            formattedReactions[emoji].hasReacted = true;
          }
        }
      });

      this.sendSSE(connection.res, "reaction_update", {
        message_id: messageId,
        chat_id: chatId,
        reactions: formattedReactions,
      });
    } catch (error) {
      console.error("Ошибка отправки обновления реакций:", error);
    }
  }

  async sendViewUpdate(connection, chatId, messageId) {
    try {
      const [[messageRow]] = await this.db.execute(
        `SELECT user_id FROM messages WHERE id = ? LIMIT 1`,
        [messageId]
      );

      const authorId = messageRow?.user_id;

      const [views] = await this.db.execute(
        `SELECT user_id, viewed_at FROM message_views WHERE message_id = ?`,
        [messageId]
      );

      const viewedBy = views.map((v) => v.user_id);
      const hasViewed = viewedBy.includes(connection.userId);
      const hasOtherViews = viewedBy.some((id) => id !== authorId);

      this.sendSSE(connection.res, "view_update", {
        message_id: messageId,
        chat_id: chatId,
        is_read:
          hasViewed ||
          (connection.userId === authorId && hasOtherViews),
        viewed_by: viewedBy,
        view_count: views.length,
      });
    } catch (error) {
      console.error("Ошибка отправки обновления просмотров:", error);
    }
  }

  async broadcastViewUpdates(chatId, messageIds) {
    const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
    const chatKey = parseInt(chatId);
    if (Number.isNaN(chatKey) || !this.chatRooms.has(chatKey)) return;

    const connections = this.chatRooms.get(chatKey);
    for (const messageId of ids) {
      for (const connId of connections) {
        const connection = this.connections.get(connId);
        if (connection) {
          await this.sendViewUpdate(connection, chatId, messageId);
        }
      }
    }
  }

  async checkForChatListUpdates() {
    try {
      if (this.chatListConnections.size === 0) return;

      for (const [
        connectionId,
        connection,
      ] of this.chatListConnections.entries()) {
        try {
          const userId = connection.userId;
          const chats = await this.getUserChats(userId);

          this.sendSSE(connection.res, "chat_list_update", {
            type: "full_update",
            chats: chats,
            timestamp: Date.now(),
          });

          connection.lastUpdate = Date.now();
        } catch (error) {
          console.error(
            `Ошибка обновления списка чатов для соединения ${connectionId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Ошибка проверки обновлений списка чатов:", error);
    }
  }

  async getUserChats(userId) {
    try {
      const [chats] = await this.db.execute(
        `SELECT 
                    c.id,
                    c.type,
                    c.name,
                    c.login,
                    c.avatar,
                    c.description,
                    cp.role
                 FROM chat_participants cp
                 JOIN chats c ON cp.chat_id = c.id
                 WHERE cp.user_id = ?`,
        [userId]
      );

      const enrichedChats = [];

      for (const chat of chats) {
        const [lastMessage] = await this.db.execute(
          `SELECT m.id,
                  m.text,
                  m.created_at,
                  m.user_id,
                  CASE
                    WHEN m.user_id = ? THEN 1
                    WHEN mv.id IS NOT NULL THEN 1
                    ELSE 0
                  END AS is_read
             FROM messages m
             LEFT JOIN message_views mv ON mv.message_id = m.id AND mv.user_id = ?
             WHERE m.chat_id = ?
             ORDER BY m.created_at DESC
             LIMIT 1`,
          [userId, userId, chat.id]
        );

        const [unreadResult] = await this.db.execute(
          `SELECT COUNT(DISTINCT m.id) as count 
                     FROM messages m
                     LEFT JOIN message_views mv ON m.id = mv.message_id AND mv.user_id = ?
                     WHERE m.chat_id = ? AND m.user_id != ? AND mv.id IS NULL`,
          [userId, chat.id, userId]
        );

        const [participantsResult] = await this.db.execute(
          `SELECT COUNT(*) as count 
                     FROM chat_participants 
                     WHERE chat_id = ?`,
          [chat.id]
        );

        const [pinnedMessages] = await this.db.execute(
          `SELECT COUNT(*) as count 
                     FROM messages 
                     WHERE chat_id = ? AND is_pinned = 1`,
          [chat.id]
        );

        let displayName = chat.name;
        let displayAvatar = chat.avatar;
        let displayLogin = chat.login;
        let lastSeen = null;
        let isOnline = false;

        if (chat.type === "private") {
          const [otherParticipant] = await this.db.execute(
            `SELECT user_id 
                         FROM chat_participants 
                         WHERE chat_id = ? AND user_id != ? 
                         LIMIT 1`,
            [chat.id, userId]
          );

          if (otherParticipant.length > 0) {
            const otherUserId = otherParticipant[0].user_id;

            const [otherUser] = await this.profileDb.execute(
              `SELECT username, login, ico, date_visit 
                             FROM users 
                             WHERE id = ? 
                             LIMIT 1`,
              [otherUserId]
            );

            if (otherUser.length > 0) {
              displayName = otherUser[0].username || "Без имени";
              displayLogin = otherUser[0].login || `user_${otherUserId}`;
              displayAvatar =
                otherUser[0].ico ||
                "https://mfs.whilet.ru/s?path=/images/regular/default_ico.png";
              lastSeen = otherUser[0].date_visit;
              isOnline = this.checkUserOnline(lastSeen);
            }
          }
        } else {
          displayName = chat.name || `Чат ${chat.id}`;
          displayLogin = chat.login || `${chat.type}_${chat.id}`;
          displayAvatar =
            chat.avatar ||
            "https://mfs.whilet.ru/s?path=/images/regular/default_ico.png";
        }

        const lastMessageRow = lastMessage[0];
        let lastMessageIsRead = lastMessageRow?.is_read ?? 0;

        if (lastMessageRow) {
          if (lastMessageRow.user_id === userId) {
            lastMessageIsRead = 1;
          } else if (unreadResult[0]?.count > 0) {
            lastMessageIsRead = 0;
          }
        }

        const enrichedChat = {
          id: chat.id,
          type: chat.type,
          username: displayName,
          login: displayLogin,
          avatar: displayAvatar,
          description: chat.description || "",
          lastMessage:
            lastMessage.length > 0
              ? {
                  text: lastMessageRow.text || "Нет сообщений",
                  timestamp: lastMessageRow.created_at,
                  user_id: lastMessageRow.user_id,
                  is_read: lastMessageIsRead,
                }
              : {
                  text: "Нет сообщений",
                  timestamp: null,
                  user_id: null,
                  is_read: null,
                },
          unreadCount: unreadResult[0]?.count || 0,
          peopleCount: participantsResult[0]?.count || 1,
          is_pinned: false,
          is_muted: false,
          pinnedMessagesCount: pinnedMessages[0]?.count || 0,
          isOnline: isOnline,
          lastSeen: lastSeen,
          role: chat.role || "member",
        };

        if (enrichedChat.lastMessage.user_id) {
          try {
            const [author] = await this.profileDb.execute(
              `SELECT username 
                             FROM users 
                             WHERE id = ? 
                             LIMIT 1`,
              [enrichedChat.lastMessage.user_id]
            );

            if (author.length > 0) {
              enrichedChat.lastMessage.senderName = author[0].username;
            }
          } catch (error) {
            console.error("Ошибка получения информации об авторе:", error);
          }
        }

        enrichedChats.push(enrichedChat);
      }

      return enrichedChats.sort((a, b) => {
        if (a.pinnedMessagesCount > 0 && b.pinnedMessagesCount === 0) return -1;
        if (a.pinnedMessagesCount === 0 && b.pinnedMessagesCount > 0) return 1;

        const aTime = a.lastMessage.timestamp
          ? new Date(a.lastMessage.timestamp)
          : new Date(0);
        const bTime = b.lastMessage.timestamp
          ? new Date(b.lastMessage.timestamp)
          : new Date(0);

        return bTime - aTime;
      });
    } catch (error) {
      console.error("Ошибка получения списка чатов:", error);
      return [];
    }
  }

  checkUserOnline(lastSeen) {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen).getTime();
    const currentTime = Date.now();
    return currentTime - lastSeenTime < 300000;
  }

  async hasAccessToChat(userId, chatId) {
    try {
      const [rows] = await this.db.execute(
        `SELECT 1 FROM chat_participants 
                 WHERE user_id = ? AND chat_id = ?`,
        [userId, chatId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Ошибка проверки доступа к чату:", error);
      return false;
    }
  }

  formatMessage(message, attachments, reactions, views, currentUserId) {
    const formattedReactions = {};
    reactions.forEach((reaction) => {
      const emoji = reaction.emoji;
      if (!formattedReactions[emoji]) {
        formattedReactions[emoji] = {
          count: 1,
          users: [reaction.user_id],
          hasReacted: reaction.user_id === currentUserId,
        };
      } else {
        formattedReactions[emoji].count++;
        formattedReactions[emoji].users.push(reaction.user_id);
        if (reaction.user_id === currentUserId) {
          formattedReactions[emoji].hasReacted = true;
        }
      }
    });

    const viewedBy = views.map((v) => v.user_id);
    const hasUserViewed = viewedBy.includes(currentUserId);
    const hasOtherViews = viewedBy.some((id) => id !== message.user_id);
    const isRead =
      hasUserViewed ||
      (currentUserId === message.user_id && hasOtherViews);

    return {
      id: message.id,
      chat_id: message.chat_id,
      user_id: message.user_id,
      text: message.text,
      reply_to: message.reply_to,
      is_pinned: message.is_pinned,
      is_read: isRead,
      is_edited: message.is_edited,
      created_at: message.created_at,
      updated_at: message.updated_at,
      media: attachments,
      reactions: formattedReactions,
      views: {
        count: views.length,
        users: viewedBy,
      },
    };
  }

  async markMessageAsViewed(connectionId, chatId, messageId, userId) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Соединение не найдено");
      }

      if (!connection.chats.has(parseInt(chatId))) {
        throw new Error("Пользователь не находится в чате");
      }

      const [existing] = await this.db.execute(
        `SELECT id FROM message_views WHERE message_id = ? AND user_id = ?`,
        [messageId, userId]
      );

      if (existing.length > 0) {
        return true;
      }

      const timestamp = Math.floor(Date.now() / 1000);

      await this.db.execute(
        `INSERT INTO message_views (message_id, user_id, viewed_at)
                 VALUES (?, ?, ?)`,
        [messageId, userId, timestamp]
      );

      await this.updateChatListForParticipants(chatId);

      await this.broadcastViewUpdates(chatId, messageId);

      return true;
    } catch (error) {
      console.error("Ошибка отметки сообщения как просмотренного:", error);
      throw error;
    }
  }

  async markMessageViewedForUsers(chatId, messageId, userIds) {
    try {
      const uniqueUsers = [...new Set(userIds)];
      if (uniqueUsers.length === 0) return true;

      const placeholders = uniqueUsers.map(() => "?").join(", ");
      const [existing] = await this.db.execute(
        `SELECT user_id FROM message_views
                 WHERE message_id = ? AND user_id IN (${placeholders})`,
        [messageId, ...uniqueUsers]
      );

      const existingSet = new Set(existing.map((row) => row.user_id));
      const usersToInsert = uniqueUsers.filter((id) => !existingSet.has(id));

      if (usersToInsert.length === 0) return true;

      const timestamp = Math.floor(Date.now() / 1000);
      const values = usersToInsert.map(() => "(?, ?, ?)").join(", ");

      await this.db.execute(
        `INSERT INTO message_views (message_id, user_id, viewed_at)
                 VALUES ${values}`,
        usersToInsert.flatMap((id) => [messageId, id, timestamp])
      );

      await this.updateChatListForParticipants(chatId);
      await this.broadcastViewUpdates(chatId, messageId);

      return true;
    } catch (error) {
      console.error("Ошибка автоматической отметки просмотра:", error);
      throw error;
    }
  }

  async markMessagesAsViewed(connectionId, chatId, messageIds, userId) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Соединение не найдено");
      }

      if (!connection.chats.has(parseInt(chatId))) {
        throw new Error("Пользователь не находится в чате");
      }

      const uniqueIds = [...new Set(messageIds)].filter((id) => !!id);
      if (uniqueIds.length === 0) {
        return true;
      }

      const placeholders = uniqueIds.map(() => "?").join(", ");

      const [existing] = await this.db.execute(
        `SELECT message_id FROM message_views
                 WHERE message_id IN (${placeholders}) AND user_id = ?`,
        [...uniqueIds, userId]
      );

      const existingIds = new Set(existing.map((row) => row.message_id));
      const idsToInsert = uniqueIds.filter((id) => !existingIds.has(id));

      if (idsToInsert.length === 0) {
        return true;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const values = idsToInsert
        .map(() => "(?, ?, ?)")
        .join(", ");

      await this.db.execute(
        `INSERT INTO message_views (message_id, user_id, viewed_at)
                 VALUES ${values}`,
        idsToInsert.flatMap((id) => [id, userId, timestamp])
      );

      await this.updateChatListForParticipants(chatId);

      await this.broadcastViewUpdates(chatId, idsToInsert);

      return true;
    } catch (error) {
      console.error("Ошибка массовой отметки сообщений как просмотренных:", error);
      throw error;
    }
  }

  async markAllMessagesAsViewed(connectionId, chatId, userId) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error("Соединение не найдено");
      }

      if (!connection.chats.has(parseInt(chatId))) {
        throw new Error("Пользователь не находится в чате");
      }

      const [unviewedMessages] = await this.db.execute(
        `SELECT m.id
                 FROM messages m
                 LEFT JOIN message_views mv ON m.id = mv.message_id AND mv.user_id = ?
                 WHERE m.chat_id = ? AND m.user_id != ? AND mv.id IS NULL`,
        [userId, chatId, userId]
      );

      if (unviewedMessages.length === 0) {
        return true;
      }

      const timestamp = Math.floor(Date.now() / 1000);

      for (const msg of unviewedMessages) {
        await this.db.execute(
          `INSERT INTO message_views (message_id, user_id, viewed_at)
                     VALUES (?, ?, ?)`,
          [msg.id, userId, timestamp]
        );
      }

      await this.updateChatListForParticipants(chatId);

      const insertedIds = unviewedMessages.map((msg) => msg.id);
      await this.broadcastViewUpdates(chatId, insertedIds);

      return true;
    } catch (error) {
      console.error("Ошибка отметки всех сообщений как просмотренных:", error);
      throw error;
    }
  }

  async updateChatListForParticipants(chatId) {
    try {
      const [participants] = await this.db.execute(
        `SELECT user_id FROM chat_participants WHERE chat_id = ?`,
        [chatId]
      );

      for (const participant of participants) {
        const chats = await this.getUserChats(participant.user_id);

        for (const [connId, connection] of this.chatListConnections.entries()) {
          if (connection.userId === participant.user_id) {
            this.sendSSE(connection.res, "chat_list_update", {
              type: "unread_update",
              chats: chats,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      console.error("Ошибка обновления списка чатов для участников:", error);
    }
  }

  // Метод для получения всех реакций сообщения (для Next.js)
  async getMessageReactions(messageId, userId) {
    try {
      const [reactions] = await this.db.execute(
        `SELECT * FROM message_reactions WHERE message_id = ?`,
        [messageId]
      );

      const formattedReactions = {};
      reactions.forEach((reaction) => {
        const emoji = reaction.emoji;
        if (!formattedReactions[emoji]) {
          formattedReactions[emoji] = {
            count: 1,
            users: [reaction.user_id],
            hasReacted: reaction.user_id === userId,
          };
        } else {
          formattedReactions[emoji].count++;
          formattedReactions[emoji].users.push(reaction.user_id);
          if (reaction.user_id === userId) {
            formattedReactions[emoji].hasReacted = true;
          }
        }
      });

      return formattedReactions;
    } catch (error) {
      console.error("Ошибка получения реакций:", error);
      throw error;
    }
  }
}

const sseManager = new SSEManager(Vostok1);

// Endpoints
router.get("/connect", async (req, res, next) => {
  const v1 = new Vostok1(req, res, next);
  let userId = req.query.user_id || req.user?.id || null;

  if (!userId) {
    const hasSession = await v1.auth.checkSession();
    if (!hasSession) {
      return res.status(401).json({ error: "User ID required" });
    }

    userId = await v1.auth.getCurrentUserID();
    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }
  }

  const connectionId = uuidv4();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  sseManager.addConnection(connectionId, res, userId);

  sseManager.sendSSE(res, "connected", {
    connectionId,
    message: "Соединение установлено",
  });

  const { chat_id, last_message_id } = req.query;
  if (chat_id) {
    const lastMsgId = parseInt(last_message_id) || 0;
    await sseManager.joinChat(
      connectionId,
      chat_id,
      lastMsgId,
      await v1.auth.checkSession(),
      userId
    );
  }

  const heartbeatInterval = setInterval(() => {
    if (!sseManager.sendSSE(res, "heartbeat", { time: Date.now() })) {
      clearInterval(heartbeatInterval);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    sseManager.removeConnection(connectionId);
  });

  req.on("error", (error) => {
    clearInterval(heartbeatInterval);
    sseManager.removeConnection(connectionId);
  });
});

router.post("/load-older-messages", express.json(), async (req, res) => {
  try {
    const { connectionId, chat_id, before_id, limit } = req.body;

    if (!connectionId || !chat_id || !before_id) {
      return res.status(400).json({
        success: false,
        message: "Отсутствуют обязательные параметры",
      });
    }

    await sseManager.loadOlderMessages(
      connectionId,
      chat_id,
      before_id,
      limit || 333
    );

    res.json({
      success: true,
      message: "Запрос на загрузку старых сообщений отправлен",
    });
  } catch (error) {
    console.error("Ошибка загрузки старых сообщений:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/mark-as-viewed", express.json(), async (req, res) => {
  try {
    const { connectionId, chat_id, message_id } = req.body;

    if (!connectionId || !chat_id || !message_id) {
      return res.status(400).json({
        success: false,
        message: "Отсутствуют обязательные параметры",
      });
    }

    const connection = sseManager.connections.get(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Соединение не найдено",
      });
    }

    await sseManager.markMessageAsViewed(
      connectionId,
      chat_id,
      message_id,
      connection.userId
    );

    res.json({
      success: true,
      message: "Сообщение отмечено как просмотренное",
    });
  } catch (error) {
    console.error("Ошибка отметки сообщения как просмотренного:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/mark-many-viewed", express.json(), async (req, res) => {
  try {
    const { connectionId, chat_id, message_ids } = req.body;

    if (!connectionId || !chat_id || !Array.isArray(message_ids)) {
      return res.status(400).json({
        success: false,
        message: "Отсутствуют обязательные параметры",
      });
    }

    const connection = sseManager.connections.get(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Соединение не найдено",
      });
    }

    await sseManager.markMessagesAsViewed(
      connectionId,
      chat_id,
      message_ids,
      connection.userId
    );

    res.json({
      success: true,
      message: "Сообщения отмечены как просмотренные",
    });
  } catch (error) {
    console.error("Ошибка массовой отметки сообщений как просмотренных:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/mark-all-viewed", express.json(), async (req, res) => {
  try {
    const { connectionId, chat_id } = req.body;

    if (!connectionId || !chat_id) {
      return res.status(400).json({
        success: false,
        message: "Отсутствуют обязательные параметры",
      });
    }

    const connection = sseManager.connections.get(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Соединение не найдено",
      });
    }

    await sseManager.markAllMessagesAsViewed(
      connectionId,
      chat_id,
      connection.userId
    );

    res.json({
      success: true,
      message: "Все сообщения отмечены как просмотренные",
    });
  } catch (error) {
    console.error("Ошибка отметки всех сообщений как просмотренных:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Новый endpoint для получения реакций
router.get("/get-reactions/:message_id", async (req, res) => {
  try {
    const { message_id } = req.params;
    const userId = req.query.user_id;

    if (!message_id || !userId) {
      return res.status(400).json({
        success: false,
        message: "Отсутствуют обязательные параметры",
      });
    }

    const reactions = await sseManager.getMessageReactions(
      parseInt(message_id),
      parseInt(userId)
    );

    res.json({
      success: true,
      reactions: reactions,
    });
  } catch (error) {
    console.error("Ошибка получения реакций:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/chat-list-monitor", async (req, res, next) => {
  const userId = req.query.user_id || req.user?.id || null;
  const connectionId = uuidv4();

  if (!userId) {
    return res.status(401).json({ error: "User ID required" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  sseManager.addChatListConnection(connectionId, res, userId);

  sseManager.sendSSE(res, "connected", {
    connectionId,
    message: "Мониторинг списка чатов активирован",
  });

  try {
    const chats = await sseManager.getUserChats(userId);
    sseManager.sendSSE(res, "chat_list_update", {
      type: "initial",
      chats: chats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Ошибка отправки начального списка чатов:", error);
    sseManager.sendSSE(res, "error", {
      message: "Ошибка загрузки списка чатов",
    });
  }

  const heartbeatInterval = setInterval(() => {
    if (!sseManager.sendSSE(res, "heartbeat", { time: Date.now() })) {
      clearInterval(heartbeatInterval);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    sseManager.removeChatListConnection(connectionId);
  });

  req.on("error", (error) => {
    clearInterval(heartbeatInterval);
    sseManager.removeChatListConnection(connectionId);
  });
});

router.post("/leave-chat", express.json(), async (req, res) => {
  try {
    const { connectionId, chat_id } = req.body;

    if (!connectionId || !chat_id) {
      return res.status(400).json({
        success: false,
        message: "Отсутствуют обязательные параметры",
      });
    }

    await sseManager.leaveChat(connectionId, chat_id);

    res.json({
      success: true,
      message: "Успешно покинули чат",
    });
  } catch (error) {
    console.error("Ошибка покидания чата:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Ошибка покидания чата",
    });
  }
});

export default router;
