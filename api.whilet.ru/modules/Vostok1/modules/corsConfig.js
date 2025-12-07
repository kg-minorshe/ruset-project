const allowedOrigins = [
  "https://whilet.ru",
  "http://localhost:3575",
  "http://127.0.0.1:8873",
  "http://127.0.0.1:8000",
];
const allowedMethods = ["GET", "POST", "PATCH", "OPTIONS", "PUT", "DELETE"];

const isAllowedSubdomain = (origin) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      url.hostname.endsWith(".whilet.ru") &&
      url.protocol === "https:" &&
      url.hostname !== "whilet.ru"
    );
  } catch (e) {
    return false;
  }
};

export const protectRoute = (req, res, next) => {
  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const path = req.path;
  const method = req.method;
  const userAgent = req.headers["user-agent"];

  if (path === "/sse") {
    if (
      origin &&
      (allowedOrigins.includes(origin) || isAllowedSubdomain(origin))
    ) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    return next();
  }

  if (!referer && !origin) {
    return res.status(403).json({
      status: 403,
      message: "Прямой доступ запрещён",
    });
  }

  if (
    origin &&
    !allowedOrigins.includes(origin) &&
    !isAllowedSubdomain(origin)
  ) {
    return res.status(403).json({
      status: 403,
      message: `Запрещённый источник: ${origin}`,
    });
  }

  if (!allowedMethods.includes(method)) {
    return res.status(405).json({
      status: 405,
      message: `Запрещённый метод: ${method}`,
    });
  }

  if (!userAgent || userAgent.includes("bot") || userAgent.includes("spider")) {
    return res.status(403).json({
      status: 403,
      message: "Запрещённый User-Agent",
    });
  }

  if (req.url.includes("..") || req.url.includes("//")) {
    return res.status(400).json({
      status: 400,
      message: "Некорректный URL",
    });
  }

  if (
    origin &&
    (allowedOrigins.includes(origin) || isAllowedSubdomain(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  next();
};
