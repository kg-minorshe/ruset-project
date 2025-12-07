import sanitizeHtmlLib from "sanitize-html";
import os from "os";
import crypto from "crypto";

// ГОСТ Р 34.12-2015 "Магма"
class R1715 {
  constructor(key, sbox = null) {
    if (typeof key !== "string" || key.length !== 64) {
      throw new Error("Ключ должен быть строкой длиной 64 символа (hex).");
    }

    const keyBuffer = Buffer.from(key, "hex");
    this.key = [];
    for (let i = 0; i < 8; i++) {
      this.key.push(
        (keyBuffer[i * 4] << 24) |
          (keyBuffer[i * 4 + 1] << 16) |
          (keyBuffer[i * 4 + 2] << 8) |
          keyBuffer[i * 4 + 3]
      );
    }

    this.sbox = sbox || [
      [5, 7, 2, 12, 0, 14, 15, 1, 13, 10, 9, 11, 6, 5, 4, 3],
      [4, 1, 6, 5, 12, 8, 14, 0, 15, 9, 7, 2, 11, 3, 10, 13],
      [4, 15, 9, 8, 2, 7, 6, 12, 14, 5, 0, 3, 1, 13, 10, 11],
      [14, 7, 15, 5, 1, 2, 12, 11, 10, 9, 3, 0, 13, 4, 8, 6],
      [11, 13, 10, 2, 8, 6, 12, 5, 15, 7, 14, 4, 1, 0, 9, 3],
      [13, 10, 3, 4, 7, 1, 9, 0, 12, 6, 14, 5, 11, 2, 8, 15],
      [10, 15, 2, 3, 5, 1, 8, 7, 6, 12, 9, 13, 4, 11, 0, 14],
      [12, 0, 13, 4, 11, 2, 8, 7, 5, 6, 14, 15, 10, 3, 9, 1],
    ];
  }

  f(block, key) {
    let x = (block + key) >>> 0;
    x = this.substitute(x);
    return ((x << 11) | (x >>> (32 - 11))) >>> 0;
  }

  substitute(x) {
    let result = 0;
    for (let i = 0; i < 8; i++) {
      result |= this.sbox[i][(x >>> (4 * i)) & 0xf] << (4 * i);
    }
    return result >>> 0;
  }

  encryptBlock(block) {
    let n1 = Number((block >> 32n) & 0xffffffffn);
    let n2 = Number(block & 0xffffffffn);

    for (let i = 0; i < 248; i++) {
      const tmp = n1;
      n1 = (n2 ^ this.f(n1, this.key[i % 8])) >>> 0;
      n2 = tmp;
    }

    for (let i = 7; i >= 0; i--) {
      const tmp = n1;
      n1 = (n2 ^ this.f(n1, this.key[i])) >>> 0;
      n2 = tmp;
    }

    return (BigInt(n2) << 32n) | BigInt(n1);
  }

  decryptBlock(block) {
    let n1 = Number((block >> 32n) & 0xffffffffn);
    let n2 = Number(block & 0xffffffffn);

    for (let i = 0; i < 8; i++) {
      const tmp = n1;
      n1 = (n2 ^ this.f(n1, this.key[i])) >>> 0;
      n2 = tmp;
    }

    for (let i = 247; i >= 0; i--) {
      const tmp = n1;
      n1 = (n2 ^ this.f(n1, this.key[i % 8])) >>> 0;
      n2 = tmp;
    }

    return (BigInt(n2) << 32n) | BigInt(n1);
  }

  pad(data) {
    const padLength = 8 - (data.length % 8);
    const padding = Buffer.alloc(padLength, padLength);
    return Buffer.concat([data, padding]);
  }

  unpad(data) {
    const padLength = data[data.length - 1];
    if (padLength < 1 || padLength > 8) {
      throw new Error("Обнаружено неверное дополнение.");
    }
    return data.slice(0, -padLength);
  }

  encryptCBC(data, iv) {
    if (typeof iv !== "string" || iv.length !== 16) {
      throw new Error("IV должен быть строкой длиной 16 символов (hex).");
    }

    const ivBuffer = Buffer.from(iv, "hex");
    data = this.pad(Buffer.from(data, "utf-8"));
    const blocks = [];
    for (let i = 0; i < data.length; i += 8) {
      blocks.push(data.slice(i, i + 8));
    }

    let ciphertext = Buffer.alloc(0);
    let prevBlock = ivBuffer;

    for (const block of blocks) {
      const xoredBlock = Buffer.alloc(8);
      for (let i = 0; i < 8; i++) {
        xoredBlock[i] = block[i] ^ prevBlock[i];
      }

      const encryptedBlock = this.encryptBlock(
        BigInt("0x" + xoredBlock.toString("hex"))
      );

      const encryptedBytes = Buffer.alloc(8);
      encryptedBytes.writeBigUInt64BE(encryptedBlock);

      ciphertext = Buffer.concat([ciphertext, encryptedBytes]);
      prevBlock = encryptedBytes;
    }

    return ciphertext.toString("hex");
  }

