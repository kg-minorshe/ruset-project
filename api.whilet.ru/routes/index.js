import express from "express";
import { Vostok1 } from "../modules/Vostok1/index.js";
import chatRoutes from "./sse/RuSet/chat/index.js";
import profileRoutes from "./v2/profile/index.js";
import securityRoutes from "./v2/security/index.js";
import ipRoutes from "./v2/ip/index.js";
import rusetChatRoutes from "./v2/RuSet/index.js";
const router = express.Router();

router.get("/c", async (req, res, next) => {
  try {
    const v1 = new Vostok1(req, res, next);
    const result = v1.security.generateHash();
    res.status(200).json({
      status: 200,
      message: result,
    });
  } catch (error) {
    next(error);
  }
});

router.use("/sse/ruset/chat", chatRoutes);

router.use("/v2/profile", profileRoutes);

router.use("/v2/security", securityRoutes);

router.use("/v2/ip", ipRoutes);

router.use("/v2/ruset", rusetChatRoutes);

export default router;
