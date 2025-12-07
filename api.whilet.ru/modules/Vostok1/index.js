import { Auth } from "./components/Auth.js";
import { Main } from "./components/Main.js";
import { Security } from "./components/Security.js";
import { Logger } from "./components/Logger.js";

/**
 * @class Vostok1
 * @property {Auth} auth - Компонент аутентификации
 * @property {Main} main - Основной компонент
 * @property {Security} security - Компонент безопасности
 */
export class Vostok1 {
  constructor(req, res, next) {
    this.req = req;
    this.res = next;
    this.next = next;

    this.main = new Main(req, res, next);
    this.logger = new Logger(req, res, next);
    this.security = new Security(req, res, next);
    this.auth = new Auth(req, res, next);

    this.security.setDependencies({
      auth: this.auth,
      logger: this.logger,
      main: this.main,
    });

    this.auth.setDependencies({
      security: this.security,
      logger: this.logger,
      main: this.main,
    });
  }
}
