"use client";
import "./Menu.scss";
import Link from "next/link";
import {
  RiAccountCircleLine,
  RiFileLine,
  RiHome6Line,
  RiLink,
  RiMenu2Fill,
  RiText,
} from "react-icons/ri";
import { useState, useEffect } from "react";
export default function Menu() {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_URL_API_MAIN + "";
  function toggleMenu() {
    document.querySelector(".Menu").classList.toggle("is-active");
  }
  const [userSession, setUserSession] = useState(false);
  async function getSession() {
    try {
      const response = await fetch(apiUrl + "/v2/profile/checkSession", {
        method: "GET",
        credentials: "include",
      });
      setUserSession(response.ok);
    } catch {
      console.error("Ошибка");
      setUserSession(false);
    }
  }
  useEffect(() => {
    getSession();
  }, []);
  return (
    <div className="Menu">
      <div className="Menu__toggle" onClick={toggleMenu}>
        <RiMenu2Fill></RiMenu2Fill>
      </div>
      <div className="container">
        <nav>
          <Link
            href="/"
            rel="nofollow"
            data-title="Главная страница"
            onClick={toggleMenu}
          >
            <RiHome6Line></RiHome6Line>
            <span>Главная страница</span>
          </Link>
        </nav>
        {userSession ? (
          <nav>
            <Link
              href="https://profile.whilet.ru/my"
              rel="nofollow"
              target="_blank"
              data-title="Мой профиль"
              onClick={toggleMenu}
            >
              <RiAccountCircleLine></RiAccountCircleLine>
              <span>Мой профиль</span>
            </Link>
          </nav>
        ) : (
          <nav>
            <Link
              href="https://id.whilet.ru?redirect_uri=https://klicks.whilet.ru"
              rel="nofollow"
              data-title="Войти"
              onClick={toggleMenu}
            >
              <RiAccountCircleLine></RiAccountCircleLine>
              <span>Войти</span>
            </Link>
            <Link
              href="https://id.whilet.ru?redirect_uri=https://klicks.whilet.ru&page=signup"
              rel="nofollow"
              data-title="Зарегистрироваться"
              onClick={toggleMenu}
            >
              <RiAccountCircleLine></RiAccountCircleLine>
              <span>Зарегистрироваться</span>
            </Link>
          </nav>
        )}
        {userSession ? (
          <nav>
            <Link data-title="Мои ссылки" href="/my/links" onClick={toggleMenu}>
              <RiLink></RiLink>
              <span>Мои ссылки</span>
            </Link>
            <Link data-title="Мои тексты" href="/my/texts" onClick={toggleMenu}>
              <RiText></RiText> <span>Мои тексты</span>
            </Link>
            <Link data-title="Мои файлы" href="/my/files" onClick={toggleMenu}>
              <RiFileLine></RiFileLine> <span>Мои файлы</span>
            </Link>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
