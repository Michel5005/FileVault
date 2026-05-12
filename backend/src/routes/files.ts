import { Router } from "express";
import { upload } from "../utils/upload";
import {
  uploadFile,
  uploadNewVersion,
  getFilesInFolder,
  getFileVersions,
  previewVersion,
  downloadVersion,
  deleteFile,
  deleteVersion
} from "../controllers/fileController";

const router = Router();

router.post("/upload", upload.single("file"), uploadFile);
router.post("/version/:fileId", upload.single("file"), uploadNewVersion);

router.get("/folder/:folderId", getFilesInFolder);
router.get("/versions/:fileId", getFileVersions);
router.get("/preview/:versionId", previewVersion);
router.get("/download/:versionId", downloadVersion);

router.delete("/:fileId", deleteFile);
router.delete("/version/:versionId", deleteVersion);

export default router;
