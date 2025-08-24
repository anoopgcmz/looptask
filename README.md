# Looptask

A modern, full-stack task management app built for collaboration and productivity. Powered by Next.js 14+ (App Router) and TypeScript, Looptask leverages cutting-edge tech for performance, scalability, and developer experience.

## Features

- **Next.js 14+ (App Router)** — Lightning fast, server components, and seamless routing.
- **TypeScript** — Static typing for safety and refactoring.
- **Tailwind CSS** + [shadcn/ui](https://ui.shadcn.com/) + [lucide-react](https://lucide.dev/) — Beautiful, customizable UI components.
- **MongoDB Atlas** — Cloud-hosted database, modeled with Mongoose ODM.
- **Auth.js (NextAuth)** — Passwordless authentication with **email + OTP** (no passwords).
- **Zod** — Schema-based validation for robust input handling.
- **Agenda** — Mongo-backed job scheduler for reminders and daily snapshots.
- **WebSockets (Next.js server)** — Real-time updates for tasks and comments.
- **Resend** — Transactional emails (gracefully no-op if key missing).
- **React Query** — Smart client caching for optimal data fetching.
- **Vitest** + **Playwright** — Comprehensive unit and end-to-end testing.

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/anoopgcmz/looptask.git
   cd looptask
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Copy `.env.example` to `.env.local` and fill in your MongoDB Atlas, Resend, and NextAuth credentials.

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Run tests:**
   ```bash
   npm run test          # Vitest unit tests
   npm run test:e2e      # Playwright end-to-end tests
   ```

## Usage

- Register/sign in with your email (no passwords!).
- Collaborate on tasks, leave comments, and get real-time updates.
- Schedule reminders and receive daily snapshots.
- All sensitive operations are validated with Zod and protected via Auth.js.

## Tech Stack

| Category        | Stack/Library                |
|-----------------|-----------------------------|
| Frontend        | Next.js 14+, TypeScript, Tailwind, shadcn/ui, lucide-react |
| Backend         | Next.js API, MongoDB Atlas (Mongoose), Agenda, WebSockets  |
| Auth            | Auth.js (NextAuth) — Email + OTP                          |
| Validation      | Zod                                    |
| Email           | Resend                                  |
| Data Fetching   | React Query                             |
| Testing         | Vitest, Playwright                      |

## Project Structure

- `/app` — Next.js App Router pages/components.
- `/lib` — Shared utilities, validation schemas.
- `/models` — Mongoose models.
- `/jobs` — Agenda job definitions.
- `/components` — Reusable React components.
- `/tests` — Vitest and Playwright tests.

## Contributing

Pull requests and issues are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [anoopgcmz](https://github.com/anoopgcmz)