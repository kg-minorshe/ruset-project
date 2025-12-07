import { BiX, BiChevronUp, BiChevronDown } from "react-icons/bi";
import "./SearchBox.scss";
import { useEffect, useRef } from "react";

export function SearchBox({
  searchQuery,
  setSearchQuery,
  onSearch,
  searchResults,
  currentIndex,
  onNext,
  onPrev,
  onClose,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery]);
  return (
    <div className="SearchBox">
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск сообщений..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="search-controls">
          {searchResults.length > 0 && (
            <>
              <span className="search-counter">
                {currentIndex + 1} из {searchResults.length}
              </span>
              <button onClick={onPrev} disabled={searchResults.length === 0}>
                <BiChevronUp />
              </button>
              <button onClick={onNext} disabled={searchResults.length === 0}>
                <BiChevronDown />
              </button>
            </>
          )}
          <button onClick={onClose} className="close-search">
            <BiX />
          </button>
        </div>
      </div>
    </div>
  );
}
