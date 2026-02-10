# File Explorer

A responsive web-based file file-explorer built with React and Express, designed for sandbox environments.

## Features
- **Browse & Navigate**: Multi-level directory browsing with a breadcrumb path bar.
- **File Viewer**: Built-in support for viewing text, images (`jpg`, `png`, `gif`, `webp`), and videos (`mp4`, `webm`, `ogg`).
- **File Management**: Proactive file and folder deletion (with confirmation).
- **Responsive UI**: Mobile-friendly design with touch support (long-press for context menu).
- **Security**: Strict sandbox enforcement preventing access outside the designated data root.
- **Version Tracking**: Automatic Git SHA verification between frontend and backend to ensure deployment consistency.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express.
- **Infrastructure**: Docker & Docker Compose support.

## Project Structure
- `/backend`: Express API server providing file operations.
- `/frontend`: React SPA for the user interface.
- `/tests/sandbox/mock_root`: Default sandbox data directory for development and testing.
