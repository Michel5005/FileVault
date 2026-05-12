export type Folder = {
  id: number;
  name: string;
  parentId: number | null;
};

export type FileVersion = {
  id: number;
  storageName: string;
  version: number;
  size: number;
  createdAt: string;
};

export type FileItem = {
  id: number;
  name: string;
  currentVersion?: FileVersion;
  versions?: FileVersion[];
};

export function getFileIcon(name: string): { icon: string; typeClass: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext))
    return { icon: "🖼️", typeClass: "file-type-image" };
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return { icon: "🎬", typeClass: "file-type-video" };
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext))
    return { icon: "🎵", typeClass: "file-type-audio" };
  if (["doc", "docx", "pdf", "txt", "rtf", "odt"].includes(ext))
    return { icon: "📄", typeClass: "file-type-document" };
  if (["js", "ts", "py", "html", "css", "json", "xml", "java", "cpp", "rb"].includes(ext))
    return { icon: "💻", typeClass: "file-type-code" };
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { icon: "📦", typeClass: "file-type-archive" };
  return { icon: "📎", typeClass: "file-type-default" };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
