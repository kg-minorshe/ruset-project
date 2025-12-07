import { Vostok1 } from "#modules/Vostok1/index";
import { poolProfile } from "#db/index";
import express from "express";

const app = express();

app.get("/getCurrentUser", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    await v1.security.checkUserRequestAccess(req, res, next);

    const user_id = await v1.auth.getCurrentUserID();

    if (!user_id) {
      return v1.main.sendResponse({
        status: 401,
        message: "Требуется авторизация",
      });
    }

    const user = await v1.auth.getCurrentUser();

    if (!user) {
      return v1.main.sendResponse({
        status: 404,
        message: "Пользователь не найден",
      });
    }

    const userInfo =
      typeof user.info === "string" ? JSON.parse(user.info) : user.info || {};

    const userStatus =
      typeof user.status === "string"
        ? JSON.parse(user.status)
        : user.status || {};

    const currentUser = {
      id: user_id,
      username: user["username"],
      login: user["login"],
      avatar: user["ico"],
      description: userInfo["short"] || "",
      isPremium:
        v1.auth.checkPermissions(userStatus["name"], "whilet") ||
        v1.auth.checkPermissions(userStatus["name"], "vip"),
    };

    return v1.main.sendResponse({
      status: 200,
      message: "Запрос выполнен успешно",
      data: currentUser,
    });
  } catch (error) {
    next(error);
  }
});

export default app;
