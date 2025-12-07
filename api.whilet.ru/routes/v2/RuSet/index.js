import express from "express";
import multer from "multer";
import { RuSetController } from "./controllers/index.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024,
  },
});

router.get("/search/users", RuSetController.searchUsers);
router.get("/search/chats", RuSetController.searchChats);

router.get("/contacts", RuSetController.getContacts);

router.post("/chats/:id/participants", RuSetController.addParticipants);
router.post("/chats/:login/join", RuSetController.joinChat);

router.get("/getMyChats", RuSetController.getMyChats);

router.get("/chat/getChatInfo/:id", RuSetController.getChatInfo);
router.get("/chat/getMessages/:id", RuSetController.getMessages);
router.get("/chat/getCurrentUser", RuSetController.getCurrentUser);
router.post("/chat/sendMessage/:id", RuSetController.sendMessage);
router.post("/chat/editMessage/:cid/:mid", RuSetController.editMessage);
router.post("/chat/toggleReaction/:mid", RuSetController.toggleReaction);
router.post("/chat/pinMessage/:cid/:mid", RuSetController.pinMessage);
router.delete("/chat/deleteMessages/:cid", RuSetController.deleteMessages);
router.delete("/chat/deleteChat/:cid", RuSetController.deleteChat);
router.post("/chat/uploadFile", upload.single("file"), RuSetController.uploadFile);
router.post("/chat/deleteFiles", RuSetController.deleteFiles);
router.get("/chat/checkMessages/:id", RuSetController.checkMessages);
router.post("/chat/:id/avatar", RuSetController.updateAvatar);

router.post("/new/createGroup", RuSetController.createGroup);
router.post("/new/createChannel", RuSetController.createChannel);

export default router;