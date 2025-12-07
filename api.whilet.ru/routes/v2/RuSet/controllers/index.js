import { Vostok1 } from "#modules/Vostok1/index";
import {
  Chats,
  ChatParticipants,
  ChatSettings,
  Messages,
  MessageAttachments,
  MessageReactions,
  Updates,
  User,
} from "../models/index.js";
import { S3Service } from "../services/S3Service.js";
import { poolRuSet } from "#db/index";

class RuSetController {
  /**
   * Универсальная функция для поиска чата
   */
  static async findChat(id, myId) {
    // Канал (логин заканчивается на _c)
    if (id.endsWith("_c")) {
      const chat = await Chats.findByLoginAndType(id, "channel");

      if (!chat) {
        return { error: "Канал не найден", code: 404, type: "channel" };
      }

      const participant = await ChatParticipants.findByChatAndUser(
        chat.id,
        myId
      );

      if (!participant) {
        return {
          error: "Вы не подписаны на этот канал",
          code: 403,
          type: "channel",
        };
      }

      return {
        type: "channel",
        chat,
        chat_id: chat.id,
        participant,
      };
    }

    // Группа (логин заканчивается на _g)
    if (id.endsWith("_g")) {
      const chat = await Chats.findByLoginAndType(id, "group");

      if (!chat) {
        return { error: "Группа не найдена", code: 404, type: "group" };
      }

      const participant = await ChatParticipants.findByChatAndUser(
        chat.id,
        myId
      );

      if (!participant) {
        return {
          error: "Вы не являетесь участником этой группы",
          code: 403,
          type: "group",
        };
      }

      return {
        type: "group",
        chat,
        chat_id: chat.id,
        participant,
      };
    }

    // Приватный чат (логин пользователя)
    const user = await User.findByLogin(id);
    if (!user) {
      return {
        error: "Пользователь не существует",
        code: 404,
        type: "private",
      };
    }

    // Ищем общий приватный чат
    const commonChat = await ChatParticipants.findCommonPrivateChat(
      myId,
      user.id
    );

    if (!commonChat) {
      return { type: "private", user, chat: null };
    }

    return {
      type: "private",
      user,
      chat_id: commonChat.chat_id,
    };
  }

  /**
   * Проверка онлайн статуса
   */
  static checkUserOnline(lastSeen) {
    if (!lastSeen) return false;
    const lastSeenTime = new Date(lastSeen).getTime();
    const currentTime = Date.now();
    return currentTime - lastSeenTime < 300000; // 5 минут
  }

  /**
   * Проверка верификации пользователя
   */
  static isUserVerified(user) {
    return (
      user.status?.verification === "true" ||
      user.status?.name === "WHILET" ||
      user.status?.name === "Администратор"
    );
  }

