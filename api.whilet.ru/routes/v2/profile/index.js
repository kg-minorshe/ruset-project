import { Vostok1 } from "#modules/Vostok1/index";
import { poolProfile } from "#db/index";
import express from "express";

const app = express();

app.get("/checkSession", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    const result = await v1.auth.checkSession();
    const device_id = v1.security.generateDeviceId();
    const dataToken = await v1.auth.getCurrentTokenData();
    const successDeviceAccess = device_id === dataToken.device_id;

    v1.main.sendResponse({
      status: result && successDeviceAccess ? 200 : 403,
      message:
        result && successDeviceAccess
          ? "Сессия пользователя успешно проверена"
          : !successDeviceAccess
          ? "Предотвращено системой Восток-1"
          : "Требуется аутентификация для доступа к ресурсу",
      data:
        result && successDeviceAccess
          ? {
              status: v1.main.decodeArrays(
                await v1.auth.getCurrentUserStatus()
              ),
              last_visit: v1.main.getCurrentDateTime(),
            }
          : null,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/getDeviceId", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    const device_id = v1.security.generateDeviceId();
    v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: device_id,
    });
  } catch (error) {
    next(error);
  }
});
app.post("/login", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    v1.main.checkHasData(["login", "password"]);

    const login = req.body.login;
    const password = req.body.password;
    const email = v1.security.wR1715To(login);

    const [users] = await poolProfile.execute(
      `SELECT * FROM users 
       WHERE login = ? 
       OR social->>'$.email' = ? 
       OR social->>'$.additional_email' = ? 
       LIMIT 1`,
      [login, email, email]
    );

    const user = users[0] || null;
    if (!user) {
      v1.main.sendResponse({
        status: 401,
        message: "Неверный логин или пароль",
      });
    }

    const user_id = user["id"];
    const user_token = user["token"];
    if (
      v1.security.wR1715To(password) !== JSON.parse(user["password"])["value"]
    ) {
      v1.main.sendResponse({
        status: 401,
        message: "Неверный логин или пароль",
      });
      return;
    }

    const JWT_Token = v1.auth.setJWTToken({
      id: user_id,
      token: user_token,
      device_id: v1.security.generateDeviceId(),
      date: v1.main.getCurrentDateTime(),
    });
    v1.auth.setNewCookie("WTOKEN", JWT_Token);

    v1.main.sendResponse({
      status: 200,
      message: "Вход выполнен успешно",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/get/account", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const userId = await v1.auth.getCurrentUserID();
    const user = await v1.auth.getCurrentUser();

    if (!user) {
      return v1.main.sendResponse({
        status: 404,
        message: "Пользователь не найден",
      });
    }

    processEncryptedFields(user, v1);

    const forbiddenFields = ["password", "token"];
    const scope = req.query.scope;

    user.password_null_default = user.password?.null_default;
    user.password_confirmation_code = user.password?.confirmation_code;

    if (scope) {
      const requestedFields = scope.split(",").map((field) => field.trim());
      const result = {};

      for (const field of requestedFields) {
        if (forbiddenFields.includes(field)) {
          continue;
        }
        if (user[field] !== undefined) {
          result[field] = user[field];
        }
      }

      return v1.main.sendResponse({
        status: 200,
        message: "Запрос выполнен успешно",
        data: result,
      });
    }

    v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

function processEncryptedFields(user, v1) {
  if (!user) return;

  const fieldsToDecode = [
    "phone",
    "email",
    "additional_email",
    "public_email",
    "public_site",
    "public_phone",
    "public_tg",
    "public_vk",
    "public_setka",
    "tg",
    "vk",
  ];

  const idFieldsToDecode = ["vk", "github", "yandex"];

  // Обрабатываем social поля
  if (user.social) {
    let socialData = user.social;

    if (typeof socialData === "string") {
      socialData = JSON.parse(socialData) || {};
    }

    for (const field of fieldsToDecode) {
      if (socialData[field] && socialData[field] !== "") {
        socialData[field] = v1.security.wR1715To(socialData[field]);
      }
    }

    user.social = socialData;
  }

  // Обрабатываем idAll поля
  if (user.idAll) {
    let idData = user.idAll;

    if (typeof idData === "string") {
      idData = JSON.parse(idData) || {};
    }

    for (const field of idFieldsToDecode) {
      if (
        idData[field] !== undefined &&
        idData[field] !== null &&
        idData[field] !== ""
      ) {
        idData[field] =
          idData[field] !== 0 ? v1.security.wR1715To(idData[field]) : null;
      }
    }

    user.idAll = idData;
  }
}

export default app;
