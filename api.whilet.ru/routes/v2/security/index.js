import { Vostok1 } from "#modules/Vostok1/index";
import { poolSecurity } from "#db/index";
import express from "express";
import { generateTOTP, timeRemaining, parseOtpAuthUri } from "./utils/totp.js";

export const app = express();

app.post("/service/add", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    v1.main.checkHasData(["name", "login", "secret_key"]);

    const { name, login, secret_key, algorithm, digits, period } = req.body;
    const userId = await v1.auth.getCurrentUserID();

    if (name.length > 255 || login.length > 255 || secret_key.length > 255) {
      v1.main.sendResponse({
        status: 201,
        message: "Данные должны быть < 256 символов",
      });
    }

    const encryptedLogin = v1.security.wHyperEncryptionTo(login);
    const encryptedSecretKey = v1.security.wHyperEncryptionTo(secret_key);

    const metadata = JSON.stringify({
      algorithm: algorithm || "sha1",
      digits: digits || 6,
      period: period || 30,
    });

    await poolSecurity.execute(
      "INSERT INTO `services`(`user_id`, `name`, `login`, `secret_key`, `metadata`) VALUES (?,?,?,?,?)",
      [userId, name, encryptedLogin, encryptedSecretKey, metadata]
    );

    v1.main.sendResponse({
      status: 201,
      message: "Сервис успешно добавлен",
    });
  } catch (error) {
    console.error("Database error:", error);
    next(error);
  }
});

app.post("/password/add", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    v1.main.checkHasData(["name", "login", "password"]);

    const { name, login, password } = req.body;
    const userId = await v1.auth.getCurrentUserID();

    if (name.length > 255 || login.length > 255 || password.length > 255) {
      v1.main.sendResponse({
        status: 201,
        message: "Данные должны быть < 256 символов",
      });
    }

    const encryptedLogin = v1.security.wHyperEncryptionTo(login);
    const encryptedPassword = v1.security.wHyperEncryptionTo(password);

    await poolSecurity.execute(
      "INSERT INTO `passwords`(`user_id`, `name`, `login`, `password`) VALUES (?,?,?,?)",
      [userId, name, encryptedLogin, encryptedPassword]
    );

    v1.main.sendResponse({
      status: 201,
      message: "Пароль успешно добавлен",
    });
  } catch (error) {
    console.error("Database error:", error);
    next(error);
  }
});

app.post("/service/import", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    v1.main.checkHasData(["otpauth"]);

    const { otpauth, customName } = req.body;
    const userId = await v1.auth.getCurrentUserID();

    const parsed = parseOtpAuthUri(otpauth);

    if (!parsed || !parsed.secret) {
      return v1.main.sendResponse({
        status: 400,
        message: "Неверный формат otpauth URI или отсутствует секретный ключ",
      });
    }

    const serviceName =
      customName || parsed.issuer || parsed.account || "Imported Service";
    const login = parsed.account || "";

    const encryptedLogin = v1.security.wHyperEncryptionTo(login);
    const encryptedSecretKey = v1.security.wHyperEncryptionTo(parsed.secret);

    const metadata = JSON.stringify({
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
    });

    await poolSecurity.execute(
      "INSERT INTO `services`(`user_id`, `name`, `login`, `secret_key`, `metadata`) VALUES (?,?,?,?,?)",
      [userId, serviceName, encryptedLogin, encryptedSecretKey, metadata]
    );

    v1.main.sendResponse({
      status: 201,
      message: "Сервис успешно импортирован",
      data: {
        name: serviceName,
        login: login,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        period: parsed.period,
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    next(error);
  }
});

app.get("/services", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();
    const [results] = await poolSecurity.execute(
      "SELECT * FROM `services` WHERE `user_id` = ?",
      [userId]
    );

    let servicesData = [];

    results.forEach((element) => {
      let metadata = { algorithm: "sha1", digits: 6, period: 30 };
      try {
        if (element.metadata) {
          metadata = JSON.parse(element.metadata);
        }
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }

      servicesData.push({
        ...element,
        login: v1.security.wHyperEncryptionFrom(element.login),
        secret_key: null,
        algorithm: metadata.algorithm,
        digits: metadata.digits,
        period: metadata.period,
      });
    });

    v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: servicesData,
    });
  } catch (error) {
    console.error("Decryption error:", error);
    next(error);
  }
});

app.get("/passwords", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();
    const [results] = await poolSecurity.execute(
      "SELECT * FROM `passwords` WHERE `user_id` = ?",
      [userId]
    );

    let servicesData = [];

    results.forEach((element) => {
      servicesData.push({
        ...element,
        login: v1.security.wHyperEncryptionFrom(element.login),
        secret_key: v1.security.wHyperEncryptionFrom(element.passwords),
      });
    });

    v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: servicesData,
    });
  } catch (error) {
    console.error("Decryption error:", error);
    next(error);
  }
});

app.get("/service/:id", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();
    const [rows] = await poolSecurity.execute(
      "SELECT * FROM `services` WHERE `id` = ? AND `user_id` = ?",
      [req.params.id, userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Сервис не найден" });
    }

    const service = rows[0];

    let metadata = { algorithm: "sha1", digits: 6, period: 30 };
    try {
      if (service.metadata) {
        metadata = JSON.parse(service.metadata);
      }
    } catch (e) {
      console.error("Error parsing metadata:", e);
    }

    const decryptedSecretKey = v1.security.wHyperEncryptionFrom(
      service.secret_key
    );

    const code = generateTOTP(decryptedSecretKey, {
      algorithm: metadata.algorithm,
      digits: metadata.digits,
      step: metadata.period,
    });
    const time = timeRemaining(metadata.period);

    v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: { code, timeRemaining: time },
    });
  } catch (error) {
    console.error("Decryption error:", error);
    next(error);
  }
});

app.get("/password/:id", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();
    const [rows] = await poolSecurity.execute(
      "SELECT * FROM `passwords` WHERE `id` = ? AND `user_id` = ?",
      [req.params.id, userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Пароль не найден" });
    }

    const service = rows[0];

    const decryptedSecretKey = v1.security.wHyperEncryptionFrom(
      service.password
    );
    const decryptedLogin = v1.security.wHyperEncryptionFrom(service.login);

    v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: {
        name: service.name,
        login: decryptedLogin,
        password: decryptedSecretKey,
      },
    });
  } catch (error) {
    console.error("Decryption error:", error);
    next(error);
  }
});

app.delete("/password/:id", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();

    const [rows] = await poolSecurity.execute(
      "SELECT * FROM `passwords` WHERE `id` = ? AND `user_id` = ?",
      [req.params.id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Пароль не найден",
      });
    }

    await poolSecurity.execute(
      "DELETE FROM `passwords` WHERE `id` = ? AND `user_id` = ?",
      [req.params.id, userId]
    );

    v1.main.sendResponse({
      status: 200,
      message: "Пароль успешно удален",
    });
  } catch (error) {
    console.error("Delete error:", error);
    next(error);
  }
});

app.delete("/service/:id", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();

    const [rows] = await poolSecurity.execute(
      "SELECT * FROM `services` WHERE `id` = ? AND `user_id` = ?",
      [req.params.id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Сервис не найден",
      });
    }

    await poolSecurity.execute(
      "DELETE FROM `services` WHERE `id` = ? AND `user_id` = ?",
      [req.params.id, userId]
    );

    v1.main.sendResponse({
      status: 200,
      message: "Сервис успешно удален",
    });
  } catch (error) {
    console.error("Delete error:", error);
    next(error);
  }
});

export default app;