  /**
   * Генерация случайного хеша
   */
  static generateHash(length = 15) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Получение информации о группе
   */
  static async getGroupInfo(chatId, userId) {
    const chat = await Chats.findById(chatId);
    const participants = await ChatParticipants.findByChatId(chatId);
    const settings = await ChatSettings.findByChatId(chatId);

    const participantsList = [];
    for (const participant of participants) {
      const user = await User.findById(participant.user_id);
      if (user) {
        participantsList.push({
          id: user.id,
          username: user.username,
          login: user.login,
          avatar: user.ico,
          role: participant.role,
        });
      }
    }

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      login: chat.login,
      description: chat.description,
      avatar: chat.avatar,
      link: chat.login ? `rs.whilet.ru/c/${chat.login}` : null,
      participants: participantsList,
      participants_count: participantsList.length,
      settings,
      created_at: chat.created_at,
    };
  }

  /**
   * Получение информации о канале
   */
  static async getChannelInfo(chatId, userId) {
    const chat = await Chats.findById(chatId);
    const settings = await ChatSettings.findByChatId(chatId);
    const subscribersCount = await ChatParticipants.count(chatId);

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      login: chat.login,
      description: chat.description,
      avatar: chat.avatar,
      link: chat.login ? `rs.whilet.ru/c/${chat.login}` : null,
      subscribers_count: subscribersCount,
      is_public: settings?.is_public ?? true,
      settings,
      created_at: chat.created_at,
    };
  }

  // ==================== ENDPOINTS ====================

  /**
   * Получение текущего пользователя
   */
  static async getCurrentUser(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();

      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return v1.main.sendResponse({
          status: 404,
          message: "Пользователь не найден",
        });
      }

      const currentUser = {
        id: userId,
        username: user.username,
        login: user.login,
        avatar: user.ico,
        description: user.info?.short || null,
        isPremium:
          v1.auth.checkPermissions(user.status?.name, "whilet") ||
          v1.auth.checkPermissions(user.status?.name, "vip"),
      };

      return v1.main.sendResponse({
        status: 200,
        message: "Запрос выполнен успешно",
        data: currentUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Отправка сообщения
   */
  static async sendMessage(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { id } = req.params;
      const { message } = req.body;

      if (!message) {
        return v1.main.sendResponse({
          status: 400,
          message: "Сообщение обязательно",
        });
      }

      const chatInfo = await RuSetController.findChat(id, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      let chatId;

      // Обработка приватного чата
      if (chatInfo.type === "private") {
        if (!chatInfo.chat_id) {
          // Создаем новый приватный чат
          const chat = await Chats.create({
            type: "private",
            user_id: userId,
          });

          await ChatParticipants.create({
            chat_id: chat.id,
            user_id: userId,
            role: "owner",
          });

          await ChatParticipants.create({
            chat_id: chat.id,
            user_id: chatInfo.user.id,
            role: "member",
          });

          await ChatSettings.create({
            chat_id: chat.id,
          });

          chatId = chat.id;
        } else {
          chatId = chatInfo.chat_id;
        }
      } else {
        // Группа или канал
        chatId = chatInfo.chat_id;
        const settings = await ChatSettings.findByChatId(chatId);

        // Проверка прав на отправку сообщений
        if (chatInfo.type === "channel") {
          if (!["owner", "admin"].includes(chatInfo.participant.role)) {
            return v1.main.sendResponse({
              status: 403,
              message:
                "Только администраторы могут отправлять сообщения в канал",
            });
          }
        } else if (chatInfo.type === "group") {
          if (
            !settings?.can_members_send_messages &&
            !["owner", "admin"].includes(chatInfo.participant.role)
          ) {
            return v1.main.sendResponse({
              status: 403,
              message: "У вас нет прав на отправку сообщений в эту группу",
            });
          }
        }
      }

      // Создаем сообщение
      const msg = await Messages.create({
        chat_id: chatId,
        user_id: userId,
        text: message.text || null,
        reply_to: message.reply_to || undefined,
        is_pinned: false,
        is_read: false,
      });

      // Добавляем медиа-файлы
      if (message.media) {
        const mediaArray = Array.isArray(message.media)
          ? message.media
          : [message.media];

        for (const media of mediaArray) {
          await MessageAttachments.create({
            message_id: msg.id,
            name: media.name,
            type: media.type,
            url: media.url,
            size: media.size || 0,
          });
        }
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Сообщение отправлено",
        data: msg,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение сообщений
   */
  static async getMessages(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { id } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const beforeId = parseInt(req.query.before_id) || Number.MAX_SAFE_INTEGER;

      const chatInfo = await RuSetController.findChat(id, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (!chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      await Messages.markAsRead(chatInfo.chat_id, userId);

      const messages = await Messages.findByChatId(chatInfo.chat_id, {
        limit,
        beforeId,
      });

      const hasMore = messages.length > limit;
      if (hasMore) {
        messages.pop();
      }

      // Разворачиваем для правильного порядка
      messages.reverse();

      // Добавляем реакции, медиа и информацию об авторе
      for (const msg of messages) {
        const attachments = await MessageAttachments.findByMessageId(msg.id);
        const reactions = await MessageReactions.findByMessageId(msg.id);

        msg.media = attachments;

        // Группируем реакции
        const reactionsMap = {};
        for (const reaction of reactions) {
          if (!reactionsMap[reaction.emoji]) {
            reactionsMap[reaction.emoji] = {
              count: 0,
              hasReacted: false,
              users: [],
            };
          }
          reactionsMap[reaction.emoji].count++;
          reactionsMap[reaction.emoji].users.push(reaction.user_id);
          if (reaction.user_id === userId) {
            reactionsMap[reaction.emoji].hasReacted = true;
          }
        }
        msg.reactions = reactionsMap;

        // Информация об авторе
        const author = await User.findById(msg.user_id);
        if (author) {
          msg.author = {
            id: author.id,
            username: author.username,
            login: author.login,
            avatar: author.ico,
          };
        }
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Запрос выполнен успешно",
        data: {
          messages,
          hasMore,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение списка чатов
   */
  static async getMyChats(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const participations = await ChatParticipants.findByUserId(userId);
      const chats = [];

      for (const participation of participations) {
        const chatData = await Chats.findById(participation.chat_id);
        if (!chatData) continue;

        const result = {
          id: chatData.id,
          type: chatData.type,
        };

        const lastMessage = await Messages.getLastMessage(
          participation.chat_id
        );
        const unreadCount = await Messages.countUnread(
          participation.chat_id,
          userId
        );
        const participantsCount = await ChatParticipants.count(
          participation.chat_id
        );

        if (chatData.type === "private") {
          const participants = await ChatParticipants.findByChatId(
            participation.chat_id
          );
          const otherParticipant = participants.find(
            (p) => p.user_id !== userId
          );

          if (otherParticipant) {
            const userChat = await User.findById(otherParticipant.user_id);
            if (userChat) {
              result.username = userChat.username;
              result.login = userChat.login;
              result.avatar = userChat.ico;
              result.lastSeen = userChat.date_visit;
            }
          }
        } else {
          result.name = chatData.name;
          result.username = chatData.name;
          result.login = chatData.login;
          result.avatar = chatData.avatar;
          result.description = chatData.description;
        }

        result.lastMessage = lastMessage
          ? {
              text: lastMessage.text || "Сообщения отсутствуют",
              timestamp: lastMessage.created_at || null,
              user_id: lastMessage.user_id || null,
              is_read: lastMessage.is_read ?? false,
            }
          : {
              text: "Сообщения отсутствуют",
              timestamp: null,
              user_id: null,
              is_read: null,
            };

        result.unreadCount = unreadCount;
        result.peopleCount = participantsCount;
        result.is_pinned = false;
        result.is_muted = false;

        chats.push(result);
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Запрос выполнен успешно",
        data: chats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение информации о чате
   */
  static async getChatInfo(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { id } = req.params;
      const chatInfo = await RuSetController.findChat(id, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      let result = {};

      if (chatInfo.type === "private") {
        if (!chatInfo.chat_id) {
          // Создаем чат, если его нет
          const chat = await Chats.create({
            type: "private",
            user_id: userId,
          });

          await ChatParticipants.create({
            chat_id: chat.id,
            user_id: userId,
            role: "owner",
          });

          await ChatParticipants.create({
            chat_id: chat.id,
            user_id: chatInfo.user.id,
            role: "member",
          });

          await ChatSettings.create({ chat_id: chat.id });

          chatInfo.chat_id = chat.id;
        }

        const user = chatInfo.user;
        const myInfo = await User.findById(userId);
        const settings = await ChatSettings.findByChatId(chatInfo.chat_id);

        result = {
          id: chatInfo.chat_id,
          type: "private",
          username: user.username,
          login: user.login,
          description: user.info?.short || null,
          avatar: user.ico,
          verification: RuSetController.isUserVerified(user),
          lastSeen: user.date_visit,
          participants: [
            {
              id: userId,
              username: myInfo?.username,
              login: myInfo?.login,
              avatar: myInfo?.ico,
              role: "owner",
            },
            {
              id: user.id,
              username: user.username,
              login: user.login,
              avatar: user.ico,
              role: "member",
            },
          ],
          settings,
        };
      } else {
        const chat = chatInfo.chat;
        const participants = await ChatParticipants.findByChatId(chat.id);
        const settings = await ChatSettings.findByChatId(chat.id);

        const participantsList = [];
        for (const participant of participants) {
          const user = await User.findById(participant.user_id);
          if (user) {
            participantsList.push({
              id: user.id,
              username: user.username,
              login: user.login,
              avatar: user.ico,
              role: participant.role,
            });
          }
        }

        result = {
          id: chat.id,
          type: chat.type,
          name: chat.name,
          username: chat.name,
          login: chat.login,
          description: chat.description,
          avatar: chat.avatar,
          link: chat.login ? `rs.whilet.ru/c/${chat.login}` : null,
          participants: participantsList,
          participants_count: participantsList.length,
          settings,
          created_at: chat.created_at,
          my_role: chatInfo.participant.role,
        };
      }

      const messagesCount = await Messages.count(chatInfo.chat_id);
      result.stats = {
        totalMembers: result.participants?.length || 0,
        totalMessages: messagesCount,
      };

      return v1.main.sendResponse({
        status: 200,
        message: "Запрос выполнен успешно",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Редактирование сообщения
   */
  static async editMessage(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { cid, mid } = req.params;
      const { text } = req.body;

      if (!text) {
        return v1.main.sendResponse({
          status: 400,
          message: "Текст сообщения обязателен",
        });
      }

      const chatInfo = await RuSetController.findChat(cid, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (!chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      const msg = await Messages.findById(parseInt(mid));

      if (!msg || msg.chat_id !== chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Сообщение не найдено",
        });
      }

      // Проверка прав
      if (msg.user_id !== userId) {
        if (chatInfo.type !== "private") {
          if (!["owner", "admin"].includes(chatInfo.participant.role)) {
            return v1.main.sendResponse({
              status: 403,
              message: "Недостаточно прав",
            });
          }
        } else {
          return v1.main.sendResponse({
            status: 403,
            message: "Вы не можете редактировать чужие сообщения",
          });
        }
      }

      await Messages.update(parseInt(mid), {
        text,
        is_edited: true,
      });

      return v1.main.sendResponse({
        status: 200,
        message: "Сообщение отредактировано",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Удаление сообщений
   */
  static async deleteMessages(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { cid } = req.params;
      const { mids } = req.body;

      if (!mids || !Array.isArray(mids)) {
        return v1.main.sendResponse({
          status: 400,
          message: "Список ID сообщений обязателен",
        });
      }

      const chatInfo = await RuSetController.findChat(cid, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (!chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      // Проверка прав на удаление
      let canDelete = false;
      if (chatInfo.type === "private") {
        canDelete = true;
      } else {
        const settings = await ChatSettings.findByChatId(chatInfo.chat_id);
        if (["owner", "admin"].includes(chatInfo.participant.role)) {
          canDelete = true;
        } else if (settings?.can_members_delete_messages) {
          canDelete = true;
        }
      }

      for (const mid of mids) {
        const msg = await Messages.findById(mid);
        if (!msg || msg.chat_id !== chatInfo.chat_id) continue;

        // Проверка прав на конкретное сообщение
        if (!canDelete && msg.user_id !== userId) continue;

        // Удаляем файлы
        const attachments = await MessageAttachments.findByMessageId(mid);
        for (const attachment of attachments) {
          await S3Service.deleteFile(attachment.url);
        }

        await MessageReactions.deleteByMessageId(mid);
        await MessageAttachments.deleteByMessageId(mid);
        await Messages.delete(mid);
      }

      await Updates.create({
        user_id: userId,
        message_id: mids[mids.length - 1],
        chat_id: chatInfo.chat_id,
        type: "message_delete",
      });

      return v1.main.sendResponse({
        status: 200,
        message: "Сообщения удалены",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Закрепление сообщения
   */
  static async pinMessage(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { cid, mid } = req.params;

      const chatInfo = await RuSetController.findChat(cid, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (!chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      // Проверка прав
      if (chatInfo.type !== "private") {
        if (!["owner", "admin"].includes(chatInfo.participant.role)) {
          return v1.main.sendResponse({
            status: 403,
            message: "Недостаточно прав",
          });
        }
      }

      const msg = await Messages.findById(parseInt(mid));

      if (!msg || msg.chat_id !== chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Сообщение не найдено",
        });
      }

      await Messages.update(parseInt(mid), {
        is_pinned: !msg.is_pinned,
      });

      return v1.main.sendResponse({
        status: 200,
        message: "Статус закрепления изменен",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Добавление/удаление реакции
   */
  static async toggleReaction(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { mid } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return v1.main.sendResponse({
          status: 400,
          message: "Эмодзи обязателен",
        });
      }

      const msg = await Messages.findById(parseInt(mid));
      if (!msg) {
        return v1.main.sendResponse({
          status: 404,
          message: "Сообщение не найдено",
        });
      }

      // Проверяем участие в чате
      const participant = await ChatParticipants.findByChatAndUser(
        msg.chat_id,
        userId
      );

      if (!participant) {
        return v1.main.sendResponse({
          status: 403,
          message: "Вы не являетесь участником этого чата",
        });
      }

      const existingReaction = await MessageReactions.findByUserAndMessage(
        userId,
        parseInt(mid),
        emoji
      );

      if (existingReaction) {
        await MessageReactions.delete(existingReaction.id);
      } else {
        await MessageReactions.create({
          user_id: userId,
          message_id: parseInt(mid),
          emoji,
        });

        await Updates.create({
          user_id: userId,
          message_id: parseInt(mid),
          chat_id: msg.chat_id,
          type: "message_reactions",
        });
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Реакция обновлена",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Удаление чата
   */
  static async deleteChat(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { cid } = req.params;

      const chatInfo = await RuSetController.findChat(cid, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (!chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      // Проверка прав
      if (chatInfo.type !== "private") {
        if (chatInfo.participant.role !== "owner") {
          return v1.main.sendResponse({
            status: 403,
            message: "Только владелец может удалить чат",
          });
        }
      }

      // Удаляем все сообщения и их вложения
      const messages = await Messages.getByChatId(chatInfo.chat_id);

      for (const msg of messages) {
        const attachments = await MessageAttachments.findByMessageId(msg.id);
        for (const attachment of attachments) {
          await S3Service.deleteFile(attachment.url);
        }

        await MessageReactions.deleteByMessageId(msg.id);
        await MessageAttachments.deleteByMessageId(msg.id);
        await Messages.delete(msg.id);
      }

      await ChatParticipants.deleteByChatId(chatInfo.chat_id);
      await ChatSettings.delete(chatInfo.chat_id);
      await Chats.delete(chatInfo.chat_id);

      return v1.main.sendResponse({
        status: 200,
        message: "Чат удален",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Загрузка файла
   */
  static async uploadFile(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      if (!req.file) {
        return v1.main.sendResponse({
          status: 400,
          message: "Файл не найден",
        });
      }

      // Проверка размера (4 ГБ)
      const maxSize = 4 * 1024 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return v1.main.sendResponse({
          status: 400,
          message: "Размер файла превышает допустимый (4 ГБ)",
        });
      }

      const result = await S3Service.uploadFile(req.file, userId);

      return v1.main.sendResponse({
        status: 200,
        message: "Файл успешно загружен",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Удаление файлов
   */
  static async deleteFiles(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { files } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return v1.main.sendResponse({
          status: 400,
          message: "Неверный формат списка файлов",
        });
      }

      const result = await S3Service.deleteFiles(files);

      return v1.main.sendResponse({
        status: 200,
        message: "Файлы обработаны",
        data: {
          deleted_count: result.deleted.length,
          errors: result.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Создание группы
   */
  static async createGroup(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { name, login, description, is_public, participants, avatar } =
        req.body;

      if (!name || !participants) {
        return v1.main.sendResponse({
          status: 400,
          message: "Название и участники обязательны",
        });
      }

      if (name.length > 50) {
        return v1.main.sendResponse({
          status: 400,
          message: "Название группы не должно превышать 50 символов",
        });
      }

      let finalLogin = login;
      if (finalLogin) {
        if (finalLogin.length > 30) {
          return v1.main.sendResponse({
            status: 400,
            message: "Логин группы не должен превышать 30 символов",
          });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(finalLogin)) {
          return v1.main.sendResponse({
            status: 400,
            message:
              "Логин может содержать только латинские буквы, цифры и подчеркивания",
          });
        }
        if (!finalLogin.endsWith("_g")) {
          finalLogin = finalLogin + "_g";
        }

        const existingChat = await Chats.findByLogin(finalLogin);
        if (existingChat) {
          return v1.main.sendResponse({
            status: 400,
            message: "Группа с таким логином уже существует",
          });
        }
      } else {
        finalLogin = RuSetController.generateHash(15) + "_g";
      }

      if (description && description.length > 200) {
        return v1.main.sendResponse({
          status: 400,
          message: "Описание не должно превышать 200 символов",
        });
      }

      if (!Array.isArray(participants) || participants.length === 0) {
        return v1.main.sendResponse({
          status: 400,
          message: "Необходимо выбрать хотя бы одного участника",
        });
      }

      const connection = await poolRuSet.getConnection();
      await connection.beginTransaction();

      try {
        let avatarUrl = null;

        if (avatar) {
          const avatarResult = await S3Service.uploadAvatar(
            avatar,
            userId,
            "group"
          );
          if (!avatarResult.success) {
            await connection.rollback();
            connection.release();
            return v1.main.sendResponse({
              status: 500,
              message: avatarResult.message,
            });
          }
          avatarUrl = avatarResult.url;
        }

        const chat = await Chats.create({
          type: "group",
          user_id: userId,
          name,
          login: finalLogin,
          description: description || null,
          avatar: avatarUrl || undefined,
        });

        await ChatParticipants.create({
          chat_id: chat.id,
          user_id: userId,
          role: "owner",
        });

        for (const participant of participants) {
          const participantId =
            typeof participant === "object" ? participant.id : participant;

          const userExists = await User.exists(participantId);
          if (!userExists || participantId === userId) continue;

          await ChatParticipants.create({
            chat_id: chat.id,
            user_id: participantId,
            role: "member",
          });
        }

        await ChatSettings.create({
          chat_id: chat.id,
          can_members_add_users: true,
          can_members_send_messages: true,
          can_members_delete_messages: false,
          can_members_add_reactions: true,
          is_public: is_public ?? true,
          join_by_link: is_public ?? true,
          approve_new_members: false,
          slow_mode: 0,
        });

        await connection.commit();
        connection.release();

        const groupInfo = await RuSetController.getGroupInfo(chat.id, userId);

        return v1.main.sendResponse({
          status: 200,
          message: "Группа успешно создана",
          data: groupInfo,
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Создание канала
   */
  static async createChannel(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { name, link, description, is_public, avatar } = req.body;

      if (!name) {
        return v1.main.sendResponse({
          status: 400,
          message: "Название канала обязательно",
        });
      }

      if (name.length > 50) {
        return v1.main.sendResponse({
          status: 400,
          message: "Название канала не должно превышать 50 символов",
        });
      }

      let finalLink = link;
      if (is_public && finalLink) {
        if (finalLink.length > 30) {
          return v1.main.sendResponse({
            status: 400,
            message: "Ссылка на канал не должна превышать 30 символов",
          });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(finalLink)) {
          return v1.main.sendResponse({
            status: 400,
            message:
              "Ссылка может содержать только латинские буквы, цифры и подчеркивания",
          });
        }
        if (!finalLink.endsWith("_c")) {
          finalLink = finalLink + "_c";
        }

        const existingChat = await Chats.findByLogin(finalLink);
        if (existingChat) {
          return v1.main.sendResponse({
            status: 400,
            message: "Канал с такой ссылкой уже существует",
          });
        }
      } else {
        finalLink = RuSetController.generateHash(15) + "_c";
      }

      if (description && description.length > 200) {
        return v1.main.sendResponse({
          status: 400,
          message: "Описание не должно превышать 200 символов",
        });
      }

      const connection = await poolRuSet.getConnection();
      await connection.beginTransaction();

      try {
        let avatarUrl = null;

        if (avatar) {
          const avatarResult = await S3Service.uploadAvatar(
            avatar,
            userId,
            "channel"
          );
          if (!avatarResult.success) {
            await connection.rollback();
            connection.release();
            return v1.main.sendResponse({
              status: 500,
              message: avatarResult.message,
            });
          }
          avatarUrl = avatarResult.url;
        }

        const chat = await Chats.create({
          type: "channel",
          user_id: userId,
          name,
          login: finalLink,
          description: description || null,
          avatar: avatarUrl || undefined,
        });

        await ChatParticipants.create({
          chat_id: chat.id,
          user_id: userId,
          role: "owner",
        });

        await ChatSettings.create({
          chat_id: chat.id,
          can_members_add_users: false,
          can_members_send_messages: false,
          can_members_delete_messages: false,
          can_members_add_reactions: true,
          is_public: is_public ?? true,
          join_by_link: is_public ?? true,
          approve_new_members: !(is_public ?? true),
          slow_mode: 0,
        });

        await connection.commit();
        connection.release();

        const channelInfo = await RuSetController.getChannelInfo(
          chat.id,
          userId
        );

        return v1.main.sendResponse({
          status: 200,
          message: "Канал успешно создан",
          data: channelInfo,
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Обновление аватара
   */
  static async updateAvatar(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { id } = req.params;
      const { avatar } = req.body;

      const chat = await Chats.findById(parseInt(id));
      if (!chat) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      const participant = await ChatParticipants.findByChatAndUser(
        parseInt(id),
        userId
      );

      if (!participant || !["owner", "admin"].includes(participant.role)) {
        return v1.main.sendResponse({
          status: 403,
          message: "Недостаточно прав для изменения аватара",
        });
      }

      if (!avatar) {
        return v1.main.sendResponse({
          status: 400,
          message: "Изображение не предоставлено",
        });
      }

      // Удаляем старый аватар
      if (chat.avatar) {
        await S3Service.deleteFile(chat.avatar);
      }

      const uploadResult = await S3Service.uploadAvatar(
        avatar,
        userId,
        chat.type
      );

      if (!uploadResult.success) {
        return v1.main.sendResponse({
          status: 500,
          message: uploadResult.message,
        });
      }

      await Chats.update(parseInt(id), { avatar: uploadResult.url });

      return v1.main.sendResponse({
        status: 200,
        message: "Аватар успешно обновлен",
        data: { avatar: uploadResult.url },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Поиск пользователей
   */
  static async searchUsers(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const query = req.query.query || "";

      if (!query.trim()) {
        return v1.main.sendResponse({
          status: 400,
          message: "Поисковый запрос не может быть пустым",
        });
      }

      let users;

      // Проверяем, является ли запрос телефоном
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (phoneRegex.test(query) && query.replace(/\D/g, "").length >= 7) {
        const cleanPhone = query.replace(/\D/g, "");
        users = await User.searchByPhone(cleanPhone, userId);
      } else {
        users = await User.search(query, userId);
      }

      const results = users.map((user) => ({
        id: user.id,
        username: user.username,
        login: user.login,
        phone: user.social?.phone || null,
        avatar: user.ico,
        isOnline: RuSetController.checkUserOnline(user.date_visit),
        verified: RuSetController.isUserVerified(user),
        description: user.info?.short || null,
      }));

      return v1.main.sendResponse({
        status: 200,
        message: "Поиск выполнен",
        data: {
          results,
          count: results.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Поиск чатов
   */
  static async searchChats(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const query = req.query.query || "";
      const type = req.query.type || "all";

      if (!query.trim()) {
        return v1.main.sendResponse({
          status: 400,
          message: "Поисковый запрос не может быть пустым",
        });
      }

      const types = type === "all" ? ["group", "channel"] : [type];
      const chats = await Chats.search(query, types);

      const results = [];

      for (const chat of chats) {
        const settings = await ChatSettings.findByChatId(chat.id);
        const participantsCount = await ChatParticipants.count(chat.id);
        const isParticipant = await ChatParticipants.findByChatAndUser(
          chat.id,
          userId
        );

        // Показываем только публичные чаты или те, где пользователь участник
        if (!settings?.is_public && !isParticipant) continue;

        results.push({
          id: chat.id,
          type: chat.type,
          name: chat.name,
          login: chat.login,
          description: chat.description,
          avatar: chat.avatar,
          participants_count: participantsCount,
          is_public: settings?.is_public ?? false,
          is_participant: !!isParticipant,
          link: chat.login ? `rs.whilet.ru/c/${chat.login}` : null,
        });
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Поиск выполнен",
        data: {
          results,
          count: results.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение контактов
   */
  static async getContacts(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const contactIds = await ChatParticipants.getContactUserIds(userId);
      const users = await User.findByIds(contactIds);

      const contacts = users
        .map((user) => ({
          id: user.id,
          username: user.username,
          login: user.login,
          avatar: user.ico,
          isOnline: RuSetController.checkUserOnline(user.date_visit),
          verified: RuSetController.isUserVerified(user),
        }))
        .sort((a, b) => a.username.localeCompare(b.username));

      return v1.main.sendResponse({
        status: 200,
        message: "Контакты получены",
        data: {
          contacts,
          count: contacts.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Добавление участников
   */
  static async addParticipants(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { id } = req.params;
      const { user_ids } = req.body;

      const chatInfo = await RuSetController.findChat(id, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (chatInfo.type === "private") {
        return v1.main.sendResponse({
          status: 400,
          message: "Нельзя добавлять участников в приватный чат",
        });
      }

      // Проверка прав
      const settings = await ChatSettings.findByChatId(chatInfo.chat_id);
      const participant = chatInfo.participant;

      let canAdd = false;
      if (["owner", "admin"].includes(participant.role)) {
        canAdd = true;
      } else if (settings?.can_members_add_users) {
        canAdd = true;
      }

      if (!canAdd) {
        return v1.main.sendResponse({
          status: 403,
          message: "У вас нет прав на добавление участников",
        });
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return v1.main.sendResponse({
          status: 400,
          message: "Необходимо указать хотя бы одного пользователя",
        });
      }

      const added = [];
      const errors = [];

      for (const participantId of user_ids) {
        const user = await User.findById(participantId);
        if (!user) {
          errors.push(`Пользователь с ID ${participantId} не найден`);
          continue;
        }

        const existingParticipant = await ChatParticipants.findByChatAndUser(
          chatInfo.chat_id,
          participantId
        );

        if (existingParticipant) {
          errors.push(`${user.username} уже является участником`);
          continue;
        }

        const role = chatInfo.type === "channel" ? "subscriber" : "member";

        await ChatParticipants.create({
          chat_id: chatInfo.chat_id,
          user_id: participantId,
          role,
        });

        added.push({
          id: user.id,
          username: user.username,
          login: user.login,
          avatar: user.ico,
        });
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Участники добавлены",
        data: {
          added,
          added_count: added.length,
          errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Присоединение к чату
   */
  static async joinChat(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { login } = req.params;

      if (!login.endsWith("_g") && !login.endsWith("_c")) {
        return v1.main.sendResponse({
          status: 400,
          message: "Неверный формат ссылки",
        });
      }

      const chat = await Chats.findByLogin(login);

      if (!chat || !["group", "channel"].includes(chat.type)) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      const settings = await ChatSettings.findByChatId(chat.id);

      if (!settings?.is_public || !settings?.join_by_link) {
        return v1.main.sendResponse({
          status: 403,
          message: "Этот чат недоступен для присоединения по ссылке",
        });
      }

      const existingParticipant = await ChatParticipants.findByChatAndUser(
        chat.id,
        userId
      );

      if (existingParticipant) {
        return v1.main.sendResponse({
          status: 400,
          message: "Вы уже являетесь участником этого чата",
        });
      }

      const role = chat.type === "channel" ? "subscriber" : "member";

      await ChatParticipants.create({
        chat_id: chat.id,
        user_id: userId,
        role,
      });

      const chatInfo =
        chat.type === "group"
          ? await RuSetController.getGroupInfo(chat.id, userId)
          : await RuSetController.getChannelInfo(chat.id, userId);

      return v1.main.sendResponse({
        status: 200,
        message: "Вы успешно присоединились",
        data: chatInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Проверка новых сообщений
   */
  static async checkMessages(req, res, next) {
    try {
      const v1 = new Vostok1(req, res, next);
      await v1.security.checkUserRequestAccess(req, res, next);

      const userId = await v1.auth.getCurrentUserID();
      if (!userId) {
        return v1.main.sendResponse({
          status: 401,
          message: "Требуется авторизация",
        });
      }

      const { id } = req.params;
      const since = req.query.since
        ? new Date(req.query.since)
        : new Date(Date.now() - 60000);

      const chatInfo = await RuSetController.findChat(id, userId);

      if (chatInfo.error) {
        return v1.main.sendResponse({
          status: chatInfo.code,
          message: chatInfo.error,
        });
      }

      if (!chatInfo.chat_id) {
        return v1.main.sendResponse({
          status: 404,
          message: "Чат не найден",
        });
      }

      const updates = await Updates.findRecent(chatInfo.chat_id, since);

      return v1.main.sendResponse({
        status: 200,
        message: "Проверка выполнена",
        data: {
          updates,
          hasUpdates: updates.length > 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export { RuSetController };
