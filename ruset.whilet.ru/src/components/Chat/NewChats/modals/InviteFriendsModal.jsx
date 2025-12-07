// components/modals/InviteFriendsModal.jsx
import React, { useState, useCallback } from "react";
import { BiX, BiUserPlus, BiCopy, BiShare, BiEnvelope, BiLogoWhatsapp, BiLogoTelegram, BiLogoFacebook } from "react-icons/bi";
import "./Modal.scss";

const InviteFriendsModal = ({ isOpen, onClose, onSubmit }) => {
  const [inviteText, setInviteText] = useState("Присоединяйтесь ко мне в мессенджере! Это удобно и безопасно.");
  const [inviteLink] = useState("https://t.me/your_bot?start=invite_123");
  const [copied, setCopied] = useState(false);

  const shareOptions = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: BiLogoWhatsapp,
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(inviteText + ' ' + inviteLink)}`
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: BiLogoTelegram,
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(inviteText)}`
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: BiLogoFacebook,
      color: '#1877f2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`
    },
    {
      id: 'email',
      name: 'Email',
      icon: BiEnvelope,
      color: '#ea4335',
      url: `mailto:?subject=${encodeURIComponent('Приглашение в мессенджер')}&body=${encodeURIComponent(inviteText + '\n\n' + inviteLink)}`
    }
  ];

  const copyInviteText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteText + '\n\n' + inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [inviteText, inviteLink]);

  const handleShare = useCallback((option) => {
    if (option.id === 'native' && navigator.share) {
      navigator.share({
        title: 'Приглашение в мессенджер',
        text: inviteText,
        url: inviteLink
      });
    } else {
      window.open(option.url, '_blank', 'width=600,height=400');
    }
    
    onSubmit({
      method: option.id,
      text: inviteText,
      link: inviteLink
    });
  }, [inviteText, inviteLink, onSubmit]);

  const nativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Приглашение в мессенджер',
          text: inviteText,
          url: inviteLink
        });
        onSubmit({
          method: 'native',
          text: inviteText,
          link: inviteLink
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
  }, [inviteText, inviteLink, onSubmit]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-friends-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <BiUserPlus />
            Пригласить друзей
          </h3>
          <button className="close-button" onClick={onClose}>
            <BiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="invite-section">
            <div className="invite-text-section">
              <label>Текст приглашения</label>
              <textarea
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                placeholder="Введите текст приглашения"
                maxLength={200}
                rows={3}
              />
              <small>{inviteText.length}/200</small>
            </div>

            <div className="invite-link-section">
              <label>Ссылка-приглашение</label>
              <div className="link-container">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="link-input"
                />
                <button
                  className={`copy-button ${copied ? 'copied' : ''}`}
                  onClick={copyInviteText}
                >
                  <BiCopy />
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            </div>

            {navigator.share && (
              <div className="native-share">
                <button className="share-native-button" onClick={nativeShare}>
                  <BiShare />
                  Поделиться
                </button>
              </div>
            )}

            <div className="share-options">
              <h4>Поделиться через:</h4>
              <div className="share-grid">
                {shareOptions.map(option => (
                  <button
                    key={option.id}
                    className="share-option"
                    onClick={() => handleShare(option)}
                    style={{ '--option-color': option.color }}
                  >
                    <option.icon />
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="invite-stats">
              <h4>Статистика приглашений</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">12</div>
                  <div className="stat-label">Отправлено</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">5</div>
                  <div className="stat-label">Присоединились</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">7</div>
                  <div className="stat-label">Ожидают</div>
                </div>
              </div>
            </div>

            <div className="invite-tips">
              <h5>Советы для успешного приглашения:</h5>
              <ul>
                <li>Персонализируйте сообщение</li>
                <li>Объясните преимущества мессенджера</li>
                <li>Упомяните общие интересы</li>
                <li>Будьте дружелюбны и не навязчивы</li>
              </ul>
            </div>
          </div>
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

export default InviteFriendsModal;