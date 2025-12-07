"use client";
import { createRoot } from 'react-dom/client';
import Modal from '@/components/auxiliary/modal/Modal';

export function showModal({
    title = "Заголовок",
    content = "Контент",
    maxWidth = "800px",
    buttons = null
}) {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-' + Date.now();
    document.body.appendChild(modalContainer);

    const closeModal = () => {
        modalContainer.remove();
        document.body.classList.remove("is-scroll-none");
    };

    const root = createRoot(modalContainer);

    root.render(
        <Modal
            title={title}
            maxWidth={maxWidth}
            active="true"
            buttons={buttons}
            onClose={closeModal}
        >
            {content}
        </Modal>
    );

    document.body.classList.add("is-scroll-none");

    return closeModal;
}