import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import path from "path";
import fs from "fs";

export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { folderId } = req.body;
    const userId = req.userId!;

    const existing = await prisma.file.findFirst({
      where: {
        name: req.file.originalname,
        folderId: Number(folderId),
        userId
      },
      include: { versions: true }
    });

    if (existing) {
      const latestVersion = existing.versions.length
        ? Math.max(...existing.versions.map(v => v.version))
        : 0;

      const newVersion = await prisma.fileVersion.create({
        data: {
          fileId: existing.id,
          version: latestVersion + 1,
          storageName: req.file.filename,
          size: req.file.size
        }
      });

      await prisma.file.update({
        where: { id: existing.id },
        data: { currentVersionId: newVersion.id }
      });

      return res.json({ file: existing, version: newVersion, isNewVersion: true });
    }

    const file = await prisma.file.create({
      data: {
        name: req.file.originalname,
        folderId: Number(folderId),
        userId
      }
    });

    const version = await prisma.fileVersion.create({
      data: {
        fileId: file.id,
        version: 1,
        storageName: req.file.filename,
        size: req.file.size
      }
    });

    await prisma.file.update({
      where: { id: file.id },
      data: { currentVersionId: version.id }
    });

    res.json({ file, version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

export const uploadNewVersion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { fileId } = req.params;
    const userId = req.userId!;

    const file = await prisma.file.findUnique({
      where: { id: Number(fileId) },
      include: { versions: true }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.userId !== userId) {
      return res.status(403).json({ error: "Not your file" });
    }

    const latestVersion = file.versions.length
      ? Math.max(...file.versions.map(v => v.version))
      : 0;

    const nextVersion = latestVersion + 1;

    const newVersion = await prisma.fileVersion.create({
      data: {
        fileId: file.id,
        version: nextVersion,
        storageName: req.file.filename,
        size: req.file.size
      }
    });

    await prisma.file.update({
      where: { id: file.id },
      data: { currentVersionId: newVersion.id }
    });

    res.json({
      message: "New version uploaded",
      version: newVersion
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload new version" });
  }
};

export const getFileVersions = async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;
  const userId = req.userId!;

  try {
    const file = await prisma.file.findFirst({
      where: { id: Number(fileId), userId },
      include: { versions: { orderBy: { version: "desc" } } } }
    );

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(file.versions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch versions" });
  }
};

export const getFilesInFolder = async (req: AuthRequest, res: Response) => {
  const { folderId } = req.params;
  const userId = req.userId!;

  try {
    const files = await prisma.file.findMany({
      where: { folderId: Number(folderId), userId },
      include: { currentVersion: true }
    });

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;
  const userId = req.userId!;

  try {
    const file = await prisma.file.findUnique({
      where: { id: Number(fileId) },
      include: { versions: true }
    });

    if (!file || file.userId !== userId) {
      return res.status(403).json({ error: "Not your file" });
    }

    for (const v of file.versions) {
      const filePath = path.join(process.cwd(), "uploads", v.storageName);
      fs.promises.unlink(filePath).catch(() => {});
    }

    await prisma.fileVersion.deleteMany({
      where: { fileId: Number(fileId) }
    });

    await prisma.file.delete({
      where: { id: Number(fileId) }
    });

    res.json({ message: "File and all versions deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

export const deleteVersion = async (req: AuthRequest, res: Response) => {
  const { versionId } = req.params;
  const userId = req.userId!;

  try {
    const version = await prisma.fileVersion.findUnique({
      where: { id: Number(versionId) },
      include: { file: true }
    });

    if (!version || version.file.userId !== userId) {
      return res.status(403).json({ error: "Not your file" });
    }

    const file = await prisma.file.findUnique({
      where: { id: version.fileId },
      include: { versions: true }
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(process.cwd(), "uploads", version.storageName);
    fs.promises.unlink(filePath).catch(() => {});

    await prisma.fileVersion.delete({
      where: { id: Number(versionId) }
    });

    if (file.currentVersionId === version.id) {
      const remaining = file.versions
        .filter((v: { id: number }) => v.id !== version.id)
        .sort((a: { version: number }, b: { version: number }) => b.version - a.version);

      const newCurrent = remaining.length ? remaining[0].id : null;

      await prisma.file.update({
        where: { id: file.id },
        data: { currentVersionId: newCurrent }
      });
    }

    res.json({ message: "Version deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete version" });
  }
};

export const previewVersion = async (req: AuthRequest, res: Response) => {
  const { versionId } = req.params;
  const userId = req.userId!;

  try {
    const version = await prisma.fileVersion.findUnique({
      where: { id: Number(versionId) },
      include: { file: true }
    });

    if (!version || version.file.userId !== userId) {
      return res.status(404).json({ error: "Version not found" });
    }

    const filePath = path.join(process.cwd(), "uploads", version.storageName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Disposition", "inline");
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to preview file" });
  }
};

export const downloadVersion = async (req: AuthRequest, res: Response) => {
  const { versionId } = req.params;
  const userId = req.userId!;

  try {
    const version = await prisma.fileVersion.findUnique({
      where: { id: Number(versionId) },
      include: { file: true }
    });

    if (!version || version.file.userId !== userId) {
      return res.status(404).json({ error: "Version not found" });
    }

    const filePath = path.join(process.cwd(), "uploads", version.storageName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.download(filePath, version.file.name);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download file" });
  }
};
