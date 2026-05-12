import { useRef, useImperativeHandle, forwardRef } from "react";

type Props = {
  onUpload: (file: File) => void;
  disabled?: boolean;
  label?: string;
};

export type UploadButtonHandle = {
  open: () => void;
};

const UploadButton = forwardRef<UploadButtonHandle, Props>(
  ({ onUpload, disabled = false, label = "Upload file" }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => inputRef.current?.click(),
    }));

    return (
      <button
        className="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {label}
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => {
            if (e.target.files?.length) {
              onUpload(e.target.files[0]);
              e.target.value = "";
            }
          }}
          style={{ display: "none" }}
        />
      </button>
    );
  }
);

UploadButton.displayName = "UploadButton";
export default UploadButton;
