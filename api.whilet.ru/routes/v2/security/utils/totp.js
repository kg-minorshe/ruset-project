"use strict";

import { authenticator } from "otplib";

export const DEFAULTS = {
  step: 30,
  digits: 6,
  algorithm: "sha1",
};

authenticator.options = { ...DEFAULTS };

export function normalizeSecret(s) {
  return (s || "").toString().replace(/\s+/g, "").toUpperCase();
}

export function normalizeAlgorithm(a) {
  const v = String(a || DEFAULTS.algorithm).toLowerCase();
  return ["sha1", "sha256", "sha512"].includes(v) ? v : DEFAULTS.algorithm;
}

// Вспомогательная функция для временной установки опций
export function withOptions(temp, fn) {
  const saved = { ...authenticator.options };
  authenticator.options = { ...saved, ...temp };
  try {
    return fn();
  } finally {
    authenticator.options = saved;
  }
}

/**
 * Парсинг otpauth URI
 * Возвращает объект с параметрами: { type, account, issuer, secret, algorithm, digits, period }
 */
export function parseOtpAuthUri(uri) {
  try {
    const url = new URL(uri);

    if (url.protocol !== "otpauth:") {
      throw new Error("Invalid protocol. Expected otpauth://");
    }

    const type = url.host; // totp или hotp
    const pathParts = url.pathname.slice(1).split(":");

    let issuer = "";
    let account = "";

    if (pathParts.length === 2) {
      issuer = decodeURIComponent(pathParts[0]);
      account = decodeURIComponent(pathParts[1]);
    } else if (pathParts.length === 1) {
      account = decodeURIComponent(pathParts[0]);
    }

    const params = new URLSearchParams(url.search);

    const secret = params.get("secret") || "";
    const algorithm = normalizeAlgorithm(params.get("algorithm"));
    const digits = parseInt(params.get("digits")) || DEFAULTS.digits;
    const period = parseInt(params.get("period")) || DEFAULTS.step;

    // Если issuer не был в пути, проверяем параметры
    if (!issuer && params.has("issuer")) {
      issuer = params.get("issuer");
    }

    return {
      type,
      account,
      issuer,
      secret: normalizeSecret(secret),
      algorithm,
      digits,
      period,
    };
  } catch (error) {
    console.error("Error parsing otpauth URI:", error);
    return null;
  }
}

/**
 * Генерация TOTP кода.
 * opts: { algorithm?: 'sha1'|'sha256'|'sha512', digits?: number, step?: number }
 */
export function generateTOTP(secret, opts = {}) {
  const temp = {
    algorithm: normalizeAlgorithm(opts.algorithm),
    digits: opts.digits || DEFAULTS.digits,
    step: opts.step || DEFAULTS.step,
  };
  return withOptions(temp, () =>
    authenticator.generate(normalizeSecret(secret))
  );
}

/**
 * Проверка кода. Возвращает { delta } или null.
 * window — допуск по тайм-слотам (напр., 1 => +/-1 интервал)
 */
export function verifyToken(token, secret, opts = {}, window = 1) {
  const temp = {
    algorithm: normalizeAlgorithm(opts.algorithm),
    digits: opts.digits || DEFAULTS.digits,
    step: opts.step || DEFAULTS.step,
  };
  return withOptions(temp, () =>
    authenticator.checkDelta(String(token || ""), normalizeSecret(secret), {
      window,
    })
  );
}

/**
 * Построение otpauth URI для экспорта/QR.
 * opts — такие же, как в generateTOTP.
 */
export function buildOtpUri({ account, issuer, secret }, opts = {}) {
  const temp = {
    algorithm: normalizeAlgorithm(opts.algorithm),
    digits: opts.digits || DEFAULTS.digits,
    step: opts.step || DEFAULTS.step,
  };
  return withOptions(temp, () =>
    authenticator.keyuri(account, issuer, normalizeSecret(secret))
  );
}

/**
 * Остаток времени до смены кода
 */
export function timeRemaining(
  step = authenticator.options.step || DEFAULTS.step
) {
  const now = Math.floor(Date.now() / 1000);
  return step - (now % step);
}