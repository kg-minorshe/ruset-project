import { poolRuSet, poolProfile } from "#db/index";

const Chats = {
  async findById(id) {
    const [rows] = await poolRuSet.query("SELECT * FROM chats WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  },

  async findByLogin(login) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM chats WHERE login = ?",
      [login]
    );
    return rows[0] || null;
  },

  async findByLoginAndType(login, type) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM chats WHERE login = ? AND type = ?",
      [login, type]
    );
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO chats (user_id, type, name, login, description, avatar, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.user_id,
        data.type,
        data.name || null,
        data.login || null,
        data.description || null,
        data.avatar || null,
      ]
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push("updated_at = NOW()");
    values.push(id);

    await poolRuSet.query(
      `UPDATE chats SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  },

  async delete(id) {
    await poolRuSet.query("DELETE FROM chats WHERE id = ?", [id]);
  },

  async search(query, types = ["group", "channel"]) {
    const placeholders = types.map(() => "?").join(", ");
    const [rows] = await poolRuSet.query(
      `SELECT * FROM chats 
       WHERE (name LIKE ? OR login LIKE ?) 
       AND type IN (${placeholders})
       LIMIT 20`,
      [`%${query}%`, `%${query}%`, ...types]
    );
    return rows;
  },
};

const ChatParticipants = {
  async findByChatAndUser(chatId, userId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM chat_participants WHERE chat_id = ? AND user_id = ?",
      [chatId, userId]
    );
    return rows[0] || null;
  },

  async findByChatId(chatId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM chat_participants WHERE chat_id = ?",
      [chatId]
    );
    return rows;
  },

  async findByUserId(userId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM chat_participants WHERE user_id = ?",
      [userId]
    );
    return rows;
  },

  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO chat_participants (chat_id, user_id, role, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())`,
      [data.chat_id, data.user_id, data.role]
    );
    return { id: result.insertId, ...data };
  },

  async updateRole(chatId, userId, role) {
    await poolRuSet.query(
      "UPDATE chat_participants SET role = ?, updated_at = NOW() WHERE chat_id = ? AND user_id = ?",
      [role, chatId, userId]
    );
  },

  async delete(chatId, userId) {
    await poolRuSet.query(
      "DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?",
      [chatId, userId]
    );
  },

  async deleteByChatId(chatId) {
    await poolRuSet.query("DELETE FROM chat_participants WHERE chat_id = ?", [
      chatId,
    ]);
  },

  async count(chatId) {
    const [rows] = await poolRuSet.query(
      "SELECT COUNT(*) as count FROM chat_participants WHERE chat_id = ?",
      [chatId]
    );
    return rows[0]?.count || 0;
  },

  async findCommonPrivateChat(userId1, userId2) {
    const [rows] = await poolRuSet.query(
      `SELECT cp1.* FROM chat_participants cp1
       JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
       JOIN chats c ON c.id = cp1.chat_id
       WHERE cp1.user_id = ? AND cp2.user_id = ? AND c.type = 'private'`,
      [userId1, userId2]
    );
    return rows[0] || null;
  },

  async getContactUserIds(userId) {
    const [rows] = await poolRuSet.query(
      `SELECT DISTINCT cp.user_id FROM chat_participants cp
       JOIN chat_participants cp2 ON cp.chat_id = cp2.chat_id
       JOIN chats c ON c.id = cp.chat_id
       WHERE cp2.user_id = ? AND cp.user_id != ? AND c.type = 'private'`,
      [userId, userId]
    );
    return rows.map((r) => r.user_id);
  },
};

const ChatSettings = {
  async findByChatId(chatId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM chat_settings WHERE chat_id = ?",
      [chatId]
    );
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO chat_settings 
       (chat_id, can_members_add_users, can_members_send_messages, can_members_delete_messages, 
        can_members_add_reactions, is_public, join_by_link, approve_new_members, slow_mode, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.chat_id,
        data.can_members_add_users ?? true,
        data.can_members_send_messages ?? true,
        data.can_members_delete_messages ?? false,
        data.can_members_add_reactions ?? true,
        data.is_public ?? true,
        data.join_by_link ?? true,
        data.approve_new_members ?? false,
        data.slow_mode ?? 0,
      ]
    );
    return { id: result.insertId, ...data };
  },

  async update(chatId, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push("updated_at = NOW()");
    values.push(chatId);

    await poolRuSet.query(
      `UPDATE chat_settings SET ${fields.join(", ")} WHERE chat_id = ?`,
      values
    );
  },

  async delete(chatId) {
    await poolRuSet.query("DELETE FROM chat_settings WHERE chat_id = ?", [
      chatId,
    ]);
  },
};

