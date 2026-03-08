# TRM Platform - Frontend

AI-Powered Talent Relationship Management Platform - Next.js Frontend

## Technology Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context (to be added)
- **Forms:** React Hook Form + Zod (to be added)
- **HTTP Client:** Fetch API / Axios (to be added)
- **Charts:** Recharts (to be added)

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Super Admin Portal pages
│   ├── client/            # Client Portal pages
│   ├── apply/             # Public candidate pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── client/           # Client-specific components
│   ├── candidate/        # Candidate-facing components
│   └── shared/           # Shared/common components
├── lib/                   # Utilities and helpers
│   ├── api/              # API client functions
│   ├── auth/             # Authentication utilities
│   └── utils/            # General utilities
├── types/                 # TypeScript type definitions
└── public/               # Static assets

```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features (Planned)

### Super Admin Portal
- [ ] Authentication (login, logout, password reset)
- [ ] Dashboard with analytics
- [ ] Client management (CRUD)
- [ ] Platform analytics and monitoring

### Client Portal
- [ ] Authentication (signup, login, logout)
- [ ] Requirements management (create, edit, view, delete)
- [ ] Candidate database with advanced search
- [ ] Analytics dashboard
- [ ] Settings and customization

### Candidate Experience
- [ ] Public job pages
- [ ] AI Assistant chat interface
- [ ] CV Evaluator with conversational form
- [ ] Talent Pool registration

## Development Progress

See [PROGRESS.md](../PROGRESS.md) in the root directory for current development status.

## License

Proprietary
