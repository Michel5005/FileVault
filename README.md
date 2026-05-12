# FileVault

Personal cloud storage application — a simplified Google Drive clone with folder management, file versioning, and inline previews.

## Features

- **Authentication** — Register and log in with email/password (JWT-based)
- **Folder management** — Create, delete, and navigate nested folders with breadcrumb navigation
- **File upload** — Upload files into folders via button or drag-and-drop
- **File versioning** — Uploading a file with the same name auto-creates a new version; view version history and upload new versions explicitly
- **File preview** — Inline preview for images, video, audio, PDF, and text/code files
- **File download** — Download any version of a file with the original filename preserved
- **File deletion** — Delete an entire file (and all versions) or delete a single version

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js, Express 5, Prisma 5, PostgreSQL, JWT, Multer |
| Frontend | React 19, React Router 7, Axios, Vite 8, TypeScript |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### 1. Configure environment

Create `backend/.env`:

```
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/driveapp"
JWT_SECRET=your-secret-key
```

### 2. Start the backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

The API server runs on `http://localhost:5000`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`.

## API Endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register with email + password |
| POST | `/auth/login` | Login; returns JWT token |

### Folders (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/folders?parentId=` | List folders at a given parent |
| POST | `/folders` | Create a folder |
| DELETE | `/folders/:id` | Delete a folder |
| GET | `/folders/tree` | Get full nested folder tree |

### Files (auth required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/files/upload` | Upload a file (auto-versions if name exists) |
| POST | `/files/version/:fileId` | Upload a new version of an existing file |
| GET | `/files/folder/:folderId` | List files in a folder |
| GET | `/files/versions/:fileId` | Get version history for a file |
| GET | `/files/preview/:versionId` | Stream/preview a file version |
| GET | `/files/download/:versionId` | Download a file version |
| DELETE | `/files/:fileId` | Delete a file and all its versions |
| DELETE | `/files/version/:versionId` | Delete a single version |

## Database Schema

```
User
├── id (PK)
├── email (unique)
├── password (bcrypt hash)
└── createdAt

Folder
├── id (PK)
├── name
├── userId (FK → User)
├── parentId (FK → Folder, self-referential)
└── createdAt / deletedAt

File
├── id (PK)
├── name
├── userId (FK → User)
├── folderId (FK → Folder)
├── currentVersionId (FK → FileVersion)
└── createdAt / deletedAt

FileVersion
├── id (PK)
├── fileId (FK → File)
├── version (sequential number)
├── storageName (disk filename)
├── size (bytes)
└── createdAt
```

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── server.ts
│   ├── lib/prisma.ts
│   ├── middleware/authMiddleware.ts
│   ├── routes/auth.ts
│   ├── routes/folders.ts
│   ├── routes/files.ts
│   └── utils/upload.ts
└── uploads/            # stored files

frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── axios.ts
│   │   ├── auth.ts
│   │   ├── files.ts
│   │   └── folders.ts
│   ├── components/
│   │   ├── FileList.tsx
│   │   ├── FolderList.tsx
│   │   └── UploadButton.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   └── pages/
│       ├── Login.tsx
│       ├── Register.tsx
│       └── Drive.tsx
└── public/
```
