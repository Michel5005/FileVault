import api, { baseURL } from "./axios";

export const uploadFile = (folderId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  form.append("folderId", String(folderId));
  return api.post("/files/upload", form);
};

export const uploadVersion = (fileId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/files/version/${fileId}`, form);
};

export const getFilesInFolder = (folderId: number) =>
  api.get(`/files/folder/${folderId}`);

export const getFileVersions = (fileId: number) =>
  api.get(`/files/versions/${fileId}`);

export const getDownloadUrl = (versionId: number) =>
  `${baseURL}/files/download/${versionId}`;

export const getPreviewUrl = (versionId: number) =>
  `${baseURL}/files/preview/${versionId}`;

export const deleteFile = (fileId: number) =>
  api.delete(`/files/${fileId}`);

export const deleteVersion = (versionId: number) =>
  api.delete(`/files/version/${versionId}`);
