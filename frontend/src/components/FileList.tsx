import type { FileItem } from "../types";
import { getFileIcon, formatSize } from "../types";

type Props = {
  files: FileItem[];
  onDelete: (id: number) => void;
  onDownload: (versionId: number) => void;
  onPreview: (file: FileItem) => void;
  onHistory: (file: FileItem) => void;
};

export default function FileList({ files, onDelete, onDownload, onPreview, onHistory }: Props) {
  if (files.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">📂</span>
        <div>No files yet. Upload something!</div>
      </div>
    );
  }

  return (
    <div className="item-grid">
      {files.map((file) => {
        const { icon, typeClass } = getFileIcon(file.name);
        return (
          <div key={file.id} className="item-card" onClick={() => onPreview(file)}>
            <div className="item-actions">
              {file.currentVersion && (
                <button
                  className="secondary"
                  title="Download"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file.currentVersion!.id);
                  }}
                >
                  ⬇
                </button>
              )}
              <button
                className="secondary"
                title="Version history"
                onClick={(e) => {
                  e.stopPropagation();
                  onHistory(file);
                }}
              >
                📋
              </button>
              <button
                className="danger"
                title="Delete file"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file.id);
                }}
              >
                ✕
              </button>
            </div>
            <div className={`item-icon ${typeClass}`}>{icon}</div>
            <div className="item-name">{file.name}</div>
            {file.currentVersion && (
              <div className="item-meta">
                <span className="version-badge">
                  v{file.currentVersion.version}
                </span>{" "}
                {formatSize(file.currentVersion.size)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
