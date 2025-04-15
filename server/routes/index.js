import express from "express";
import testRoutes from "./testRoutes.js"; 
import Geminires from "./llm.js";

const router = express.Router();

router.use("/test", testRoutes);          // Handles routes like /api/test/*
router.use("/Geminires", Geminires);      // Handles routes like /api/Geminires/GenerateResponse

export default router;
