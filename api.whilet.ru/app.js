import "./modules/globalModules.js";
import "./modules/Vostok1/index.js";
import { protectRoute } from "./modules/Vostok1/modules/corsConfig.js";
import { errorHandler } from "./modules/Vostok1/modules/errorHandler.js";
import { Vostok1 } from "./modules/Vostok1/index.js";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import routes from "./routes/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { startLoadedIpDB } from "./routes/v2/ip/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 7015;

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cookieParser(process.env.SECRET_KEY_COOKIES, {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 24 * 360 * 1000,
  })
);

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d",
    etag: true,
    lastModified: true,
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (
        path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
      ) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024,
    files: 50,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("text/") || file.fieldname) {
      cb(null, true);
    } else {
      cb(new Error("Неподдерживаемый тип файла"), false);
    }
  },
});

app.use(upload.none());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const v1 = new Vostok1(req, res, next);
  if (!v1.main.isFriendlyCountry(v1.main.getGeoIP().countryCode) && process.env.NODE_ENV !== "development") {
    return res.status(403).json({
      status: 403,
      message: "Доступ воспрещен локальным устройствам или недружественным странам.",
    });
  }

  next();
});


const createLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 1500,
  message: {
    error: "Превышен лимит запросов",
    code: "RATE_LIMIT_EXCEEDED",
    message: "Пожалуйста, повторите попытку позже",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => req.method === "OPTIONS",
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      message:
        "Слишком много запросов. Пожалуйста, повторите через некоторое время.",
    });
  },
});

app.use("/v2", createLimiter, (req, res, next) => {
  const v1 = new Vostok1(req, res, next);
  v1.main.setHeaders(() => {
    protectRoute(req, res, next);
  });
});
app.use("/v3", createLimiter);
app.use("/sse", createLimiter, (req, res, next) => {
  const v1 = new Vostok1(req, res, next);
  v1.main.setHeaders(() => {
    protectRoute(req, res, next);
  });
});

app.use("/", routes);

app.use((req, res, next) => {
  const error = new Error("Маршрут не найден");
  error.status = 404;
  next(error);
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Сервер запущен: http://127.0.0.1:${port}`);
  console.log(
    `Статические файлы обслуживаются из: ${path.join(__dirname, "public")}`
  );
  startLoadedIpDB();
});
