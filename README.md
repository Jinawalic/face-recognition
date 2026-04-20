# Automated Exam Proctoring System (Next.js Version)

This is a modern Next.js project converted from a Vite/React + Express monolith.
The backend logic has been consolidated into Next.js Route Handlers.

## Features
- AI-powered proctoring using `face-api.js` and `coco-ssd`.
- Consolidated API logic in `src/app/api`.
- Premium aesthetics with Tailwind CSS 4 and Inter fonts.
- Client-side auth state with `AuthContext`.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
- `src/app`: Next.js App Router (Pages and API routes).
- `src/components`: UI components (migrated from legacy project).
- `src/lib`: Utility functions and context.
- `public/models`: AI model weights.

## API Routes
- `POST /api/auth/student-login`
- `POST /api/auth/admin-login`
- `POST /api/exam/list`
- `POST /api/proctor/report-violation`
- `...` (See `src/app/api` for details)
