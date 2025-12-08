import { Vostok1 } from "#modules/Vostok1/index";
import { poolProfile } from "#db/index";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use(express.json());

app.use((req, res, next) => {
  req.clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress?.replace("::ffff:", "") ||
    null;
  next();
});

const ipDatabase = {
  ipv4: [],
  ipv6: [],
  isLoaded: false,
  totalRecords: 0,
  loadTime: 0,
};

function getIPType(ip) {
  if (ip.includes(":")) return "ipv6";
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return "ipv4";
  return "invalid";
}
async function loadDatabase(csvPath) {
  if (ipDatabase.isLoaded) {
    console.log("⚠️ База данных уже загружена");
    return;
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    if (!fs.existsSync(csvPath)) {
      console.error("Файл базы данных не найден: ${csvPath}");
      return;
    }

    console.log("📂 Загрузка базы данных...");

    const fileStream = fs.createReadStream(csvPath, {
      encoding: "utf8",
      highWaterMark: 64 * 1024,
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    let ipv4Count = 0;
    let ipv6Count = 0;

    rl.on("line", (line) => {
      lineCount++;

      const parts = parseCSVLine(line);

      if (parts.length < 6) return;

      const [ipStart, ipEnd, continent, countryCode, region, city] = parts;

      const record = {};
      if (continent) record.continent = continent;
      if (countryCode) record.countryCode = countryCode;
      if (region) record.region = region;
      if (city) record.city = city;

      const ipType = getIPType(ipStart);

      if (ipType === "ipv4") {
        ipDatabase.ipv4.push({
          start: ipv4ToLong(ipStart),
          end: ipv4ToLong(ipEnd),
          data: record,
        });
        ipv4Count++;
      } else if (ipType === "ipv6") {
        ipDatabase.ipv6.push({
          start: ipStart,
          end: ipEnd,
          data: record,
        });
        ipv6Count++;
      }

      if (lineCount % 500000 === 0) {
        console.log(`   Обработано ${lineCount.toLocaleString()} записей...`);
        if (global.gc) {
          global.gc();
        }
      }
    });

    rl.on("close", () => {
      console.log("🔄 Сортировка данных...");

      ipDatabase.ipv4.sort((a, b) => a.start - b.start);

      ipDatabase.ipv6.sort((a, b) => {
        const aBig = ipv6ToBigInt(a.start);
        const bBig = ipv6ToBigInt(b.start);
        return aBig < bBig ? -1 : aBig > bBig ? 1 : 0;
      });

      ipDatabase.isLoaded = true;
      ipDatabase.totalRecords = lineCount;
      ipDatabase.loadTime = Date.now() - startTime;

      console.log("✅ База данных загружена!");
      console.log(`   IPv4 записей: ${ipv4Count.toLocaleString()}`);
      console.log(`   IPv6 записей: ${ipv6Count.toLocaleString()}`);
      console.log(
        `   Время загрузки: ${(ipDatabase.loadTime / 1000).toFixed(2)} сек`
      );

      if (global.gc) {
        global.gc();
      }

      resolve();
    });

    rl.on("error", reject);
    fileStream.on("error", reject);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function binarySearchIPv4(ipLong) {
  const arr = ipDatabase.ipv4;
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const range = arr[mid];

    if (ipLong >= range.start && ipLong <= range.end) {
      return range.data;
    } else if (ipLong < range.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return null;
}

function binarySearchIPv6(ipBigInt) {
  const arr = ipDatabase.ipv6;
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const range = arr[mid];

    const startBig = ipv6ToBigInt(range.start);
    const endBig = ipv6ToBigInt(range.end);

    if (ipBigInt >= startBig && ipBigInt <= endBig) {
      return range.data;
    } else if (ipBigInt < startBig) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return null;
}
function isLocalIP(ip) {
  const localPatterns = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^0\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /^fd/i,
  ];
  return localPatterns.some((p) => p.test(ip));
}
export function lookupIP(ip) {
  if (!ipDatabase.isLoaded) {
    return {
      success: false,
      error: "База данных не загружена",
      ip: ip,
    };
  }

  if (!ip || typeof ip !== "string") {
    return {
      success: false,
      error: "IP адрес не указан",
      ip: null,
    };
  }

  ip = ip.trim();

  if (isLocalIP(ip)) {
    return {
      success: false,
      error: "Локальный IP адрес",
      ip: ip,
    };
  }

  const ipType = getIPType(ip);

  if (ipType === "invalid") {
    return {
      success: false,
      error: "Невалидный IP адрес",
      ip: ip,
    };
  }

  let result = null;
  const startTime = process.hrtime.bigint();

  try {
    if (ipType === "ipv4") {
      const ipLong = ipv4ToLong(ip);
      result = binarySearchIPv4(ipLong);
    } else {
      const ipBigInt = ipv6ToBigInt(ip);
      result = binarySearchIPv6(ipBigInt);
    }
  } catch (error) {
    return {
      success: false,
      error: "Ошибка обработки IP: " + error.message,
      ip: ip,
    };
  }

  const endTime = process.hrtime.bigint();
  const searchTimeMs = Number(endTime - startTime) / 1000000;

  if (!result) {
    return {
      success: false,
      error: "IP не найден в базе",
      ip: ip,
      searchTimeMs: searchTimeMs.toFixed(3),
    };
  }

  return {
    success: true,
    ip: ip,
    data: {
      ipType: ipType,
      continent: result.continent || null,
      countryCode: result.countryCode || null,
      country: getCountryName(result.countryCode),
      region: result.region || null,
      city: result.city || null,
      searchTimeMs: searchTimeMs.toFixed(3),
    },
  };
}

function getCountryName(code) {
  const countries = {
    RU: "Россия",
    US: "США",
    GB: "Великобритания",
    DE: "Германия",
    FR: "Франция",
    CN: "Китай",
    JP: "Япония",
    KR: "Южная Корея",
    IN: "Индия",
    BR: "Бразилия",
    CA: "Канада",
    AU: "Австралия",
    IT: "Италия",
    ES: "Испания",
    NL: "Нидерланды",
    PL: "Польша",
    UA: "Украина",
    BY: "Беларусь",
    KZ: "Казахстан",
    UZ: "Узбекистан",
    SE: "Швеция",
    NO: "Норвегия",
    FI: "Финляндия",
    DK: "Дания",
    CH: "Швейцария",
    AT: "Австрия",
    BE: "Бельгия",
    CZ: "Чехия",
    TR: "Турция",
    IL: "Израиль",
    AE: "ОАЭ",
    SG: "Сингапур",
    HK: "Гонконг",
    TW: "Тайвань",
    TH: "Таиланд",
    VN: "Вьетнам",
    ID: "Индонезия",
    MY: "Малайзия",
    PH: "Филиппины",
    MX: "Мексика",
    AR: "Аргентина",
    CL: "Чили",
    CO: "Колумбия",
    ZA: "ЮАР",
    EG: "Египет",
    NG: "Нигерия",
    IE: "Ирландия",
    PT: "Португалия",
    GR: "Греция",
    RO: "Румыния",
    HU: "Венгрия",
    SK: "Словакия",
    BG: "Болгария",
    HR: "Хорватия",
    RS: "Сербия",
    SI: "Словения",
    LT: "Литва",
    LV: "Латвия",
    EE: "Эстония",
    GE: "Грузия",
    AM: "Армения",
    AZ: "Азербайджан",
    MD: "Молдова",
    KG: "Киргизия",
    TJ: "Таджикистан",
    TM: "Туркменистан",
    MN: "Монголия",
  };
  return countries[code] || code || null;
}

function ipv4ToLong(ip) {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

function ipv6ToBigInt(ip) {
  let fullIP = expandIPv6(ip);
  const parts = fullIP.split(":");
  let result = BigInt(0);

  for (let i = 0; i < 8; i++) {
    result = (result << BigInt(16)) + BigInt(parseInt(parts[i] || "0", 16));
  }

  return result;
}
function expandIPv6(ip) {
  if (ip.includes("::")) {
    const parts = ip.split("::");
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill("0000");
    const full = [...left, ...middle, ...right];
    return full.map((p) => p.padStart(4, "0")).join(":");
  }
  return ip
    .split(":")
    .map((p) => p.padStart(4, "0"))
    .join(":");
}

app.get("/lookup/:ip", (req, res, next) => {
  const ip = req.params.ip;
  const result = lookupIP(ip);
  const v1 = new Vostok1(req, res, next);

  v1.main.sendResponse({
    status: result.success ? 200 : 500,
    message: result.success
      ? "Запрос выполнен успешно"
      : "При выполнении запроса произошла ошибка: " + result.error,
    data: {
      ...result.data,
      detectedIp: ip,
      ipv4: req.clientIP,
      ipv6: v1.main.getClientIPv6(),
    },
  });
});

app.get("/lookup", (req, res, next) => {
  const ip = req.query.ip || req.clientIP;
  const result = lookupIP(ip);
  const v1 = new Vostok1(req, res, next);

  v1.main.sendResponse({
    status: result.success ? 200 : 500,
    message: result.success
      ? "Запрос выполнен успешно"
      : "При выполнении запроса произошла ошибка: " + result.error,
    data: {
      ...result.data,
      detectedIp: ip,
      ipv4: req.clientIP,
      ipv6: v1.main.getClientIPv6(),
    },
  });
});

app.get("/my", (req, res, next) => {
  const ip = req.clientIP;
  const result = lookupIP(ip);
  const v1 = new Vostok1(req, res, next);

  v1.main.sendResponse({
    status: result.success ? 200 : 500,
    message: result.success
      ? "Запрос выполнен успешно"
      : "При выполнении запроса произошла ошибка: " + result.error,
    data: {
      ...result.data,
      detectedIp: ip,
      ipv4: req.clientIP,
      ipv6: v1.main.getClientIPv6(),
    },
  });
});

export function startLoadedIpDB() {
  const dbPath = path.join(__dirname, "data", "dbip-city-lite-2025-11.csv");
  loadDatabase(dbPath).catch(console.error);
}

export default app;
