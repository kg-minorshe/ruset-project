// components/modals/QRCodeModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import { BiX, BiQr, BiCopy, BiShare, BiRefresh } from "react-icons/bi";
import QRCode from "qrcode";
import "./Modal.scss";

const QRCodeModal = ({ isOpen, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInviteLink = useCallback(() => {
    // Здесь будет API вызов для генерации ссылки-приглашения
    const userId = "current_user_id"; // Получить из контекста
    const inviteId = Math.random().toString(36).substring(2, 15);
    return `https://t.me/your_bot?start=${userId}_${inviteId}`;
  }, []);

  const generateQRCode = useCallback(async (text) => {
    try {
      const url = await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const link = generateInviteLink();
      setInviteLink(link);
      generateQRCode(link);
    }
  }, [isOpen, generateInviteLink, generateQRCode]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [inviteLink]);

  const shareLink = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Присоединяйтесь ко мне в мессенджере",
          text: "Присоединяйтесь ко мне в мессенджере",
          url: inviteLink
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      copyToClipboard();
    }
  }, [inviteLink, copyToClipboard]);

  const refreshLink = useCallback(() => {
    const newLink = generateInviteLink();
    setInviteLink(newLink);
    generateQRCode(newLink);
  }, [generateInviteLink, generateQRCode]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <BiQr />
            QR-код для приглашения
          </h3>
          <button className="close-button" onClick={onClose}>
            <BiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="qr-section">
            <div className="qr-code">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" />
              ) : (
                <div className="qr-placeholder">
                  <BiQr />
                  <span>Генерация QR-кода...</span>
                </div>
              )}
            </div>

            <div className="qr-description">
              <h4>Поделитесь этим QR-кодом</h4>
              <p>Отсканируйте камерой телефона или поделитесь ссылкой</p>
            </div>

            <div className="invite-link">
              <div className="link-container">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="link-input"
                />
                <button
                  className={`copy-button ${copied ? 'copied' : ''}`}
                  onClick={copyToClipboard}
                >
                  <BiCopy />
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            </div>

            <div className="action-buttons">
              <button className="share-button" onClick={shareLink}>
                <BiShare />
                Поделиться
              </button>
              <button className="refresh-button" onClick={refreshLink}>
                <BiRefresh />
                Обновить ссылку
              </button>
            </div>

            <div className="qr-info">
              <h5>Как это работает:</h5>
              <ul>
                <li>Покажите QR-код другу</li>
                <li>Он сканирует его камерой телефона</li>
                <li>Автоматически откроется чат с вами</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-button-footer" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;