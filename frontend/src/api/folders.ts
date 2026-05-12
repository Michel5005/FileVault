import api from "./axios";

export const getFolders = (parentId: number | null) =>
  api.get("/folders", { params: { parentId } });

export const createFolder = (name: string, parentId: number | null) =>
  api.post("/folders", { name, parentId });

export const deleteFolder = (id: number) =>
  api.delete(`/folders/${id}`);

export const getFolderTree = () =>
  api.get("/folders/tree");
