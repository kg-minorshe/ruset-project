import { lookupIP } from "#routes/v2/ip/index"
export class Main {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.friendlyCountries = new Set([
            // ЕАЭС и ближнее зарубежье
            'BY', // Беларусь
            'AM', // Армения
            'KZ', // Казахстан
            'KG', // Киргизия
            'TJ', // Таджикистан
            'UZ', // Узбекистан
            'TM', // Туркменистан
            'AZ', // Азербайджан

            // Азия
            'CN', // Китай
            'IN', // Индия
            'VN', // Вьетнам
            'ID', // Индонезия
            'TH', // Таиланд
            'KH', // Камбоджа
            'LA', // Лаос
            'MY', // Малайзия
            'SG', // Сингапур
            'HK', // Гонконг (специальный статус)

            // Ближний Восток и Африка
            'AE', // ОАЭ
            'BH', // Бахрейн
            'JO', // Иордания
            'SA', // Саудовская Аравия
            'IL', // Израиль
            'EG', // Египет
            'DZ', // Алжир
            'ZA', // ЮАР
            'ZW', // Зимбабве
            'BW', // Ботсвана
            'CD', // ДР Конго
            'ET', // Эфиопия
            'AO', // Ангола

            // Латинская Америка
            'BR', // Бразилия
            'VE', // Венесуэла
            'AR', // Аргентина
            'BO', // Боливия
            'CU', // Куба
            'NI', // Никарагуа
            'PE', // Перу
            'UY', // Уругвай

            // Европа и Балканы
            'RS', // Сербия
            'BA', // Босния и Герцеговина

            // Другие
            'IR', // Иран
            'KP', // Северная Корея
            'AF',  // Афганистан

            'RU'
        ]);
    }
    getCurrentDateTime(offset = 6) {
        const now = new Date();
        const offsetInMilliseconds = offset * 60 * 60 * 1000;
        const localTime = new Date(now.getTime() + offsetInMilliseconds);

        const year = localTime.getUTCFullYear();
        const month = (localTime.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = localTime.getUTCDate().toString().padStart(2, '0');

        const hours = localTime.getUTCHours().toString().padStart(2, '0');
        const minutes = localTime.getUTCMinutes().toString().padStart(2, '0');
        const seconds = localTime.getUTCSeconds().toString().padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    sendResponse({
        status = 200,
        message = "",
        data = {}
    } = {}) {
        const response = {
            status,
            message,
            data,
        };

        Object.keys(response).forEach(key => {
            if (response[key] === null || response[key] === undefined || (Array.isArray(response[key]) && !response[key].length)) {
                delete response[key];
            }
        });

        return this.res
            .status(status)
            .json(response)
            .end();
    }

    setHeaders(protectedFunction = null) {
        // Получаем метод запроса и origin
        const requestMethod = this.req.method || 'GET';
        const origin = this.req.headers.origin || '';

        // Обработка метода OPTIONS
        if (requestMethod === 'OPTIONS') {
            this.res.setHeader('Access-Control-Allow-Origin', origin);
            this.res.setHeader('Access-Control-Allow-Credentials', 'true');
            this.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            this.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

            this.res.statusCode = 204; // Используем 204 No Content для OPTIONS
            return this.res.end(); // Завершаем ответ без вызова next()
        }

        // Основные CORS заголовки
        this.res.setHeader('Access-Control-Allow-Origin', origin);
        this.res.setHeader('Access-Control-Allow-Credentials', 'true');
        this.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        this.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

        // Безопасность
        this.res.setHeader('X-Content-Type-Options', 'nosniff');
        this.res.setHeader('X-Frame-Options', 'DENY');
        this.res.setHeader('X-XSS-Protection', '1; mode=block');
        this.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        this.res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');

        // Кэширование
        this.res.setHeader('Cache-Control', 'no-store, max-age=0');
        this.res.setHeader('Pragma', 'no-cache');
        this.res.setHeader('Expires', '0');

        // Локализация
        this.res.setHeader('Content-Language', 'ru');
        this.res.setHeader('Accept-Charset', 'utf-8');

        // Пользовательские заголовки
        this.res.setHeader('X-Vostok1-Version', '5');
        this.res.setHeader('X-Security-Level', 'Maximum');
        this.res.setHeader('X-Powered-By', 'Vostok1-Security-System');

        // HSTS
        if (this.req.secure) {
            this.res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        if (protectedFunction && typeof protectedFunction === 'function') {
            protectedFunction();
        }
    }

    decodeArrays(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.decodeArrays(item));
        }

        if (typeof data === 'object' && data !== null) {
            const result = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    result[key] = this.decodeArrays(data[key]);
                }
            }
            return result;
        }

        if (typeof data === 'string') {
            try {
                const decoded = JSON.parse(data);
                return this.decodeArrays(decoded);
            } catch (error) {
                return data;
            }
        }

        return data;
    }

    /**
     * Получение IP-адреса клиента
     */
    getClientIP(mode = "pro") {
        if (mode === "pro") {
            const headers = [
                'x-client-ip',
                'x-forwarded-for',
                'x-real-ip',
                'x-forwarded',
                'x-cluster-client-ip',
                'forwarded-for',
                'forwarded',
                'cf-connecting-ip'
            ];

            for (const header of headers) {
                const value = this.req.headers[header];
                if (value) {
                    const parts = value.split(',');
                    const ip = parts[0].trim();
                    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                        return ip;
                    }
                }
            }
        }

        return this.req.socket.remoteAddress ||
            this.req.connection.remoteAddress ||
            this.req.ip ||
            '0.0.0.0';
    }

    getIPType(ip) {
        if (ip.includes(":")) return "ipv6";
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return "ipv4";
        return "invalid";
    }

    getClientIPv6() {
        if (!this.req || typeof this.req !== "object") {
            return null;
        }

        if (!this.req.headers || typeof this.req.headers !== "object") {
            return null;
        }

        try {
            const xForwardedFor = this.req.headers["x-forwarded-for"] ?? null;
            if (xForwardedFor) {
                const ips = xForwardedFor.split(",").map((ip) => ip.trim());
                const ipv6 = ips.find((ip) => ip.includes(":"));
                if (ipv6) return ipv6;
            }

            if (this.req.headers["x-real-ip"] && this.req.headers["x-real-ip"].includes(":")) {
                return this.req.headers["x-real-ip"];
            }

            if (
                this.req.socket &&
                this.req.socket.remoteAddress &&
                this.req.socket.remoteAddress.includes(":")
            ) {
                return this.req.socket.remoteAddress;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    isLocalIP(ip) {
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

    /**
     * Получение геопозиции по IP-адресу
     */
    getGeoIP() {
        const result = lookupIP(this.getClientIP());
        return {
            ...result.data,
            detectedIp: this.getClientIP(),
            ipv4: this.req.clientIP,
            ipv6: this.getClientIPv6(),
        }
    }

    /**
     * Проверяет, является ли страна (по ISO коду) дружественной РФ
     * @param {string} countryCode - код страны (например, 'CN', 'US', 'BR')
     * @returns {boolean} true, если страна считается дружественной
    */
    isFriendlyCountry(countryCode) {
        if (!countryCode || typeof countryCode !== 'string') {
            return false;
        }
        return this.friendlyCountries.has(countryCode.toUpperCase());
    }

    /**
     * Извлечение домена из URL
     */
    extractDomain(url) {
        try {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url;
            }

            const parsedUrl = new URL(url);
            return parsedUrl.hostname;
        } catch (error) {
            return url;
        }
    }

    /**
     * Получение данных запроса
     */
    getRequest(res) {
        const requestData = {
            all: { ...this.req.query, ...this.req.body },
            query: this.req.query,
            post: this.req.body,
            cookies: this.req.cookies || {},
            files: this.req.files || {},
            server: {
                httpVersion: this.req.httpVersion,
                headers: this.req.headers,
                url: this.req.url,
                method: this.req.method,
            },
            headers: this.req.headers,
            json: this.req.is('application/json') ? this.req.body : {},
            input: { ...this.req.query, ...this.req.body },
            method: this.req.method,
            path: this.req.path,
            url: `${this.req.protocol}://${this.req.get('host')}${this.req.originalUrl.split('?')[0]}`,
            full_url: `${this.req.protocol}://${this.req.get('host')}${this.req.originalUrl}`,
            ip: this.getClientIP(req),
            user_agent: this.req.headers['user-agent'] || '',
            content_type: this.req.get('Content-Type') || '',
            is_secure: this.req.secure,
            is_ajax: this.req.xhr || (this.req.headers['x-requested-with'] === 'XMLHttpRequest'),
            is_json: this.req.is('application/json') || false,
            wants_json: (this.req.accepts(['html', 'json']) === 'json'),
            session: this.req.session || null,
            route_parameters: this.req.params || null,
        };

        return this.res.status(200).json(requestData);
    }

    /**
     * Проверка переданных данных серверу
     */
    checkHasData(requiredFields = [], res = null) {
        const missingFields = [];
        for (const field of requiredFields) {
            if (this.req.body[field] === undefined &&
                this.req.query[field] === undefined &&
                this.req.params[field] === undefined) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0 && res) {
            this.sendResponse({
                status: 422,
                message: "Не переданы обязательные данные: " + missingFields.join(", ")
            });
            return false;
        }

        return missingFields.length === 0;
    }

    /**
     * Проверяет, является ли email адрес американским
     */
    isAmericanEmail(email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return false;
        }

        const domain = email.split('@')[1].toLowerCase();

        const usDomains = [
            'gmail',
            'outlook',
            'hotmail',
            'live',
        ];

        const domainParts = domain.split('.');
        const levelDomain = domainParts[0];

        return usDomains.includes(levelDomain);
    }

    /**
     * Проверяет, является ли домен сайта американским
     */
    isAmericanDomain(domain) {
        let cleanedDomain = domain.toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, '')
            .trim();

        cleanedDomain = this.extractDomain(cleanedDomain);

        if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(cleanedDomain)) {
            return false;
        }

        const usDomains = [
            'us',
            'mil',
            'io',
            'co',
            'nyc',
            'me',
            'cc',
            'tv',
            'biz',
            'info'
        ];

        const domainParts = cleanedDomain.split('.');
        const topLevelDomain = domainParts[domainParts.length - 1];

        return usDomains.includes(topLevelDomain);
    }

    /**
     * Определение провайдера электронной почты
     */
    getEmailProvider(email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return 'invalid';
        }

        const domain = email.split('@')[1].toLowerCase();

        if (domain === 'gmail.com') {
            return 'gmail';
        } else if (['yandex.ru', 'yandex.com', 'ya.ru', 'yandex.kz'].includes(domain)) {
            return 'yandex';
        } else if (domain === 'wpostline.ru') {
            return 'whilet';
        } else if (['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru', 'internet.ru'].includes(domain)) {
            return 'mailru';
        } else if (['outlook.com', 'hotmail.com', 'live.com'].includes(domain)) {
            return 'microsoft';
        }

        return 'undefined';
    }

    /**
     * Вспомогательная функция для numToWordsRub
     */
    morph(n, f1, f2, f5) {
        n = Math.abs(parseInt(n)) % 100;

        if (n > 10 && n < 20) {
            return f5;
        }

        n = n % 10;

        if (n > 1 && n < 5) {
            return f2;
        }

        if (n === 1) {
            return f1;
        }

        return f5;
    }

    /**
     * Преобразование числа в слова (рубли)
     */
    numToWordsRub(num) {
        const nul = 'ноль';
        const ten = [
            ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'],
            ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
        ];
        const a20 = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundred = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        const unit = [
            ['копейка', 'копейки', 'копеек', 1],
            ['рубль', 'рубля', 'рублей', 0],
            ['тысяча', 'тысячи', 'тысяч', 1],
            ['миллион', 'миллиона', 'миллионов', 0],
            ['миллиард', 'миллиарда', 'миллиардов', 0],
        ];

        const formattedNum = parseFloat(num).toFixed(2);
        const [rub, kop] = formattedNum.split('.');
        const out = [];

        if (parseInt(rub) > 0) {
            const groups = [];
            let temp = rub;

            while (temp.length > 0) {
                groups.unshift(temp.slice(-3));
                temp = temp.slice(0, -3);
            }

            for (let uk = 0; uk < groups.length; uk++) {
                const v = groups[uk];

                if (parseInt(v) === 0) continue;

                const unitIndex = groups.length - uk;

                if (unitIndex > unit.length - 1) continue;

                const gender = unit[unitIndex][3];
                const digits = v.padStart(3, '0').split('');
                const i1 = parseInt(digits[0]);
                const i2 = parseInt(digits[1]);
                const i3 = parseInt(digits[2]);

                if (i1 > 0) {
                    out.push(hundred[i1]);
                }

                if (i2 > 1) {
                    out.push(tens[i2] + (i3 > 0 ? ' ' + ten[gender][i3] : ''));
                } else if (i2 === 1) {
                    out.push(a20[i3]);
                } else if (i3 > 0) {
                    out.push(ten[gender][i3]);
                }

                if (unitIndex > 1) {
                    out.push(this.morph(v, unit[unitIndex][0], unit[unitIndex][1], unit[unitIndex][2]));
                }
            }
        } else {
            out.push(nul);
        }

        out.push(this.morph(parseInt(rub), unit[1][0], unit[1][1], unit[1][2]));
        out.push(kop + ' ' + this.morph(parseInt(kop), unit[0][0], unit[0][1], unit[0][2]));

        return out.join(' ').trim();
    }

    /**
     * Генерация случайного цвета в HEX формате
     */
    generateRandomColor(type = 'any') {
        let r = Math.floor(Math.random() * 256);
        let g = Math.floor(Math.random() * 256);
        let b = Math.floor(Math.random() * 256);

        if (type === 'light') {
            r = Math.max(200, r);
            g = Math.max(200, g);
            b = Math.max(200, b);
        } else if (type === 'dark') {
            r = Math.min(80, r);
            g = Math.min(80, g);
            b = Math.min(80, b);
        }

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Конвертация между различными единицами измерения
     */
    convertUnits(value, from, to) {
        const conversions = {
            length: {
                mm: 0.001,
                cm: 0.01,
                m: 1,
                km: 1000,
                in: 0.0254,
                ft: 0.3048,
                yd: 0.9144,
                mi: 1609.344
            },
            weight: {
                mg: 0.001,
                g: 1,
                kg: 1000,
                oz: 28.3495,
                lb: 453.592,
                ton: 907185
            },
            volume: {
                ml: 1,
                l: 1000,
                m3: 1000000,
                gal: 3785.41,
                qt: 946.353,
                pt: 473.176,
                cup: 236.588,
                'fl oz': 29.5735
            },
            temperature: {
                c: {
                    to: {
                        f: (v) => v * 9 / 5 + 32,
                        k: (v) => v + 273.15
                    },
                },
                f: {
                    to: {
                        c: (v) => (v - 32) * 5 / 9,
                        k: (v) => (v - 32) * 5 / 9 + 273.15
                    }
                },
                k: {
                    to: {
                        c: (v) => v - 273.15,
                        f: (v) => (v - 273.15) * 9 / 5 + 32
                    }
                }
            }
        };

        from = from.toLowerCase();
        to = to.toLowerCase();

        if (from in conversions.temperature) {
            if (to in conversions.temperature) {
                if (from === to) return value;
                return conversions.temperature[from].to[to](value);
            }
            throw new Error(`Неподдерживаемая конвертация температуры: ${from} -> ${to}`);
        }

        let conversionType = null;
        for (const type in conversions) {
            if (type !== 'temperature' && from in conversions[type]) {
                conversionType = type;
                break;
            }
        }

        if (!conversionType) {
            throw new Error(`Неизвестная единица измерения: ${from}`);
        }

        if (!(to in conversions[conversionType])) {
            throw new Error(`Неизвестная единица измерения: ${to}`);
        }

        const baseValue = value * conversions[conversionType][from];
        return baseValue / conversions[conversionType][to];
    }

    /**
     * Преобразование HEX цвета в RGB
     */
    hexToRgb(hex) {
        hex = hex.replace('#', '');

        if (hex.length === 3) {
            const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
            const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
            const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
            return { r, g, b };
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }
};