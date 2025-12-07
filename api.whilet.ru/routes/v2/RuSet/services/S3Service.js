// src/services/S3Service.js

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";

const s3Client = new S3Client({
  region: "ru-central1",
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.YANDEX_CLOUD_ACCESS_KEY || "",
    secretAccessKey: process.env.YANDEX_CLOUD_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET_NAME = "ruset";

class S3Service {
  static generateId() {
    return crypto.randomBytes(16).toString("hex");
  }

  static formatSize(bytes) {
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(2) + " GB";
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(2) + " MB";
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    }
    return bytes + " B";
  }

  static determineFileType(mimeType, originalName) {
    // Проверка на голосовое сообщение
    if (
      originalName.includes("Голосовое сообщение") &&
      mimeType === "audio/webm"
    ) {
      return "audio";
    }

    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("image/")) return "photo";
    return "file";
  }

  static async uploadFile(file, userId) {
    const originalSize = file.size;
    const originalName = file.originalname;
    const extension = originalName.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.mimetype;
    const fileType = this.determineFileType(mimeType, originalName);

    let fileBuffer = file.buffer;
    let finalExtension = extension;
    let finalMimeType = mimeType;
    let compressionInfo = {
      before: this.formatSize(originalSize),
      after: this.formatSize(originalSize),
      saved: "0 B",
      method: "нет сжатия",
    };

    // Сжатие изображений
    if (["jpg", "jpeg", "png"].includes(extension)) {
      try {
        const compressedBuffer = await sharp(file.buffer)
          .jpeg({ quality: 60 })
          .toBuffer();

        if (compressedBuffer.length < originalSize) {
          fileBuffer = compressedBuffer;
          finalExtension = "jpg";
          finalMimeType = "image/jpeg";
          compressionInfo = {
            before: this.formatSize(originalSize),
            after: this.formatSize(compressedBuffer.length),
            saved: this.formatSize(originalSize - compressedBuffer.length),
            method: "JPEG с качеством 60%",
          };
        } else {
          compressionInfo.method =
            "Оригинал сохранен (сжатие не уменьшило размер)";
        }
      } catch (error) {
        console.error("Image compression error:", error);
        compressionInfo.method = "Ошибка сжатия, сохранен оригинал";
      }
    }

    const storageFileName = `w_${userId}_${this.generateId()}_${Date.now()}.${finalExtension}`;
    const objectKey = `chat/messages/${storageFileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: finalMimeType,
      })
    );

    const url = `https://storage.yandexcloud.net/${BUCKET_NAME}/${objectKey}`;

    return {
      url,
      name: originalName,
      storage_name: storageFileName,
      size: fileBuffer.length,
      type: fileType,
      compression: compressionInfo,
    };
  }

  static async uploadAvatar(base64Data, userId, type) {
    try {
      // Извлекаем данные из base64
      const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return { success: false, message: "Неверный формат изображения" };
      }

      const imageType = matches[1].toLowerCase();
      const base64Content = matches[2];

      const allowedTypes = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!allowedTypes.includes(imageType)) {
        return {
          success: false,
          message: "Неподдерживаемый формат изображения",
        };
      }

      const imageBuffer = Buffer.from(base64Content, "base64");

      // Проверка размера (5 МБ)
      if (imageBuffer.length > 5 * 1024 * 1024) {
        return { success: false, message: "Размер изображения превышает 5 МБ" };
      }

      // Оптимизация изображения
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(512, 512, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      const fileName = `avatar_${type}_${userId}_${Date.now()}.jpg`;
      const objectKey = `chat/avatars/${fileName}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: objectKey,
          Body: optimizedBuffer,
          ContentType: "image/jpeg",
          ACL: "public-read",
        })
      );

      const url = `https://storage.yandexcloud.net/${BUCKET_NAME}/${objectKey}`;

      return { success: true, url, message: "Аватар успешно загружен" };
    } catch (error) {
      console.error("Avatar upload error:", error);
      return {
        success: false,
        message: `Ошибка загрузки аватара: ${error.message}`,
      };
    }
  }

  static async deleteFile(url) {
    try {
      const urlParts = new URL(url);
      const objectKey = urlParts.pathname.replace(/^\/[^/]+\//, "");

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: objectKey,
        })
      );

      return true;
    } catch (error) {
      console.error("File deletion error:", error);
      return false;
    }
  }

  static async deleteFiles(files) {
    const deleted = [];
    const errors = [];

    for (const file of files) {
      let objectKey = null;

      if (file.storage_name) {
        objectKey = `chat/messages/${file.storage_name}`;
      } else if (file.url) {
        try {
          const urlParts = new URL(file.url);
          objectKey = urlParts.pathname.replace(/^\/[^/]+\//, "");
        } catch {
          errors.push("Неверный URL файла");
          continue;
        }
      }

      if (!objectKey) {
        errors.push("Не удалось определить ключ для файла");
        continue;
      }

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
          })
        );
        deleted.push(objectKey);
      } catch (error) {
        errors.push(`Ошибка удаления ${objectKey}: ${error.message}`);
      }
    }

    return { deleted, errors };
  }
}

export { S3Service };