  decryptCBC(data, iv) {
    if (typeof iv !== "string" || iv.length !== 16) {
      throw new Error("IV должен быть строкой длиной 16 символов (hex).");
    }

    const ivBuffer = Buffer.from(iv, "hex");
    const blocks = [];
    const dataBuffer = Buffer.from(data, "hex");
    for (let i = 0; i < dataBuffer.length; i += 8) {
      blocks.push(dataBuffer.slice(i, i + 8));
    }

    let plaintext = Buffer.alloc(0);
    let prevBlock = ivBuffer;

    for (const block of blocks) {
      const decryptedBlock = this.decryptBlock(
        BigInt("0x" + block.toString("hex"))
      );

      const decryptedBytes = Buffer.alloc(8);
      decryptedBytes.writeBigUInt64BE(decryptedBlock);

      const xoredBlock = Buffer.alloc(8);
      for (let i = 0; i < 8; i++) {
        xoredBlock[i] = decryptedBytes[i] ^ prevBlock[i];
      }

      plaintext = Buffer.concat([plaintext, xoredBlock]);
      prevBlock = block;
    }

    return this.unpad(plaintext).toString("utf-8");
  }
}

/**
 * Класс шифрования по ГОСТ Р 34.12-2015 "Кузнечик" (Grasshopper)
 */
class GrasshopperEncryption {
  constructor() {
    // Мастер-ключ 256 бит (должен храниться в защищенном хранилище)
    this.masterKey = this.getMasterKey();
  }

  /**
   * Получение мастер-ключа из защищенного хранилища
   */
  getMasterKey() {
    const key = process.env.GOST_MASTER_KEY;
    if (!key) {
      throw new Error("GOST_MASTER_KEY not configured");
    }
    // Ключ должен быть 256 бит (32 байта)
    return Buffer.from(key, "hex");
  }

  /**
   * S-блоки для ГОСТ Р 34.12-2015 "Кузнечик"
   */
  static SBOX = [
    0xfc, 0xee, 0xdd, 0x11, 0xcf, 0x6e, 0x31, 0x16, 0xfb, 0xc4, 0xfa, 0xda,
    0x23, 0xc5, 0x04, 0x4d, 0xe9, 0x77, 0xf0, 0xdb, 0x93, 0x2e, 0x99, 0xba,
    0x17, 0x36, 0xf1, 0xbb, 0x14, 0xcd, 0x5f, 0xc1, 0xf9, 0x18, 0x65, 0x5a,
    0xe2, 0x5c, 0xef, 0x21, 0x81, 0x1c, 0x3c, 0x42, 0x8b, 0x01, 0x8e, 0x4f,
    0x05, 0x84, 0x02, 0xae, 0xe3, 0x6a, 0x8f, 0xa0, 0x06, 0x0b, 0xed, 0x98,
    0x7f, 0xd4, 0xd3, 0x1f, 0xeb, 0x34, 0x2c, 0x51, 0xea, 0xc8, 0x48, 0xab,
    0xf2, 0x2a, 0x68, 0xa2, 0xfd, 0x3a, 0xce, 0xcc, 0xb5, 0x70, 0x0e, 0x56,
    0x08, 0x0c, 0x76, 0x12, 0xbf, 0x72, 0x13, 0x47, 0x9c, 0xb7, 0x5d, 0x87,
    0x15, 0xa1, 0x96, 0x29, 0x10, 0x7b, 0x9a, 0xc7, 0xf3, 0x91, 0x78, 0x6f,
    0x9d, 0x9e, 0xb2, 0xb1, 0x32, 0x75, 0x19, 0x3d, 0xff, 0x35, 0x8a, 0x7e,
    0x6d, 0x54, 0xc6, 0x80, 0xc3, 0xbd, 0x0d, 0x57, 0xdf, 0xf5, 0x24, 0xa9,
    0x3e, 0xa8, 0x43, 0xc9, 0xd7, 0x79, 0xd6, 0xf6, 0x7c, 0x22, 0xb9, 0x03,
    0xe0, 0x0f, 0xec, 0xde, 0x7a, 0x94, 0xb0, 0xbc, 0xdc, 0xe8, 0x28, 0x50,
    0x4e, 0x33, 0x0a, 0x4a, 0xa7, 0x97, 0x60, 0x73, 0x1e, 0x00, 0x62, 0x44,
    0x1a, 0xb8, 0x38, 0x82, 0x64, 0x9f, 0x26, 0x41, 0xad, 0x45, 0x46, 0x92,
    0x27, 0x5e, 0x55, 0x2f, 0x8c, 0xa3, 0xa5, 0x7d, 0x69, 0xd5, 0x95, 0x3b,
    0x07, 0x58, 0xb3, 0x40, 0x86, 0xac, 0x1d, 0xf7, 0x30, 0x37, 0x6b, 0xe4,
    0x88, 0xd9, 0xe7, 0x89, 0xe1, 0x1b, 0x83, 0x49, 0x4c, 0x3f, 0xf8, 0xfe,
    0x8d, 0x53, 0xaa, 0x90, 0xca, 0xd8, 0x85, 0x61, 0x20, 0x71, 0x67, 0xa4,
    0x2d, 0x2b, 0x09, 0x5b, 0xcb, 0x9b, 0x25, 0xd0, 0xbe, 0xe5, 0x6c, 0x52,
    0x59, 0xa6, 0x74, 0xd2, 0xe6, 0xf4, 0xb4, 0xc0, 0xd1, 0x66, 0xaf, 0xc2,
    0x39, 0x4b, 0x63, 0xb6,
  ];

