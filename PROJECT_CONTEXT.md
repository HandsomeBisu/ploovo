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
- The first production target is a VPS.
- The user is new to VPS deployment, so deployment instructions should stay explicit and beginner-friendly.

## Design Direction

- Keep the landing page focused on the Hero.
- Use bold typography, strong outlines, and simple game tiles.
- Avoid emoji.
- Avoid generic AI-looking gradients and over-polished marketing sections.
- The login page should stay simple, mostly white, and centered.
- Social login buttons should use recognizable Google, Kakao, and Naver marks.

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

- Actual PostgreSQL database still needs to be created and connected.
- `npm run db:migrate` has not been run against a real database yet.
- Google OAuth credentials still need to be configured.
- Kakao and Naver OAuth are not implemented yet.
- Dashboard is only a placeholder.
- Quiz set creation is not implemented yet.
- Game room creation and realtime play are not implemented yet.
- Student join currently has UI only; no backend validation or session is connected yet.
- `npm audit` reported a Prisma-related transitive dependency warning. Recheck dependency updates before production deployment.

## Recommended Next Steps

1. Set up PostgreSQL locally or on VPS.
2. Run Prisma migration.
3. Configure Google OAuth credentials.
4. Verify full teacher login flow.
5. Build the first real dashboard flow: create quiz set.
6. Add game room creation and PIN validation.
7. Add student join backend session.
8. Add realtime game flow with Socket.IO or a similar WebSocket layer.
