import { useEffect, useState, useCallback, useRef } from "react";
import {
  getFolders,
  createFolder,
  deleteFolder,
} from "../api/folders";
import {
  getFilesInFolder,
  uploadFile,
  uploadVersion,
  deleteFile,
  getFileVersions,
  getDownloadUrl,
  getPreviewUrl,
} from "../api/files";
import { useAuth } from "../hooks/useAuth";
import type { Folder, FileItem, FileVersion } from "../types";
import { getFileIcon, formatSize, formatDate } from "../types";
import FolderList from "../components/FolderList";
import FileList from "../components/FileList";
import UploadButton, { type UploadButtonHandle } from "../components/UploadButton";

type Breadcrumb = { id: number | null; name: string };

function getPreviewCategory(name: string): "image" | "video" | "audio" | "pdf" | "text" | "other" {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (["txt", "rtf", "csv", "md", "log", "json", "xml", "js", "ts", "py", "html", "css", "java", "cpp", "rb", "yaml", "yml", "toml", "ini", "cfg", "sh", "bat", "sql", "env"].includes(ext)) return "text";
  return "other";
}

export default function Drive() {
  const { logout } = useAuth();
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, name: "My Drive" },
  ]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyFile, setHistoryFile] = useState<FileItem | null>(null);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<UploadButtonHandle>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const confirmAction = (message: string, action: () => void) => {
    setConfirm({ message, onConfirm: action });
  };

  const loadData = useCallback(async () => {
    try {
      const f = await getFolders(currentFolder);
      setFolders(f.data);

      if (currentFolder !== null) {
        const fl = await getFilesInFolder(currentFolder);
        setFiles(fl.data);
      } else {
        setFiles([]);
      }
    } catch {
      showError("Failed to load drive contents.");
    }
  }, [currentFolder]);

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  const navigateToFolder = (folder: Folder) => {
    setCurrentFolder(folder.id);
    setBreadcrumbs((prev) => [
      ...prev,
      { id: folder.id, name: folder.name },
    ]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolder(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName, currentFolder);
      setNewFolderName("");
      setShowNewFolder(false);
      loadData();
    } catch {
      showError("Failed to create folder.");
    }
  };

  const handleUpload = async (file: File) => {
    if (currentFolder === null) return;
    setUploading(true);
    try {
      await uploadFile(currentFolder, file);
      loadData();
    } catch {
      showError("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length && currentFolder !== null) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDeleteFolder = (id: number) => {
    confirmAction("Delete this folder and all its contents?", async () => {
      try {
        await deleteFolder(id);
        loadData();
      } catch {
        showError("Failed to delete folder.");
      }
    });
  };

  const handleDeleteFile = (id: number) => {
    confirmAction("Delete this file and all its versions?", async () => {
      try {
        await deleteFile(id);
        if (historyFile?.id === id) closeHistory();
        loadData();
      } catch {
        showError("Failed to delete file.");
      }
    });
  };

  const handleUploadVersion = async (fileId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    try {
      await uploadVersion(fileId, e.target.files[0]);
      if (historyFile?.id === fileId) {
        const v = await getFileVersions(fileId);
        setVersions(v.data);
      }
      loadData();
    } catch {
      showError("Failed to upload new version.");
    }
  };

  const openHistory = async (file: FileItem) => {
    setHistoryFile(file);
    setLoadingVersions(true);
    try {
      const v = await getFileVersions(file.id);
      setVersions(v.data);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const closeHistory = () => {
    setHistoryFile(null);
    setVersions([]);
  };

  const openPreview = async (file: FileItem) => {
    if (!file.currentVersion) return;
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewLoading(true);

    const token = localStorage.getItem("token");
    const category = getPreviewCategory(file.name);
    const previewEndpoint = getPreviewUrl(file.currentVersion.id);

    try {
      if (category === "image" || category === "video" || category === "audio" || category === "pdf") {
        const resp = await fetch(previewEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error("Fetch failed");
        const blob = await resp.blob();
        setPreviewUrl(URL.createObjectURL(blob));
      } else if (category === "text") {
        const resp = await fetch(previewEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error("Fetch failed");
        const text = await resp.text();
        setPreviewText(text);
      }
    } catch {
      setPreviewUrl(null);
      setPreviewText(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewLoading(false);
  };

  const downloadFile = async (versionId: number) => {
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(getDownloadUrl(versionId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const contentDisp = resp.headers.get("content-disposition");
      let filename = "download";
      if (contentDisp) {
        const match = contentDisp.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("Failed to download file.");
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          FileVault
        </div>

        <div className="sidebar-nav">
          <div
            className="sidebar-item active"
            onClick={() => navigateToBreadcrumb(0)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            My Drive
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        {error && (
          <div className="error-toast" onClick={() => setError(null)}>
            {error}
          </div>
        )}
        {/* Navbar with breadcrumbs */}
        <nav className="navbar">
          <div className="breadcrumbs">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <span className="breadcrumb-sep">/</span>}
                <button
                  className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? "current" : ""}`}
                  onClick={() => navigateToBreadcrumb(i)}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="content">
          {/* Toolbar */}
          <div className="toolbar">
            <button className="primary" onClick={() => setShowNewFolder(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              New folder
            </button>

            <UploadButton
              ref={uploadButtonRef}
              onUpload={handleUpload}
              disabled={currentFolder === null}
            />

            {uploading && (
              <span style={{ fontSize: "0.85rem", color: "var(--primary)" }}>
                Uploading...
              </span>
            )}
          </div>

          {/* New folder inline form */}
          {showNewFolder && (
            <div className="add-folder-row" style={{ marginBottom: 16 }}>
              <input
                type="text"
                className="toolbar-input"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createNewFolder()}
                autoFocus
              />
              <button className="primary" onClick={createNewFolder}>
                Create
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Drop zone (only inside a folder) */}
          {currentFolder !== null && (
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => uploadButtonRef.current?.open()}
            >
              <span className="drop-zone-icon">{"☁️"}</span>
              <div className="drop-zone-text">
                Drop files here to upload, or click to browse
              </div>
            </div>
          )}

          {/* Folders */}
          <FolderList
            folders={folders}
            onOpen={navigateToFolder}
            onDelete={handleDeleteFolder}
          />

          {/* Files */}
          {currentFolder !== null && (
            <section style={{ marginTop: folders.length > 0 ? 24 : 0 }}>
              <div className="section-header">
                <h2>
                  Files
                  <span className="section-count">{files.length}</span>
                </h2>
              </div>
              <FileList
                files={files}
                onDelete={handleDeleteFile}
                onDownload={downloadFile}
                onPreview={openPreview}
                onHistory={openHistory}
              />
            </section>
          )}

          {/* Root info when no folder is selected */}
          {currentFolder === null && folders.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-icon">{"🚀"}</span>
              <div>Your drive is empty</div>
              <div style={{ fontSize: "0.85rem", marginTop: 8 }}>
                Create a folder to start organizing your files
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version history overlay */}
      {historyFile && (
        <div className="overlay-backdrop" onClick={closeHistory}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>{historyFile.name} {"—"} Version history</h3>
              <button className="secondary" onClick={closeHistory}>{"✕"}</button>
            </div>

            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
              <input
                ref={versionInputRef}
                type="file"
                onChange={(e) => handleUploadVersion(historyFile.id, e)}
                style={{ display: "none" }}
              />
              <button
                className="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  versionInputRef.current?.click();
                }}
              >
                Upload new version
              </button>
            </div>

            {loadingVersions ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
                No versions found.
              </div>
            ) : (
              <div className="version-list">
                {versions.map((v) => (
                  <div key={v.id} className="version-row">
                    <div className="version-info">
                      <span className="version-badge">v{v.version}</span>
                      <span className="version-size">{formatSize(v.size)}</span>
                      <span className="version-date">{formatDate(v.createdAt)}</span>
                    </div>
                    <div className="version-actions">
                      <button
                        className="secondary"
                        title="Download this version"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(v.id);
                        }}
                      >
                        {"⇩"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File preview overlay */}
      {previewFile && (
        <div className="overlay-backdrop" onClick={closePreview}>
          <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h3>{previewFile.name}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {previewFile.currentVersion && (
                  <button
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(previewFile.currentVersion!.id);
                    }}
                  >
                    Download
                  </button>
                )}
                <button className="secondary" onClick={closePreview}>{"✕"}</button>
              </div>
            </div>

            <div className="preview-body">
              {previewLoading ? (
                <div className="preview-loading">Loading preview...</div>
              ) : (() => {
                const category = getPreviewCategory(previewFile.name);
                if (category === "image" && previewUrl) {
                  return <img className="preview-image" src={previewUrl} alt={previewFile.name} />;
                }
                if (category === "video" && previewUrl) {
                  return <video className="preview-video" src={previewUrl} controls autoPlay />;
                }
                if (category === "audio" && previewUrl) {
                  return (
                    <div className="preview-audio-wrap">
                      <div className="preview-audio-icon">{"🎵"}</div>
                      <audio className="preview-audio" src={previewUrl} controls autoPlay />
                    </div>
                  );
                }
                if (category === "pdf" && previewUrl) {
                  return <iframe className="preview-pdf" src={previewUrl} title={previewFile.name} />;
                }
                if (category === "text" && previewText !== null) {
                  return <pre className="preview-text">{previewText}</pre>;
                }
                return (
                  <div className="preview-unsupported">
                    <span className="preview-unsupported-icon">{getFileIcon(previewFile.name).icon}</span>
                    <div>Preview not available for this file type</div>
                    {previewFile.currentVersion && (
                      <button
                        className="primary"
                        style={{ marginTop: 12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(previewFile.currentVersion!.id);
                        }}
                      >
                        Download to view
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="overlay-backdrop" onClick={() => setConfirm(null)}>
          <div className="confirm-panel" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">{confirm.message}</p>
            <div className="confirm-actions">
              <button
                className="danger"
                onClick={() => {
                  const action = confirm.onConfirm;
                  setConfirm(null);
                  action();
                }}
              >
                Delete
              </button>
              <button className="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
