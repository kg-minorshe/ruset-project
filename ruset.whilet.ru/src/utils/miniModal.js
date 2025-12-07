"use client";
import "./MiniModal.scss";

const modals = new Map();

const createModalRoot = () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    return root;
};

export const walert = (code = "500", content = "-", details = false, maxWidth = "350px") => {
    // Создаем контекст для глобального управления модальными окнами
    const modalRoot = createModalRoot();

    // Создаем уникальный идентификатор для модального окна
    const modalId = Date.now().toString();

    // Добавляем модальное окно в хранилище
    modals.set(modalId, {
        code,
        content,
        maxWidth
    });

    // Функция для открытия модального окна
    const openModal = () => {
        return new Promise((resolve) => {
            const modalState = {
                isOpen: true,
                code,
                content,
                maxWidth
            };

            const modalElement = document.createElement('div');
            modalElement.className = 'MiniModal is-active';

            // Создаем структуру модального окна
            modalElement.innerHTML = `
                <div class="MiniModal-Box">
                    <div class="MiniModal-Container" style="max-width: ${maxWidth}">
                        <article class="MiniModal-Content">
                            <header class="btns">
                                <button class="btn is-2" 
                                    aria-label="Закрыть модальное окно"
                                    title="Закрыть"
                                    type="button">
                                    <span aria-hidden="true">×</span>
                                </button>
                            </header>
                            <svg id="mini-modal-icon" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M11.001 10h2v5h-2zM11 16h2v2h-2z"></path><path d="M13.768 4.2C13.42 3.545 12.742 3.138 12 3.138s-1.42.407-1.768 1.063L2.894 18.064a1.986 1.986 0 0 0 .054 1.968A1.984 1.984 0 0 0 4.661 21h14.678c.708 0 1.349-.362 1.714-.968a1.989 1.989 0 0 0 .054-1.968L13.768 4.2zM4.661 19 12 5.137 19.344 19H4.661z"></path></svg>
                            <div class="title">
                                <h2 id="MiniModal-title">${code}</h2>
                            </div>
                            <div class="text" id="MiniModal-content">
                                ${typeof content === 'string' ? content : ''}
                            </div>
                            ${details ? `<details id="mini-modal-details"><summary>Подробности</summary><div >${details}</div></details>` : ""}
                        </article>
                    </div>
                </div>
            `;

            const svgIcon = modalElement.querySelector('#mini-modal-icon');
            const detailsElement = modalElement.querySelector('#mini-modal-details');
            const detailsContent = modalElement.querySelector('#mini-modal-details div');

            if (detailsElement) {
                detailsElement.addEventListener('toggle', (event) => {
                    if (event.target.open) {
                        svgIcon.style.fontSize = '0em';
                    } else {
                        svgIcon.style.fontSize = '7em';
                    }
                });
            }

            if (detailsContent) {
                detailsContent.addEventListener('click', (event) => {
                    const text = event.target.textContent;
                    if (text && text.trim() !== '') {
                        navigator.clipboard.writeText(text);
                    }
                });
            }
            // Добавляем обработчик закрытия
            const closeButton = modalElement.querySelector('button');
            closeButton.addEventListener('click', () => {
                removeModal(modalId);
                resolve();
            });

            // Добавляем обработчик клика вне модального окна
            document.body.addEventListener('click', (event) => {
                if (event.target === modalElement) {
                    removeModal(modalId);
                    resolve();
                }
            });

            // Добавляем модальное окно в DOM
            modalRoot.appendChild(modalElement);
            document.body.classList.add('is-scroll-none');
        });
    };

    // Функция для удаления модального окна
    const removeModal = (id) => {
        if (modals.has(id)) {
            modals.delete(id);
            document.body.classList.remove('is-scroll-none');
            modalRoot.remove();
        }
    };

    // Открываем модальное окно
    return openModal();
};
