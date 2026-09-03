# Ploovo! Project Context

## Product

Ploovo! is a Korean classroom quiz game platform inspired by Blooket and Gimkit.
The first test users will be students and teachers at the user's school.

The product should feel playful and game-like, but not overly flashy or generic.
Korean UI copy should sound natural, short, and written by a real person.

## Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Auth.js / NextAuth
- Prisma
- PostgreSQL planned for production
- Lucide React for dashboard and editor icons

## Current Implementation

- Hero-only landing page at `/`
- Game PIN input on the landing page
- Entering a PIN redirects to `/login?role=student&pin=...`
- Login page at `/login`
- Role selection before login:
  - Teacher: account login
  - Student: Game PIN and nickname
- Student PIN is preserved when passed from the landing page
- Google login is wired through Auth.js
- Kakao and Naver login buttons exist in the UI but are disabled for now
- Protected teacher dashboard exists at `/dashboard`
- Unauthenticated dashboard access redirects to `/login?role=teacher`
- Auth.js uses database sessions with a one-year maximum lifetime and daily session refresh
- Logged-in teachers who revisit `/login` are redirected to `/dashboard`
- Next.js 16 `proxy.ts` protects `/dashboard/:path*`
- The teacher dashboard uses a compact Gimkit-inspired working layout:
  - Fixed desktop sidebar and mobile menu
  - Real quiz sets loaded from Prisma for the signed-in teacher
  - Set totals for set, question, and game counts
  - Client-side set search and sorting
  - Direct actions for live play, assignments, editing, and set details
  - Empty, loading, search-empty, desktop, and mobile states
  - Short entrance, hover, menu, and loading animations with reduced-motion support
- Teachers can create a quiz set at `/dashboard/sets/new`
- Creating a set redirects directly to `/dashboard/sets/[id]/edit`
- Quiz set detail pages exist at `/dashboard/sets/[id]`
- The question editor is implemented as a focused three-pane workspace:
  - Full-width editing mode that fills the available viewport
  - Collapsible desktop dashboard sidebar on editor routes
  - Question navigator on the left
  - One selected question editor in the center
  - Live student-view preview on the right
  - Mobile tabs switch between list, editor, and preview views
- Question drafts auto-save about 800 ms after the last change
- The editor shows unsaved, saving, saved, and failed states and warns before leaving with unsaved work
- Supported question types:
  - Multiple choice
  - True/false (`O`/`X`)
  - Short answer
- Multiple-choice questions support two to six choices, correct-answer selection, choice insertion/removal/reordering, character counts, Enter navigation, and multi-line paste
- Question validation covers missing prompts, missing choices, duplicate choices, and missing answers
- Question management supports:
  - Adding a question after the currently selected question
  - Drag-and-drop ordering with accessible up/down controls
  - Duplication
  - Immediate deletion with a three-second undo action
  - Completion indicators and full-set completion checks
- Editor notifications in the bottom-right corner dismiss automatically after three seconds
- Completing the editor saves pending changes, validates every question, and moves to the first incomplete question when needed
- Dashboard section routes for discover, favorites, history, homework, play, and settings currently exist as placeholders
- Prisma schema includes Auth.js models plus initial Ploovo models:
  - `User`
  - `Account`
  - `Session`
  - `VerificationToken`
  - `QuizSet`
  - `Question`
  - `GameRoom`
  - `Player`

## Important Decisions

- Teachers have real accounts.
- Students should not need accounts for the MVP.
- Students join using a Game PIN and nickname.
- Teacher authentication should start with Google OAuth.
- Kakao and Naver OAuth will be added later.
- Teacher ownership checks are enforced in every quiz set and question Server Action.
- The current session does not expose the database user ID, so teacher ownership is resolved from `session.user.email`.
- Question types are stored inside the existing JSON fields instead of adding a Prisma column:
  - `Question.choices` stores the visible choices.
  - `Question.answer` stores `{ type, index }` or `{ type, text }`.
  - Older answers containing only `{ index }` are treated as multiple choice for backward compatibility.
- Incomplete questions are allowed as server-side drafts so auto-save does not reject work in progress.
- Question deletion is persisted immediately. Undo restores the same question ID and content, then reapplies ordering.
- The first production target is a VPS.
- The user is new to VPS deployment, so deployment instructions should stay explicit and beginner-friendly.