const Messages = {
  async findById(id) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM messages WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  async findByChatId(chatId, options = {}) {
    const limit = options.limit || 50;
    const beforeId = options.beforeId || Number.MAX_SAFE_INTEGER;
    const userId = options.userId || null;

    if (userId) {
      const [rows] = await poolRuSet.query(
        `SELECT m.*,
                CASE
                  WHEN m.user_id = ? THEN 1
                  WHEN mv.id IS NOT NULL THEN 1
                  ELSE 0
                END AS is_read
         FROM messages m
         LEFT JOIN message_views mv ON mv.message_id = m.id AND mv.user_id = ?
         WHERE m.chat_id = ? AND m.id < ?
         ORDER BY m.id DESC
         LIMIT ?`,
        [userId, userId, chatId, beforeId, limit + 1]
      );
      return rows;
    }

    const [rows] = await poolRuSet.query(
      `SELECT * FROM messages
       WHERE chat_id = ? AND id < ?
       ORDER BY id DESC
       LIMIT ?`,
      [chatId, beforeId, limit + 1]
    );
    return rows;
  },

  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO messages (chat_id, user_id, text, reply_to, is_edited, is_pinned, is_read, created_at, updated_at) 
       VALUES (?, ?, ?, ?, false, ?, ?, NOW(), NOW())`,
      [
        data.chat_id,
        data.user_id,
        data.text || null,
        data.reply_to || null,
        data.is_pinned ?? false,
        data.is_read ?? false,
      ]
    );
    return { id: result.insertId, ...data, created_at: new Date() };
  },

  async update(id, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push("updated_at = NOW()");
    values.push(id);

    await poolRuSet.query(
      `UPDATE messages SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  },

  async delete(id) {
    await poolRuSet.query("DELETE FROM messages WHERE id = ?", [id]);
  },

  async deleteByChatId(chatId) {
    await poolRuSet.query("DELETE FROM messages WHERE chat_id = ?", [chatId]);
  },

  async count(chatId) {
    const [rows] = await poolRuSet.query(
      "SELECT COUNT(*) as count FROM messages WHERE chat_id = ?",
      [chatId]
    );
    return rows[0]?.count || 0;
  },

  async countUnread(chatId, excludeUserId) {
    const [rows] = await poolRuSet.query(
      `SELECT COUNT(DISTINCT m.id) as count
       FROM messages m
       LEFT JOIN message_views mv ON mv.message_id = m.id AND mv.user_id = ?
       WHERE m.chat_id = ? AND m.user_id != ? AND mv.id IS NULL`,
      [excludeUserId, chatId, excludeUserId]
    );
    return rows[0]?.count || 0;
  },

  async markAsRead(chatId, excludeUserId) {
    await poolRuSet.query(
      `INSERT INTO message_views (message_id, user_id, viewed_at)
       SELECT m.id, ?, UNIX_TIMESTAMP()
       FROM messages m
       LEFT JOIN message_views mv ON mv.message_id = m.id AND mv.user_id = ?
       WHERE m.chat_id = ? AND m.user_id != ? AND mv.id IS NULL`,
      [excludeUserId, excludeUserId, chatId, excludeUserId]
    );
  },

  async getLastMessage(chatId, userId = null) {
    if (userId) {
      const [rows] = await poolRuSet.query(
        `SELECT m.*,
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
        [userId, userId, chatId]
      );
      return rows[0] || null;
    }

    const [rows] = await poolRuSet.query(
      "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1",
      [chatId]
    );
    return rows[0] || null;
  },

  async getByChatId(chatId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM messages WHERE chat_id = ?",
      [chatId]
    );
    return rows;
  },
};

const MessageAttachments = {
  async findByMessageId(messageId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM message_attachments WHERE message_id = ?",
      [messageId]
    );
    return rows;
  },

  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO message_attachments (message_id, name, type, url, size, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [data.message_id, data.name, data.type, data.url, data.size]
    );
    return { id: result.insertId, ...data };
  },

  async delete(id) {
    await poolRuSet.query("DELETE FROM message_attachments WHERE id = ?", [id]);
  },

  async deleteByMessageId(messageId) {
    await poolRuSet.query(
      "DELETE FROM message_attachments WHERE message_id = ?",
      [messageId]
    );
  },
};

const MessageReactions = {
  async findByMessageId(messageId) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM message_reactions WHERE message_id = ?",
      [messageId]
    );
    return rows;
  },

  async findByUserAndMessage(userId, messageId, emoji) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM message_reactions WHERE user_id = ? AND message_id = ? AND emoji = ?",
      [userId, messageId, emoji]
    );
    return rows[0] || null;
  },

  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())`,
      [data.message_id, data.user_id, data.emoji]
    );
    return { id: result.insertId, ...data };
  },

  async delete(id) {
    await poolRuSet.query("DELETE FROM message_reactions WHERE id = ?", [id]);
  },

  async deleteByMessageId(messageId) {
    await poolRuSet.query(
      "DELETE FROM message_reactions WHERE message_id = ?",
      [messageId]
    );
  },
};

