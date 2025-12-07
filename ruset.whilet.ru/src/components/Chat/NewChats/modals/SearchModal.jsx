// components/modals/SearchModal.jsx
import React, { useState, useCallback, useEffect } from "react";
import {
  BiX,
  BiSearch,
  BiUser,
  BiPhone,
  BiAt,
  BiLoaderAlt,
} from "react-icons/bi";
import "./Modal.scss";
import { walert } from "@/utils/miniModal";

const SearchModal = ({ isOpen, onClose, onSubmit, onChatSelect }) => {
  const [searchType, setSearchType] = useState("username");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("recentUserSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  const saveRecentSearch = useCallback(
    (query) => {
      const newSearches = [
        query,
        ...recentSearches.filter((s) => s !== query),
      ].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem("recentUserSearches", JSON.stringify(newSearches));
    },
    [recentSearches]
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    saveRecentSearch(searchQuery.trim());

    try {
      const token = localStorage.getItem("WTOKEN");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL_API_MAIN}/v2/ruset/search/users?query=${encodeURIComponent(
          searchQuery.trim()
        )}&type=${searchType}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.status === 200) {
        setSearchResults(data.data.results || []);
      } else {
        walert(data.status, data.message || "Ошибка поиска");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      walert(500, "Ошибка при поиске пользователей");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchType, saveRecentSearch]);

  const handleResultClick = useCallback(
    (user) => {
      onSubmit({ type: "user", data: user });
      onClose();
    },
    [onSubmit, onClose]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("recentUserSearches");
  }, []);

  const handleRecentClick = useCallback(
    (query) => {
      setSearchQuery(query);
      setTimeout(() => {
        const token = localStorage.getItem("WTOKEN");
        setIsSearching(true);

        fetch(
          `${process.env.NEXT_PUBLIC_URL_API_MAIN}/v2/ruset/search/users?query=${encodeURIComponent(
            query
          )}&type=${searchType}`,
          {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.status === 200) {
              setSearchResults(data.data.results || []);
            } else {
              walert(data.status, data.message || "Ошибка поиска");
              setSearchResults([]);
            }
          })
          .catch((error) => {
            console.error("Search error:", error);
            walert(500, "Ошибка при поиске пользователей");
            setSearchResults([]);
          })
          .finally(() => {
            setIsSearching(false);
          });
      }, 100);
    },
    [searchType]
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content search-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <BiSearch />
            Поиск пользователей
          </h3>
          <button className="close-button" onClick={onClose}>
            <BiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="search-container">
            <input
              type="text"
              placeholder="Введите логин или номер телефона пользователя"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="search-input"
            />
            <button
              className="search-button"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
            >
              {isSearching ? <BiLoaderAlt className="spin" /> : "Найти"}
            </button>
          </div>

          {recentSearches.length > 0 &&
            searchResults.length === 0 &&
            !isSearching && (
              <div className="recent-searches">
                <div className="section-header">
                  <h4>Недавние поиски</h4>
                  <button
                    className="clear-button"
                    onClick={clearRecentSearches}
                  >
                    Очистить
                  </button>
                </div>
                <div className="recent-list">
                  {recentSearches.map((query, index) => (
                    <div
                      key={index}
                      className="recent-item"
                      onClick={() => handleRecentClick(query)}
                    >
                      <BiSearch />
                      <span>{query}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Результаты поиска ({searchResults.length})</h4>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="user-result"
                  onClick={() => onChatSelect(user)}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" />
                    ) : (
                      <BiUser />
                    )}
                    {user.isOnline && <div className="online-dot"></div>}
                  </div>
                  <div className="user-info">
                    <div className="user-name">
                      {user.username}
                      {user.verified && <span className="verified">✓</span>}
                    </div>
                    <div className="user-login">@{user.login}</div>
                    {user.description && (
                      <div className="user-description">{user.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="searching">
              <BiLoaderAlt className="spinner spin" />
              <span>Поиск пользователей...</span>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="no-results">
              <BiSearch />
              <p>Пользователи не найдены</p>
              <small>Попробуйте изменить поисковый запрос</small>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
