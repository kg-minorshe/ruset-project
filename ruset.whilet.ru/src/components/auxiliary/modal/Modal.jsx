"use client";
import "./Modal.scss";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { useEffect } from "react";
import { IoMdResize } from "react-icons/io";

export default function Modal({
  maxWidth = "800px",
  children = "Контент",
  title = "Заголовок",
  active = false,
  buttons = null,
  onClose,
}) {
  const closeModal = (element) => {
    const modal = element.closest(".Modal");
    modal.classList.remove("is-active");
    document.body.classList.remove("is-scroll-none");
    modal.classList.remove("is-fullwidth");

    if (onClose) {
      setTimeout(() => onClose(), 200);
    }
  };

  const toggleFullwidth = (element) => {
    const modal = element.closest(".Modal");
    modal.classList.toggle("is-fullwidth");
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (active) {
      document.body.classList.add("is-scroll-none");
    }
  }, [active]);

  return (
    <div
      className={`Modal ${active ? "is-active" : ""} ${
        buttons ? "is-btns" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-content"
      aria-hidden={!active}
    >
      <div className="Modal-Box">
        <div className="Modal-Container" style={{ maxWidth: maxWidth }}>
          <article className="Modal-Content">
            <header className="btns">
              <button
                className="btn is-1"
                onClick={(e) => toggleFullwidth(e.target)}
                aria-label="Развернуть модальное окно на весь экран"
                title="Развернуть на весь экран"
                type="button"
              >
                <IoMdResize aria-hidden="true"></IoMdResize>
              </button>
              <button
                className="btn is-2"
                onClick={(e) => closeModal(e.target)}
                aria-label="Закрыть модальное окно"
                title="Закрыть"
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="title">
              <h2
                id="modal-title"
                dangerouslySetInnerHTML={{ __html: title }}
              ></h2>
            </div>
            <SimpleBar
              style={{
                position: "relative",
                zIndex: 3,
              }}
              autoHide={true}
              className="custom-scrollbar"
              role="region"
              aria-label="Содержимое модального окна"
            >
              <div className="text" id="modal-content">
                {typeof children === "string" ? (
                  <div dangerouslySetInnerHTML={{ __html: children }} />
                ) : (
                  children
                )}
              </div>
            </SimpleBar>
            {buttons && (
              <footer
                className="buttons"
                role="group"
                aria-label="Действия модального окна"
              >
                {buttons.map((a, index) => (
                  <button
                    key={"btn-" + index}
                    onClick={(e) => {
                      e.preventDefault();
                      if (a.onClick) {
                        a.onClick();
                      }
                      if (a.close) {
                        closeModal(e.target);
                        if (a.href && a.href !== "#") {
                          setTimeout(() => {
                            window.open(a.href, a.target || "_parent");
                          }, 200);
                        }
                      } else if (a.href && a.href !== "#") {
                        window.open(a.href, a.target || "_parent");
                      }
                    }}
                    className={`modal-btn ${
                      a.fullwidth ? "is-fullwidth" : null
                    }`}
                    type="button"
                    aria-label={a.ariaLabel || a.name || "Кнопка"}
                    title={a.title || a.name || "Кнопка"}
                  >
                    {a.name ?? "Кнопка"}
                  </button>
                ))}
              </footer>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
