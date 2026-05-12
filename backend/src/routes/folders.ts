import { Router } from "express";
import {
  createFolder,
  getFolders,
  deleteFolder,
  getFolderTree
} from "../controllers/folderController";

const router = Router();

router.post("/", createFolder);
router.get("/", getFolders);
router.delete("/:id", deleteFolder);
router.get("/tree", getFolderTree);

export default router;