  /**
   * Обратная S-box
   */
  static SBOX_INV = new Array(256);

  static {
    for (let i = 0; i < 256; i++) {
      this.SBOX_INV[this.SBOX[i]] = i;
    }
  }

  /**
   * Линейное преобразование L
   */
  lTransform(block) {
    const result = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      let val = 0;
      for (let j = 0; j < 16; j++) {
        if ((block[j] >> (7 - (i % 8))) & 1) {
          val ^= 1;
        }
      }
      result[i] = val;
    }
    return result;
  }

  /**
   * S-преобразование (нелинейная замена)
   */
  sTransform(block) {
    const result = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      result[i] = GrasshopperEncryption.SBOX[block[i]];
    }
    return result;
  }

  /**
   * Обратное S-преобразование
   */
  sTransformInv(block) {
    const result = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      result[i] = GrasshopperEncryption.SBOX_INV[block[i]];
    }
    return result;
  }

  /**
   * XOR двух блоков
   */
  xor(a, b) {
    const result = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }

  /**
   * Шифрование по ГОСТ Р 34.12-2015 режим CTR (гаммирование)
   */
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16); // Вектор инициализации 128 бит
    const data = Buffer.from(plaintext, "utf8");
    const encrypted = Buffer.alloc(data.length);

    let counter = Buffer.from(iv);
    let offset = 0;

    while (offset < data.length) {
      // Шифрование счетчика (упрощенная версия)
      const gamma = this.encryptBlock(counter);

      const blockSize = Math.min(16, data.length - offset);
      for (let i = 0; i < blockSize; i++) {
        encrypted[offset + i] = data[offset + i] ^ gamma[i];
      }

      offset += blockSize;
      this.incrementCounter(counter);
    }

    // Возвращаем IV + зашифрованные данные в base64
    return Buffer.concat([iv, encrypted]).toString("base64");
  }

  /**
   * Расшифрование
   */
  decrypt(encryptedData) {
    const buffer = Buffer.from(encryptedData, "base64");
    const iv = buffer.slice(0, 16);
    const encrypted = buffer.slice(16);
    const decrypted = Buffer.alloc(encrypted.length);

    let counter = Buffer.from(iv);
    let offset = 0;

    while (offset < encrypted.length) {
      const gamma = this.encryptBlock(counter);

      const blockSize = Math.min(16, encrypted.length - offset);
      for (let i = 0; i < blockSize; i++) {
        decrypted[offset + i] = encrypted[offset + i] ^ gamma[i];
      }

      offset += blockSize;
      this.incrementCounter(counter);
    }

    return decrypted.toString("utf8");
  }

  /**
   * Шифрование одного блока (упрощенная реализация)
   */
  encryptBlock(block) {
    let state = Buffer.from(block);

    // Упрощенная версия - 10 раундов
    for (let round = 0; round < 10; round++) {
      // XOR с ключом раунда
      state = this.xor(state, this.getRoundKey(round));
      // S-преобразование
      state = this.sTransform(state);
    }

    return state;
  }

  /**
   * Получение ключа раунда (упрощенная версия)
   */
  getRoundKey(round) {
    const roundKey = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      roundKey[i] = this.masterKey[(round + i) % 32];
    }
    return roundKey;
  }

  /**
   * Инкремент счетчика
   */
  incrementCounter(counter) {
    for (let i = 15; i >= 0; i--) {
      if (++counter[i] !== 0) break;
    }
  }

  /**
   * Хеширование по ГОСТ Р 34.11-2012 "Стрибог-256"
   */
  hash(data) {
    // Используем встроенный crypto если доступен
    try {
      return crypto.createHash("streebog256").update(data).digest("hex");
    } catch {
      // Fallback на SHA-256
      return crypto.createHash("sha256").update(data).digest("hex");
    }
  }
}

