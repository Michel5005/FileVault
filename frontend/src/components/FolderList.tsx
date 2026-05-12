import type { Folder } from "../types";

type Props = {
  folders: Folder[];
  onOpen: (folder: Folder) => void;
  onDelete: (id: number) => void;
};

export default function FolderList({ folders, onOpen, onDelete }: Props) {
  if (folders.length === 0) return null;

  return (
    <section>
      <div className="section-header">
        <h2>
          Folders
          <span className="section-count">{folders.length}</span>
        </h2>
      </div>
      <div className="item-grid">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="item-card"
            onClick={() => onOpen(folder)}
          >
            <div className="item-actions">
              <button
                className="danger"
                title="Delete folder"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder.id);
                }}
              >
                ✕
              </button>
            </div>
            <div className="item-icon">📁</div>
            <div className="item-name">{folder.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
