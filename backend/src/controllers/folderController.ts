import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from "express";

type FolderTree = {
  id: number;
  name: string;
  parentId: number | null;
  children: FolderTree[];
};

async function buildTree(folderId: number, userId: number): Promise<FolderTree[]> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, userId }
  });

  const result: FolderTree[] = [];

  for (const child of children) {
    const subtree = await buildTree(child.id, userId);
    result.push({
      id: child.id,
      name: child.name,
      parentId: child.parentId,
      children: subtree
    });
  }

  return result;
}

export const getFolderTree = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const roots = await prisma.folder.findMany({
      where: { parentId: null, userId }
    });

    const tree = [];

    for (const root of roots) {
      const children = await buildTree(root.id, userId);
      tree.push({ id: root.id, name: root.name, parentId: null, children });
    }

    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build folder tree" });
  }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  const { name, parentId } = req.body;
  const userId = req.userId!;

  try {
    if (parentId !== null && parentId !== undefined) {
      const parent = await prisma.folder.findUnique({ where: { id: Number(parentId) } });
      if (!parent || parent.userId !== userId) {
        return res.status(403).json({ error: "Not your folder" });
      }
    }

    const folder = await prisma.folder.create({
      data: { name, parentId, userId }
    });

    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: "Failed to create folder" });
  }
};

export const getFolders = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { parentId } = req.query;

  try {
    const folders = await prisma.folder.findMany({
      where: {
        userId,
        parentId: parentId ? Number(parentId) : null
      }
    });

    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch folders" });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const folder = await prisma.folder.findUnique({ where: { id: Number(id) } });
    if (!folder || folder.userId !== userId) {
      return res.status(403).json({ error: "Not your folder" });
    }

    await prisma.folder.delete({ where: { id: Number(id) } });
    res.json({ message: "Folder deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete folder" });
  }
};