const Updates = {
  async create(data) {
    const [result] = await poolRuSet.query(
      `INSERT INTO updates (chat_id, message_id, user_id, type, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [data.chat_id, data.message_id, data.user_id, data.type]
    );
    return { id: result.insertId, ...data };
  },

  async findRecent(chatId, since) {
    const [rows] = await poolRuSet.query(
      "SELECT * FROM updates WHERE chat_id = ? AND created_at > ? ORDER BY created_at DESC",
      [chatId, since]
    );
    return rows;
  },
};

const User = {
  async findById(id) {
    const [rows] = await poolProfile.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
    const user = rows[0];
    if (user) {
      user.info =
        typeof user.info === "string" ? JSON.parse(user.info) : user.info || {};
      user.status =
        typeof user.status === "string"
          ? JSON.parse(user.status)
          : user.status || {};
      user.social =
        typeof user.social === "string"
          ? JSON.parse(user.social)
          : user.social || {};
    }
    return user || null;
  },

  async findByLogin(login) {
    const [rows] = await poolProfile.query(
      "SELECT * FROM users WHERE login = ?",
      [login]
    );
    const user = rows[0];
    if (user) {
      user.info =
        typeof user.info === "string" ? JSON.parse(user.info) : user.info || {};
      user.status =
        typeof user.status === "string"
          ? JSON.parse(user.status)
          : user.status || {};
      user.social =
        typeof user.social === "string"
          ? JSON.parse(user.social)
          : user.social || {};
    }
    return user || null;
  },

  async search(query, excludeUserId, limit = 20) {
    const [rows] = await poolProfile.query(
      `SELECT * FROM users 
       WHERE id != ? AND (login LIKE ? OR username LIKE ?)
       LIMIT ?`,
      [excludeUserId, `%${query}%`, `%${query}%`, limit]
    );
    return rows.map((user) => {
      user.info =
        typeof user.info === "string" ? JSON.parse(user.info) : user.info || {};
      user.status =
        typeof user.status === "string"
          ? JSON.parse(user.status)
          : user.status || {};
      user.social =
        typeof user.social === "string"
          ? JSON.parse(user.social)
          : user.social || {};
      return user;
    });
  },

  async searchByPhone(phone, excludeUserId, limit = 20) {
    const [rows] = await poolProfile.query(
      `SELECT * FROM users 
       WHERE id != ? AND JSON_EXTRACT(social, '$.phone') LIKE ?
       LIMIT ?`,
      [excludeUserId, `%${phone}%`, limit]
    );
    return rows.map((user) => {
      user.info =
        typeof user.info === "string" ? JSON.parse(user.info) : user.info || {};
      user.status =
        typeof user.status === "string"
          ? JSON.parse(user.status)
          : user.status || {};
      user.social =
        typeof user.social === "string"
          ? JSON.parse(user.social)
          : user.social || {};
      return user;
    });
  },

  async findByIds(ids) {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await poolProfile.query(
      `SELECT * FROM users WHERE id IN (${placeholders})`,
      ids
    );
    return rows.map((user) => {
      user.info =
        typeof user.info === "string" ? JSON.parse(user.info) : user.info || {};
      user.status =
        typeof user.status === "string"
          ? JSON.parse(user.status)
          : user.status || {};
      user.social =
        typeof user.social === "string"
          ? JSON.parse(user.social)
          : user.social || {};
      return user;
    });
  },

  async exists(id) {
    const [rows] = await poolProfile.query(
      "SELECT 1 FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows.length > 0;
  },
};

export {
  Chats,
  ChatParticipants,
  ChatSettings,
  Messages,
  MessageAttachments,
  MessageReactions,
  Updates,
  User,
};
