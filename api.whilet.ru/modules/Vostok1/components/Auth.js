import jwt from "jsonwebtoken";
import { poolProfile } from "#db/index";

export class Auth {
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    this.JWT_KEY = process.env.JWT_KEY;
    this.pool = poolProfile;
  }

  setDependencies(dependencies) {
    this.security = dependencies.security;
    this.logger = dependencies.logger;
    this.main = dependencies.main;
  }

  async checkSession(props = null) {
    const bt = this.getBearerToken();

    if (!this.getCookie("WTOKEN") && !bt) {
      return false;
    }

    const token = this.getCookie("WTOKEN") || bt;

    try {
      if (token.length > 10000) {
        this.logger.recordLog(`Токен слишком большой: ${token.length} байт`);
        return false;
      }

      const decodedToken = jwt.verify(token, this.JWT_KEY);

      const userIdData = this.security.wR1715From(decodedToken.data);
      const parsedData = JSON.parse(userIdData);
      const userIdToken = parsedData.id;
      const tokenData = parsedData.token;

      // if (await this.security.checkBlockUser(userIdToken)) {
      //     const blockInfo = await this.security.getUserBlockInfo(userIdToken);
      //     this.main.sendResponse(
      //         423,
      //         "Доступ временно ограничен",
      //         blockInfo
      //     );
      //     return false;
      // }

      const [users] = await poolProfile.execute(
        "SELECT id, token, status FROM users WHERE id = ? AND token = ?",
        [userIdToken, tokenData]
      );

      if (!users || users.length === 0) {
        return false;
      }

      const user = users[0];

      const statusData =
        typeof user.status === "string" ? JSON.parse(user.status) : user.status;

      const statusName = statusData?.name;

      if (!statusName) {
        return false;
      }
      return true;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        this.logger.recordLog(`Токен устарел: ${error.message}`);
      } else if (error.name === "JsonWebTokenError") {
        this.logger.recordLog(`Ошибка JWT токена: ${error.message}`);
      } else {
        this.logger.recordLog(
          `Ошибка получения данных об авторизации из JWT-токена: ${error.message}`
        );
      }
      return false;
    }
  }

  async getCurrentTokenData() {
    const bt = this.getBearerToken();

    if (!this.getCookie("WTOKEN") && !bt) {
      return false;
    }

    const token = this.getCookie("WTOKEN") || bt;

    try {
      if (token.length > 10000) {
        this.logger.recordLog(`Токен слишком большой: ${token.length} байт`);
        return false;
      }

      const decodedToken = jwt.verify(token, this.JWT_KEY);

      const userData = this.security.wR1715From(decodedToken.data);
      const parsedData = JSON.parse(userData);

      return parsedData;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        this.logger.recordLog(`Токен устарел: ${error.message}`);
      } else if (error.name === "JsonWebTokenError") {
        this.logger.recordLog(`Ошибка JWT токена: ${error.message}`);
      } else {
        this.logger.recordLog(
          `Ошибка получения данных об авторизации из JWT-токена: ${error.message}`
        );
      }
      return false;
    }
  }
  async getCurrentUserID() {
    const bt = this.getBearerToken();

    if (!this.getCookie("WTOKEN") && !bt) {
      return false;
    }

    const token = this.getCookie("WTOKEN") || bt;

    try {
      if (token.length > 10000) {
        this.logger.recordLog(`Токен слишком большой: ${token.length} байт`);
        return false;
      }

      const decodedToken = jwt.verify(token, this.JWT_KEY);

      const userIdData = this.security.wR1715From(decodedToken.data);
      const parsedData = JSON.parse(userIdData);
      const userIdToken = parsedData.id;
      const tokenData = parsedData.token;

      const [users] = await poolProfile.execute(
        "SELECT id, token FROM users WHERE id = ? AND token = ?",
        [userIdToken, tokenData]
      );

      if (!users || users.length === 0) {
        return false;
      }

      const user = users[0];

      return user.id;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        this.logger.recordLog(`Токен устарел: ${error.message}`);
      } else if (error.name === "JsonWebTokenError") {
        this.logger.recordLog(`Ошибка JWT токена: ${error.message}`);
      } else {
        this.logger.recordLog(
          `Ошибка получения данных об авторизации из JWT-токена: ${error.message}`
        );
      }
      return false;
    }
  }
  async getCurrentUserStatus() {
    const bt = this.getBearerToken();

    if (!this.getCookie("WTOKEN") && !bt) {
      return false;
    }

    const token = this.getCookie("WTOKEN") || bt;

    try {
      if (token.length > 10000) {
        this.logger.recordLog(`Токен слишком большой: ${token.length} байт`);
        return false;
      }

      const decodedToken = jwt.verify(token, this.JWT_KEY);

      const userIdData = this.security.wR1715From(decodedToken.data);
      const parsedData = JSON.parse(userIdData);
      const userIdToken = parsedData.id;
      const tokenData = parsedData.token;

      const [users] = await poolProfile.execute(
        "SELECT id, token, status FROM users WHERE id = ? AND token = ?",
        [userIdToken, tokenData]
      );

      if (!users || users.length === 0) {
        return false;
      }

      const user = users[0];

      return user.status;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        this.logger.recordLog(`Токен устарел: ${error.message}`);
      } else if (error.name === "JsonWebTokenError") {
        this.logger.recordLog(`Ошибка JWT токена: ${error.message}`);
      } else {
        this.logger.recordLog(
          `Ошибка получения данных об авторизации из JWT-токена: ${error.message}`
        );
      }
      return false;
    }
  }

  async getCurrentUser() {
    const bt = this.getBearerToken();

    if (!this.getCookie("WTOKEN") && !bt) {
      return false;
    }

    const token = this.getCookie("WTOKEN") || bt;

    try {
      if (token.length > 10000) {
        this.logger.recordLog(`Токен слишком большой: ${token.length} байт`);
        return false;
      }

      const decodedToken = jwt.verify(token, this.JWT_KEY);

      const userIdData = this.security.wR1715From(decodedToken.data);
      const parsedData = JSON.parse(userIdData);
      const userIdToken = parsedData.id;
      const tokenData = parsedData.token;

      const [users] = await poolProfile.execute(
        "SELECT * FROM users WHERE id = ? AND token = ?",
        [userIdToken, tokenData]
      );

      if (!users || users.length === 0) {
        return false;
      }

      const user = users[0];

      return user;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        this.logger.recordLog(`Токен устарел: ${error.message}`);
      } else if (error.name === "JsonWebTokenError") {
        this.logger.recordLog(`Ошибка JWT токена: ${error.message}`);
      } else {
        this.logger.recordLog(
          `Ошибка получения данных об авторизации из JWT-токена: ${error.message}`
        );
      }
      return false;
    }
  }

  getBearerToken() {
    const authHeader = this.req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    return null;
  }

  getCookie(name) {
    const cookies = this.req.cookies || {};
    const cookieValue = cookies[name];
    return cookieValue && cookieValue !== "" ? cookieValue : null;
  }

  checkPermissions(statusName, props) {
    if (!statusName || !props) {
      return false;
    }
    const permissionMap = {
      admin: ["whilet", "администратор"],
      moderator: ["whilet", "администратор", "модератор"],
      vip: ["vip", "vip 1", "vip 2", "vip 3", "vip 4", "vip 5"],
      org: ["org 1", "org 2", "org 3", "org 4", "org 5"],
    };

    const specificStatuses = [
      "vip 1",
      "vip 2",
      "vip 3",
      "vip 4",
      "vip 5",
      "org 1",
      "org 2",
      "org 3",
      "org 4",
      "org 5",
      "whilet",
    ];

    const statusNameLower = statusName.toLowerCase();
    const propsLower = props.toLowerCase();

    if (specificStatuses.includes(propsLower)) {
      return statusNameLower === propsLower;
    }

    if (permissionMap[propsLower]) {
      return permissionMap[propsLower].includes(statusNameLower);
    }

    return false;
  }

  setJWTToken(data = {}) {
    const JWT_KEY = process.env.JWT_KEY;

    const payloadJWT = {
      iss: "https://whilet.ru",
      aud: "https://whilet.ru",
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60,
      secure: true,
      httponly: true,
      samesite: "Strict",
      data: this.security.wR1715To(JSON.stringify(data)),
    };

    try {
      const token = jwt.sign(payloadJWT, JWT_KEY, { algorithm: "HS256" });
      return token;
    } catch (error) {
      this.logger.recordLog(`Ошибка создания JWT-токена: ${error.message}`);
      return null;
    }
  }
  setNewCookie(name, text) {
    const domain =
      process.env.NODE_ENV === "development"
        ? this.main.extractDomain(this.req.headers.host)
        : ".whilet.ru";

    const cookieOptions = {
      maxAge: 60 * 24 * 360 * 1000,
      path: "/",
      domain: domain,
      secure: true,
      httpOnly: true,
      sameSite: "none",
    };

    this.res.cookie(name, text, cookieOptions);
  }
}
