import Link from "next/link";
import "./Footer.scss";

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <>
      <div className="Footer">
        <footer
          role="contentinfo"
          itemScope
          itemType="https://schema.org/WPFooter"
          aria-label="Подвал сайта с дополнительной информацией и навигацией"
        >
          <div className="container">
            <nav
              role="navigation"
              aria-labelledby="footer-main-heading"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <h2 id="footer-main-heading" itemProp="name">
                Главное
              </h2>
              <Link
                href="https://klicks.ru/my"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Узнать больше о Кирилле Гуляеве - основателе проекта ВАЙЛТ™"
                title="Профиль Кирилла Гуляева - веб-разработчика и основателя проекта"
              >
                <span itemProp="name">О Кирилле</span>
              </Link>
              <Link
                href="https://whilet.ru/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="XML карта сайта ВАЙЛТ™ для поисковых систем"
                title="Карта сайта в формате XML"
              >
                <span itemProp="name">XML Sitemap</span>
              </Link>
              <Link
                href="https://whilet.ru/cheater"
                itemProp="url"
                aria-label="Остерегайтесь мошенников"
                title="Остерегайтесь мошенников"
              >
                <span itemProp="name">Остерегайтесь мошенников!</span>
              </Link>
              <Link
                href="https://documents.whilet.ru/whilet.ru/policy.pdf"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Политика конфиденциальности ВАЙЛТ™ - защита персональных данных"
                title="Политика конфиденциальности и защиты данных"
              >
                <span itemProp="name">Политика Конфиденциальности</span>
              </Link>
              <Link
                href="https://documents.whilet.ru/whilet.ru/agreement.pdf"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Пользовательское соглашение ВАЙЛТ™ - правила использования сервисов"
                title="Пользовательское соглашение и правила использования"
              >
                <span itemProp="name">Пользовательское соглашение</span>
              </Link>
              <Link
                href="https://documents.whilet.ru/whilet.ru/offer.pdf"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Публичная оферта ВАЙЛТ™ - условия предоставления услуг"
                title="Публичная оферта и условия сотрудничества"
              >
                <span itemProp="name">Публичная оферта</span>
              </Link>
            </nav>

            <nav
              role="navigation"
              aria-labelledby="footer-cooperation-heading"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <h2 id="footer-cooperation-heading" itemProp="name">
                Сотрудничество
              </h2>
              <Link
                href="https://whilet.ru/price"
                itemProp="url"
                aria-label="Размещение рекламы в Telegram канале ВАЙЛТ™ - цены и условия"
                title="Реклама в Telegram канале - прайс-лист"
              >
                <span itemProp="name">Реклама в Telegram канале</span>
              </Link>
              <Link
                href="https://whilet.ru/donate"
                itemProp="url"
                aria-label="Поддержать проект ВАЙЛТ™ финансово - варианты донатов"
                title="Финансовая поддержка проекта"
              >
                <span itemProp="name">Поддержи проект</span>
              </Link>
              <Link
                href="https://whilet.ru/sponsorship"
                itemProp="url"
                aria-label="Стать спонсором проекта ВАЙЛТ™ - корпоративное партнерство"
                title="Спонсорство и корпоративное партнерство"
              >
                <span itemProp="name">Спонсорство</span>
              </Link>
              <Link
                href="https://whilet.ru/volunteering"
                itemProp="url"
                aria-label="Волонтерство в проекте ВАЙЛТ™ - присоединиться к команде"
                title="Волонтерская деятельность в проекте"
              >
                <span itemProp="name">Волонтерство</span>
              </Link>
            </nav>

            <nav
              role="navigation"
              aria-labelledby="footer-profile-heading"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <h2 id="footer-profile-heading" itemProp="name">
                Профиль
              </h2>
              <Link
                href="https://profile.whilet.ru/all"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Просмотреть всех пользователей W.Профиль - сообщество ВАЙЛТ™"
                title="Все пользователи платформы W.Профиль"
              >
                <span itemProp="name">Все пользователи</span>
              </Link>
              <Link
                href="https://profile.whilet.ru/login"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Войти в W.Профиль - авторизация в системе ВАЙЛТ™"
                title="Авторизация в W.Профиль"
              >
                <span itemProp="name">Авторизация</span>
              </Link>
              <Link
                href="https://profile.whilet.ru/signup"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Создать аккаунт W.Профиль - регистрация в системе ВАЙЛТ™"
                title="Регистрация нового аккаунта"
              >
                <span itemProp="name">Зарегистрироваться</span>
              </Link>
            </nav>

            <nav
              role="navigation"
              aria-labelledby="footer-kirill-heading"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <h2 id="footer-kirill-heading" itemProp="name">
                Кирилл
              </h2>
              <Link
                href="https://div-dev.ru/blog/45/Intervyu-s-Kirillom-Gulyaevym--veb-razrabotchikom-i-osnovatelem-proekta---WEBIK--"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Интервью с Кириллом Гуляевым - веб-разработчиком и основателем ВАЙЛТ™"
                title="Подробное интервью с основателем проекта"
              >
                <span itemProp="name">Интервью</span>
              </Link>
              <Link
                href="https://mfs.whilet.ru/s?path=/pdf/resume_fullstack.pdf"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Резюме Кирилла Гуляева - fullstack веб-разработчика"
                title="Профессиональное резюме fullstack разработчика"
              >
                <span itemProp="name">Резюме</span>
              </Link>
              <Link
                href="https://whilet.ru/studio"
                itemProp="url"
                aria-label="W.Studio - веб-студия Кирилла Гуляева для создания сайтов"
                title="W.Studio - профессиональная веб-разработка"
              >
                <span itemProp="name">W.Studio</span>
              </Link>
              <Link
                href="https://profile.whilet.ru/kirill_guliaev"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Личный W.Профиль Кирилла Гуляева - основателя ВАЙЛТ™"
                title="Персональный профиль основателя проекта"
              >
                <span itemProp="name">Личный W.Профиль</span>
              </Link>
            </nav>

            <nav
              role="navigation"
              aria-labelledby="footer-project-heading"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <h2 id="footer-project-heading" itemProp="name">
                Проект
              </h2>
              <Link
                href="https://whilet.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Главный домен ВАЙЛТ™ - официальный сайт проекта"
                title="Официальный сайт проекта ВАЙЛТ™"
              >
                <span itemProp="name">Главный домен</span>
              </Link>
              <Link
                href="https://mfs.whilet.ru/s?path=/pdf/Брендбук.pdf"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Брендбук ВАЙЛТ™ - фирменный стиль и айдентика проекта"
                title="Официальный брендбук и гайдлайны проекта"
              >
                <span itemProp="name">Брендбук</span>
              </Link>
              <Link
                href="https://t.me/whilet_ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Telegram канал ВАЙЛТ™ - новости и обновления проекта"
                title="Официальный Telegram канал проекта"
              >
                <span itemProp="name">Telegram канал</span>
              </Link>
              <Link
                href="https://whilet.ru/official"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Официальные реквизиты проекта"
                title="Официальные реквизиты проекта"
              >
                <span itemProp="name">Официальные реквизиты</span>
              </Link>
              <Link
                href="https://whilet.ru/cheater"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Предупреждение о мошенниках - защита от поддельных сайтов ВАЙЛТ™"
                title="Информация о защите от мошенников и поддельных сайтов"
              >
                <span itemProp="name">Остерегайтесь мошенников!</span>
              </Link>
            </nav>

            <nav
              role="navigation"
              aria-labelledby="footer-services-heading"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <h2 id="footer-services-heading" itemProp="name">
                Сервисы
              </h2>
              <Link
                href="https://whilet.ru/studio"
                itemProp="url"
                aria-label="W.Studio - веб-студия для создания профессиональных сайтов"
                title="W.Studio - веб-разработка и дизайн"
              >
                <span itemProp="name">W.Studio</span>
              </Link>
              <Link
                href="https://profile.whilet.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="W.Профиль - система управления профилями пользователей ВАЙЛТ™"
                title="W.Профиль - персональные профили пользователей"
              >
                <span itemProp="name">W.Профиль</span>
              </Link>
              <Link
                href="https://cloud.whilet.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="W.Облако - облачное хранилище файлов от ВАЙЛТ™"
                title="W.Облако - безопасное облачное хранилище"
              >
                <span itemProp="name">W.Облако</span>
              </Link>
              <Link
                href="https://klicks.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Klicks - сервис сокращения ссылок и аналитики переходов"
                title="Klicks - профессиональное сокращение ссылок"
              >
                <span itemProp="name">Klicks</span>
              </Link>
              <Link
                href="https://div-dev.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="Div-Dev - платформа для веб-разработчиков и IT-специалистов"
                title="Div-Dev - сообщество разработчиков"
              >
                <span itemProp="name">Div-Dev</span>
              </Link>
              <Link
                href="https://рупен.рф"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="RuPen - платформа для писателей и авторов текстов"
                title="RuPen - сервис для писателей"
              >
                <span itemProp="name">RuPen</span>
              </Link>
              <Link
                href="https://citatus.whilet.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="citatus.whilet.ru - коллекция мудрых цитат и афоризмов"
                title="citatus.whilet.ru - база цитат и афоризмов"
              >
                <span itemProp="name">citatus.whilet.ru</span>
              </Link>
              <Link
                href="https://forms.whilet.ru"
                target="_blank"
                rel="noopener noreferrer"
                itemProp="url"
                aria-label="W.ФОРМЫ - конструктор форм, тестов, опросов и анкет"
                title="W.ФОРМЫ - конструктор форм, тестов, опросов и анкет"
              >
                <span itemProp="name">W.ФОРМЫ</span>
              </Link>
            </nav>
          </div>

          <div
            className="logo"
            itemScope
            itemType="https://schema.org/Organization"
          >
            <img
              src="/images/branded/logo.svg"
              alt="Логотип ВАЙЛТ™ - веб-разработка и IT-сервисы"
              itemProp="logo"
              width="150"
              height="40"
              loading="lazy"
            />
            <div className="text">
              <span
                itemProp="copyrightHolder"
                itemScope
                itemType="https://schema.org/Person"
              >
                © {currentYear}
                <span itemProp="name"> Гуляев К. И.</span>
              </span>
              <small>Все права защищены.</small>
            </div>
          </div>

          <div
            className="copyright"
            itemScope
            itemType="https://schema.org/CreativeWork"
          >
            <p itemProp="copyrightNotice">
              Копирование, распространение или использование материалов сайта
              без разрешения запрещено. Нарушение авторских прав преследуется по
              закону.
            </p>
            <p>
              В случае обнаружения незаконного использования материалов будут
              предприняты юридические меры.
            </p>
          </div>
        </footer>
        <span className="is-blur-1" aria-hidden="true"></span>
        <span className="is-blur-2" aria-hidden="true"></span>
      </div>
    </>
  );
}