## Design Direction

- Keep the landing page focused on the Hero.
- Use bold typography, strong outlines, and simple game tiles.
- Avoid emoji.
- Avoid generic AI-looking gradients and over-polished marketing sections.
- The login page should stay simple, mostly white, and centered.
- Social login buttons should use recognizable Google, Kakao, and Naver marks.
- The teacher workspace should use the task density and navigation model of Gimkit without copying its branding.
- Dashboard and editor surfaces should stay mostly white with restrained Ploovo blue, yellow, mint, and pink accents.
- Operational pages should favor compact lists, clear controls, thin borders, and small-radius panels over large decorative cards.
- Motion should explain state changes and navigation, not distract from repeated classroom work.

## Local Development

Common commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run db:generate
```

The local app usually runs at:

```txt
http://localhost:3000
```

## Environment Variables

Local examples are in `.env.example`.

Required values:

```env
DATABASE_URL="postgresql://ploovo:ploovo_password@localhost:5432/ploovo?schema=public"
AUTH_SECRET="replace-with-a-generated-secret"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="replace-with-google-client-id"
AUTH_GOOGLE_SECRET="replace-with-google-client-secret"
```

For Google OAuth local testing, register this callback URL:

```txt
http://localhost:3000/api/auth/callback/google
```

For production, use:

```txt
https://YOUR_DOMAIN/api/auth/callback/google
```

## VPS Notes

The current VPS SSH info from the hosting panel:

```txt
Host: kemonofurrybest.com
SSH port: 24223
User: root
```

The user opened this public app port:

```txt
kemonofurrybest.com:24377
```

For temporary testing on VPS, the app can run with:

```bash
npm run start -- -H 0.0.0.0 -p 24377
```

For 24-hour operation, use a process manager such as PM2:

```bash
pm2 start npm --name ploovo -- run start -- -H 0.0.0.0 -p 24377
pm2 save
pm2 startup
```

After pulling a commit that changes `package.json` or `package-lock.json`, install dependencies before building. The dashboard now requires `lucide-react`, so skipping this step causes a `Can't resolve 'lucide-react'` build error.

Recommended VPS update sequence:

```bash
git pull origin main
npm ci
npm run build
pm2 restart ploovo --update-env
```

The current dashboard/editor commit expected on the VPS is:

```txt
8b38296 Build interactive quiz set editor
```

## Git And File Transfer Notes

Do not commit or upload these generated/private files:

```txt
.next/
node_modules/
.env
.env.local
```

These are already covered by `.gitignore`.

When copying by `scp`, remember that `.gitignore` is not respected automatically.
Prefer Git for deployment updates once the repo is on GitHub.

## Known Issues / Follow-Up

- Production PostgreSQL connection and migration status have not been verified in this workspace.
- Production Google OAuth configuration has not been verified in this workspace.
- Kakao and Naver OAuth are not implemented yet.
- Game room creation and realtime play are not implemented yet.
- Student join currently has UI only; no backend validation or session is connected yet.
- Dashboard live-play and assignment buttons currently lead to placeholder pages.
- Discover, favorites, history, assignments, and settings do not yet have production behavior.
- The game engine does not yet consume the three question-type JSON formats.
- Quiz set title and description can be set during creation but cannot yet be edited afterward.
- Question media, explanations, bulk import, and question-bank reuse are not implemented.
- Production login, database persistence, and the full editor CRUD flow still need end-to-end verification on the VPS.
- `npm audit` reported a Prisma-related transitive dependency warning. Recheck dependency updates before production deployment.

## Recommended Next Steps

1. Verify PostgreSQL, Prisma migrations, and Google OAuth on the VPS.
2. Test the complete teacher flow on production: login, create set, auto-save questions, reorder, delete/undo, refresh, and complete editing.
3. Add quiz set title/description editing and set deletion/duplication.
4. Implement game room creation and unique PIN generation.
5. Add student PIN validation and a server-backed guest player session.
6. Build the realtime game flow and make it consume multiple-choice, true/false, and short-answer data.
7. Implement reports and question-level answer statistics.
8. Implement asynchronous assignments.
9. Add question media, explanations, CSV import, and reusable question banks.

## Recent Milestone Commits

```txt
8b38296 Build interactive quiz set editor
16ac598 Add question editing flow
f42f619 Build usable teacher dashboard
```
