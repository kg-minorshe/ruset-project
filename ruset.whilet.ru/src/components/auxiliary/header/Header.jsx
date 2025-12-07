"use client";
import { useState, useEffect, useRef, useContext, useCallback } from "react";
import "./Header.scss";
import { CgProfile } from "react-icons/cg";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  RiBallPenLine,
  RiCloudLine,
  RiCodeLine,
  RiLinkM,
  RiPaintBrushLine,
  RiChatQuoteLine,
  RiGlobalLine,
  RiBookletLine,
  RiTelegramLine,
  RiVideoLine,
  RiShieldLine,
  RiAdvertisementLine,
  RiHandHeartLine,
  RiBuildingLine,
  RiFileTextLine,
  RiMoneyDollarCircleLine,
  RiTeamLine,
  RiMicLine,
  RiFileUserLine,
} from "react-icons/ri";
import { FiSun, FiMoon } from "react-icons/fi";
import { IoMenu, IoClose } from "react-icons/io5";
import Head from "next/head";

export default function Header() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const dropdownRefs = useRef([]);
  const timeoutRef = useRef(null);
  const router = useRouter();

  const MenuIcon = openMenu ? IoClose : IoMenu;

  const checkIfMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 945);
  }, []);

  useEffect(() => {
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, [checkIfMobile]);

  // Закрытие меню при клике вне области
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && activeDropdown !== null) {
        const isClickOutside = !dropdownRefs.current[activeDropdown]?.contains(
          event.target
        );
        if (isClickOutside) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, activeDropdown]);

  // Закрытие мобильного меню при изменении размера экрана
  useEffect(() => {
    if (!isMobile && openMenu) {
      setOpenMenu(false);
    }
  }, [isMobile, openMenu]);

  // Блокировка скролла при открытом мобильном меню
  useEffect(() => {
    if (openMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [openMenu]);

  const navItems = [
    {
      title: "Проект",
      ariaLabel: "Меню проекта",
      links: [
        {
          name: "Главный домен",
          type: "external",
          link: "https://whilet.ru",
          icon: <RiGlobalLine aria-hidden="true" />,
          description: "Перейти на главный домен ВАЙЛТ™",
        },
        {
          name: "Брендбук",
          type: "external",
          link: "https://mfs.whilet.ru/s?path=/pdf/Брендбук.pdf",
          icon: <RiBookletLine aria-hidden="true" />,
          description: "Ознакомиться с брендбуком проекта",
        },
        {
          name: "Telegram канал",
          type: "external",
          link: "https://t.me/whilet_ru",
          icon: <RiTelegramLine aria-hidden="true" />,
          description: "Подписаться на Telegram канал",
        },
        {
          name: "Видеоролик",
          type: "external",
          link: "https://rutube.ru/video/cc2c0a01914a8b78fbf4e32f1dbc06eb/?r=plemwd",
          icon: <RiVideoLine aria-hidden="true" />,
          description: "Посмотреть видеоролик о проекте",
        },
        {
          name: "Остерегайся мошенников!",
          type: "external",
          link: "https://whilet.ru/cheater",
          icon: <RiShieldLine aria-hidden="true" />,
          description: "Информация о защите от мошенников",
        },
        {
          name: "Официальные реквизиты",
          type: "external",
          link: "https://whilet.ru/official",
          icon: <RiBuildingLine aria-hidden="true" />,
          description: "Официальные реквизиты",
        },
        {
          name: "W.Studio",
          type: "external",
          link: "https://whilet.ru/studio",
          icon: <RiPaintBrushLine aria-hidden="true" />,
          description: "Перейти в W.Studio",
        },
      ],
    },
    {
      title: "Сервисы",
      ariaLabel: "Меню сервисов",
      links: [
        {
          name: "W.Studio",
          type: "external",
          link: "https://whilet.ru/studio",
          icon: <RiPaintBrushLine aria-hidden="true" />,
          description: "Перейти в W.Studio",
        },
        {
          name: "W.Профиль",
          type: "external",
          link: "https://profile.whilet.ru",
          icon: <CgProfile aria-hidden="true" />,
          description: "Управление профилем пользователя",
        },
        {
          name: "W.Облако",
          type: "external",
          link: "https://cloud.whilet.ru",
          icon: <RiCloudLine aria-hidden="true" />,
          description: "Облачное хранилище файлов",
        },
        {
          name: "Div-Dev",
          type: "external",
          link: "https://div-dev.ru",
          icon: <RiCodeLine aria-hidden="true" />,
          description: "Сервис для разработчиков",
        },
        {
          name: "Klicks",
          type: "external",
          link: "https://klicks.ru",
          icon: <RiLinkM aria-hidden="true" />,
          description: "Сервис сокращения ссылок",
        },
        {
          name: "RuPen",
          type: "external",
          link: "https://рупен.рф",
          icon: <RiBallPenLine aria-hidden="true" />,
          description: "Сервис для писателей",
        },
        {
          name: "Цитатус.рф",
          type: "external",
          link: "https://citatus.whilet.ru",
          icon: <RiChatQuoteLine aria-hidden="true" />,
          description: "Коллекция цитат",
        },
        {
          name: "W.ФОРМЫ",
          type: "external",
          link: "https://forms.whilet.ru",
          icon: <RiBookletLine aria-hidden="true" />,
          description: "ВАЙЛТ™.ФОРМЫ",
        },
      ],
    },
    {
      title: "Сотрудничество",
      ariaLabel: "Меню сотрудничества",
      links: [
        {
          name: "Реклама в Telegram канале",
          type: "external",
          link: "https://whilet.ru/price",
          icon: <RiAdvertisementLine aria-hidden="true" />,
          description: "Размещение рекламы в Telegram канале",
        },
        {
          name: "Поддержи проект",
          type: "external",
          link: "https://whilet.ru/donate",
          icon: <RiHandHeartLine aria-hidden="true" />,
          description: "Варианты поддержки проекта",
        },
        {
          name: "Спонсорство",
          type: "external",
          link: "https://whilet.ru/sponsorship",
          icon: <RiMoneyDollarCircleLine aria-hidden="true" />,
          description: "Стать спонсором проекта",
        },
        {
          name: "Волонтерство",
          type: "external",
          link: "https://whilet.ru/volunteering",
          icon: <RiTeamLine aria-hidden="true" />,
          description: "Присоединиться к команде волонтеров",
        },
        {
          name: "W.Studio",
          type: "external",
          link: "https://whilet.ru/studio",
          icon: <RiPaintBrushLine aria-hidden="true" />,
          description: "Перейти в W.Studio",
        },
      ],
    },
    {
      title: "Кирилл",
      ariaLabel: "Меню об авторе",
      links: [
        {
          name: "Профиль",
          type: "external",
          link: "https://klicks.ru/my",
          icon: <CgProfile aria-hidden="true" />,
          description: "Профиль Кирилла",
        },
        {
          name: "Интервью",
          type: "external",
          link: "https://div-dev.ru/blog/64/Intervyu-s-Kirillom-Gulyaevym--veb-razrabotchikom-i-osnovatelem-proekta---WEBIK--",
          icon: <RiMicLine aria-hidden="true" />,
          description: "Интервью с Кириллом Гуляевым",
        },
        {
          name: "Резюме",
          type: "external",
          link: "https://mfs.whilet.ru/s?path=/pdf/resume_fullstack.pdf",
          icon: <RiFileUserLine aria-hidden="true" />,
          description: "Резюме Кирилла Гуляева",
        },
        {
          name: "W.Studio",
          type: "external",
          link: "https://whilet.ru/studio",
          icon: <RiPaintBrushLine aria-hidden="true" />,
          description: "Перейти в W.Studio",
        },
      ],
    },
  ];

  // Генерация JSON-LD схемы навигации
  const generateNavigationSchema = () => {
    const navigationItems = [];

    navItems.forEach((category) => {
      category.links.forEach((link, index) => {
        navigationItems.push({
          "@type": "SiteNavigationElement",
          name: link.name,
          description: link.description,
          url:
            link.type === "external"
              ? link.link
              : `${
                  typeof window !== "undefined" ? window.location.origin : ""
                }${link.link}`,
          position: navigationItems.length + 1,
        });
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ВАЙЛТ™",
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://whilet.ru",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${
            typeof window !== "undefined"
              ? window.location.origin
              : "https://whilet.ru"
          }/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      mainEntity: {
        "@type": "ItemList",
        name: "Навигация сайта",
        description: "Основные разделы и сервисы проекта ВАЙЛТ™",
        itemListElement: navigationItems,
      },
    };
  };

  const handleNavItemInteraction = useCallback(
    (index, event) => {
      if (isMobile) {
        event.preventDefault();
        setActiveDropdown(activeDropdown === index ? null : index);
      }
    },
    [isMobile, activeDropdown]
  );

  const handleMouseEnter = useCallback(
    (index) => {
      if (!isMobile) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setActiveDropdown(index);
      }
    },
    [isMobile]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      timeoutRef.current = setTimeout(() => {
        setActiveDropdown(null);
      }, 100);
    }
  }, [isMobile]);

  const handleMenuToggle = useCallback(() => {
    setOpenMenu(!openMenu);
    setActiveDropdown(null);
  }, [openMenu]);

  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setOpenMenu(false);
      setActiveDropdown(null);
    }
  }, [isMobile]);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateNavigationSchema()),
          }}
        />
      </Head>

      <header
        role="banner"
        itemScope
        itemType="https://schema.org/WPHeader"
        className="Header site-header"
      >
        <div
          className="container"
          itemScope
          itemType="https://schema.org/SiteNavigationElement"
        >
          <Link
            href="/"
            className="logo-link"
            aria-label="Перейти на главную страницу ВАЙЛТ™"
            itemProp="url"
          >
            <Image
              src="/images/branded/logo.svg"
              className="logo"
              alt="Логотип ВАЙЛТ™"
              width={150}
              height={40}
              priority
              itemProp="image"
              sizes="150px"
            />
          </Link>

          <nav
            className={`main-nav ${openMenu ? "is-active" : ""}`}
            role="navigation"
            aria-label="Главное меню"
            itemScope
            itemType="https://schema.org/SiteNavigationElement"
          >
            {navItems.map((item, index) => (
              <div
                className={`nav-item ${
                  activeDropdown === index ? "active" : ""
                }`}
                key={index}
                ref={(el) => (dropdownRefs.current[index] = el)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                itemScope
                itemType="https://schema.org/SiteNavigationElement"
              >
                <Link
                  href=""
                  role="button"
                  className="link-dropdown"
                  onClick={(e) => handleNavItemInteraction(index, e)}
                  aria-expanded={activeDropdown === index}
                  aria-haspopup="true"
                  aria-label={item.ariaLabel}
                  itemProp="name"
                >
                  <span>{item.title}</span>
                  <Image
                    src="/images/branded/arrow.svg"
                    alt=""
                    width={12}
                    height={6}
                    aria-hidden="true"
                    className={`dropdown-arrow ${
                      activeDropdown === index ? "rotated" : ""
                    }`}
                  />
                </Link>

                <div
                  className={`dropdown-menu ${
                    activeDropdown === index ? "show" : ""
                  }`}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                  role="menu"
                  aria-label={`Подменю ${item.title}`}
                  aria-hidden={activeDropdown !== index}
                  itemScope
                  itemType="https://schema.org/ItemList"
                >
                  <div className="circle" aria-hidden="true"></div>
                  {item.links.map((link, linkIndex) => (
                    <Link
                      href={link.link}
                      key={linkIndex}
                      className="dropdown-link"
                      title={link.description}
                      rel={
                        link.type === "external"
                          ? "noopener noreferrer"
                          : undefined
                      }
                      target={link.type === "external" ? "_blank" : undefined}
                      role="menuitem"
                      itemProp="url"
                      aria-label={link.description}
                      onClick={handleLinkClick}
                      itemScope
                      itemType="https://schema.org/ListItem"
                      tabIndex={activeDropdown === index ? 0 : -1}
                    >
                      <span className="link-icon" aria-hidden="true">
                        {link.icon}
                      </span>
                      <span itemProp="name" className="link-text">
                        {link.name}
                      </span>
                      {link.type === "external" && (
                        <span
                          className="external-indicator"
                          aria-label="Внешняя ссылка"
                        ></span>
                      )}
                      <meta itemProp="description" content={link.description} />
                      <meta itemProp="position" content={linkIndex + 1} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="rightEl">
            <Link
              href="https://profile.whilet.ru"
              rel="noopener noreferrer"
              className="profile-link"
              title="Перейти в профиль пользователя"
              itemProp="url"
              target="_blank"
              itemScope
              itemType="https://schema.org/SiteNavigationElement"
            >
              <CgProfile className="profile-icon" aria-hidden="true" />
              <span itemProp="name">W.Профиль</span>
            </Link>
            <IoMenu
              className="IoMenu"
              onClick={() => {
                setOpenMenu(!openMenu);
              }}
              role="button"
              aria-label={openMenu ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={openMenu}
              tabIndex={0}
            />
          </div>
        </div>
      </header>
    </>
  );
}