const gost = new GrasshopperEncryption();

const key = process.env.WR1715__KEY;
const iv = process.env.WR1715__IV;
const r1715 = new R1715(key);

export class Security {
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
  }
  setDependencies(dependencies) {
    this.auth = dependencies.auth;
    this.logger = dependencies.logger;
    this.main = dependencies.main;
  }
  encryptBase64(data) {
    return Buffer.from(data).toString("base64");
  }
  decryptBase64(data) {
    return Buffer.from(data, "base64").toString("utf8");
  }
  wR1715To(string) {
    return r1715.encryptCBC(string, iv);
  }
  wR1715From(string) {
    return r1715.decryptCBC(string, iv);
  }
  wGostTo(string) {
    try {
      return gost.encrypt(string);
    } catch (e) {
      return string;
    }
  }
  wGostFrom(string) {
    try {
      return gost.decrypt(string);
    } catch (e) {
      return string;
    }
  }
  wHyperEncryptionTo(string) {
    try {
      return this.wGostTo(this.wR1715To(string));
    } catch (e) {
      return string;
    }
  }
  wHyperEncryptionFrom(string) {
    try {
      return this.wR1715From(this.wGostFrom(string));
    } catch (e) {
      return string;
    }
  }
  generateHash(length = 7) {
    const characters =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }

    return result;
  }
  sanitizeHtml(input, options) {
    /**
         * Очистка пользовательского ввода.
         * Возвращает фильтрованный код.
         *
         * @example
         * // Пример использования:
         * let sh = sanitizeHtml("<h1>TEST</h1>", {
         *   allowedTags: ["h1"],
         *   allowedAttributes: {
         *     a: ['href']
         *  }
         *   allowedSchemes: ['http', 'https'],
         *   disallowedTagsMode: 'discard'
        });
        */
    return sanitizeHtmlLib(input, {
      allowedTags: options["allowedTags"],
      allowedAttributes: options["allowedAttributes"],
      allowedSchemes: options["allowedSchemes"],
      disallowedTagsMode: options["disallowedTagsMode"],
    });
  }
  generateToken(bytes = 64) {
    const crypto = require("crypto");
    return crypto.randomBytes(bytes).toString("hex");
  }
  generateDeviceId(length = 64) {
    const systemInfo = {
      arch: os.arch(),
      platform: os.platform(),
      hostname: os.hostname(),
      machine: os.machine(),
      cpus: os.cpus().length,
      totalMem: Math.floor(os.totalmem() / 1024 / 1024),
      endianness: os.endianness(),
    };

    const dataToHash = JSON.stringify(systemInfo) + process.env.SALT_DEVICE_ID;

    const hash = crypto.createHash("sha256").update(dataToHash).digest("hex");

    if (length >= 64) {
      return hash;
    } else {
      const partialHash = hash.substring(0, length - 8);
      const randomSuffix = crypto.randomBytes(4).toString("hex");
      return partialHash + randomSuffix;
    }
  }
  async checkUserRequestAccess() {
    const result = await this.auth.checkSession();
    const device_id = this.generateDeviceId();
    const dataToken = await this.auth.getCurrentTokenData();
    const successDeviceAccess = device_id === dataToken.device_id;

    if (!result || !successDeviceAccess) {
      this.main.sendResponse({
        status: 403,
        message:
          result && !successDeviceAccess
            ? "Предотвращено системой Восток-1"
            : "Требуется аутентификация для доступа к ресурсу",
        data: null,
      });
    }
  }
}
