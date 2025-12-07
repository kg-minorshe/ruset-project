// components/modals/CreateChannelModal.jsx
import React, { useState, useCallback } from "react";
import { BiX, BiBroadcast, BiImage, BiLock, BiGlobe } from "react-icons/bi";
import "./Modal.scss";
import { walert } from "@/utils/miniModal";
const CreateChannelModal = ({ isOpen, onClose, onSubmit }) => {
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelAvatar, setChannelAvatar] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [channelLink, setChannelLink] = useState("");

  const handleSubmit = useCallback(() => {
    if (!channelName.trim()) {
      walert(500, "Введите название канала");
      return;
    }

    const channelData = {
      name: channelName.trim(),
      description: channelDescription.trim(),
      avatar: channelAvatar,
      isPublic,
      link: isPublic ? channelLink.trim() : false,
      type: "channel",
    };

    onSubmit(channelData);
  }, [
    channelName,
    channelDescription,
    channelAvatar,
    isPublic,
    channelLink,
    onSubmit,
  ]);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setChannelAvatar(e.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  const generateLink = useCallback(() => {
    const randomId = Math.random().toString(36).substring(2, 8);
    setChannelLink(
      `${channelName.toLowerCase().replace(/\s+/g, "_")}_${randomId}`
    );
  }, [channelName]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content create-channel-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <BiBroadcast />
            Новый канал
          </h3>
          <button className="close-button" onClick={onClose}>
            <BiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="channel-settings">
            <div className="avatar-section">
              <div className="channel-avatar">
                {channelAvatar ? (
                  <img src={channelAvatar} alt="Channel avatar" />
                ) : (
                  <BiBroadcast />
                )}
                <label className="avatar-upload">
                  <BiImage />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    hidden
                  />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Название канала</label>
              <input
                type="text"
                placeholder="Введите название канала"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                maxLength={50}
              />
              <small>{channelName.length}/50</small>
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                placeholder="Введите описание канала"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <small>{channelDescription.length}/200</small>
            </div>

            <div className="channel-type">
              <div className="type-option">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="channelType"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  <span className="radio-mark"></span>
                  <div className="type-info">
                    <div className="type-title">
                      <BiGlobe />
                      Публичный канал
                    </div>
                    <div className="type-description">
                      Любой может найти и подписаться на канал
                    </div>
                  </div>
                </label>
              </div>

              <div className="type-option">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="channelType"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  <span className="radio-mark"></span>
                  <div className="type-info">
                    <div className="type-title">
                      <BiLock />
                      Приватный канал
                    </div>
                    <div className="type-description">
                      Только по ссылке-приглашению
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {isPublic && (
              <div className="form-group">
                <label>Ссылка на канал</label>
                <div className="link-input">
                  <span className="link-prefix">rs.whilet.ru/c/</span>
                  <input
                    type="text"
                    placeholder="channel_link"
                    value={channelLink}
                    onChange={(e) => setChannelLink(e.target.value)}
                    pattern="[a-zA-Z0-9_]+"
                  />
                  <button
                    type="button"
                    className="generate-link"
                    onClick={generateLink}
                    disabled={!channelName.trim()}
                  >
                    Сгенерировать
                  </button>
                </div>
                <small>Только латинские буквы, цифры и подчеркивания</small>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="create-button"
            onClick={handleSubmit}
            disabled={!channelName.trim()}
          >
            Создать канал
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChannelModal;
