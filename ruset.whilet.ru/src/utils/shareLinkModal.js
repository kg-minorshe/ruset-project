"use client";
import "./MiniModal.scss";

const modals = new Map();

const createModalRoot = () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    return root;
};

export const shareLinkModal = (login = "") => {
    // Создаем контекст для глобального управления модальными окнами
    const modalRoot = createModalRoot();

    // Создаем уникальный идентификатор для модального окна
    const modalId = Date.now().toString();

    // Добавляем модальное окно в хранилище
    modals.set(modalId, {
        login,
    });

    // Функция для открытия модального окна
    const openModal = () => {
        return new Promise((resolve) => {
            const modalElement = document.createElement('div');
            modalElement.className = 'MiniModal is-active';

            // Создаем структуру модального окна
            modalElement.innerHTML = `
                <div class="MiniModal-Box">
                    <div class="MiniModal-Container" style="max-width: 500px">
                        <article class="MiniModal-Content">
                            <header class="btns">
                                <button class="btn is-2" 
                                    aria-label="Закрыть модальное окно"
                                    title="Закрыть"
                                    type="button">
                                    <span aria-hidden="true">×</span>
                                </button>
                            </header>
                            <div class="title">
                                <h2 id="MiniModal-title">@${login}</h2>
                            </div>
                            <div class="text" id="MiniModal-content">
                               Вы можете скопировать текст как полную ссылку, либо как логин.
                            </div>
                            <div class="MiniModal-buttons">
                                <button>https://...</button>
                                <button>@${login}</button>
                            </div>
                        </article>
                    </div>
                </div>
            `;

            const svgIcon = modalElement.querySelector('#mini-modal-icon');

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
