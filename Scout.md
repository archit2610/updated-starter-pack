# Scout — Complete Build Guide
### Autonomous Research Agent · 8-Week Sprint
### Stack: Express + TypeScript + PostgreSQL (migrated from your JS starter pack)

---

## Your Starter Pack — What You Already Have

You are not starting from zero. Your starter pack has a complete, production-quality auth system:

| Already built                                                       | Status                       |
| ------------------------------------------------------------------- | ---------------------------- |
| `registerUser` — email + hashed password + email verification token | ✅ Keep                       |
| `loginUser` — JWT access + refresh tokens set as cookies            | ✅ Keep                       |
| `logoutUser` — clears refresh token from DB + cookies               | ✅ Keep                       |
| `verifyEmail` — hashed token comparison + expiry check              | ✅ Keep                       |
| `resendEmailVerification`                                           | ✅ Keep                       |
| `forgotPasswordRequest` — sends reset link via email                | ✅ Keep                       |
| `resetForgottenPassword` — hashed token + new password              | ✅ Keep                       |
| `changeCurrentPassword`                                             | ✅ Keep                       |
| `refreshAccessToken` — refresh token rotation                       | ✅ Keep                       |
| `getCurrentUser`                                                    | ✅ Keep                       |
| `asyncHandler` wrapper                                              | ✅ Keep (add types)           |
| `ApiError` class                                                    | ✅ Keep (add types)           |
| `ApiResponse` class                                                 | ✅ Keep (add types)           |
| `sendEmail` + Mailgen templates                                     | ✅ Keep (add types)           |
| `jwt.middleware.js` — auth + req.user                               | ✅ Keep (strip unused models) |
| `express-validator` validators                                      | ✅ Keep (add types)           |

**The only thing being replaced:** MongoDB/Mongoose → PostgreSQL/Drizzle.
Every piece of auth logic stays identical. The DB call syntax changes, nothing else.

---

## Architecture (Express Backend + React Frontend, separate repos)

```
scout-backend/          ← your migrated starter pack + agent logic
scout-frontend/         ← React or Next.js (pages only, no API routes)
```

Your Express server handles all API routes. The React frontend calls them.
This is cleaner than mixing API and UI in one Next.js project for a learning project — you already understand this architecture.

---

## Final Tech Stack

| Layer         | Tool                                      | Source            |
| ------------- | ----------------------------------------- | ----------------- |
| Runtime       | Node.js 20 + TypeScript                   | Migration         |
| Framework     | Express                                   | Your starter pack |
| Auth          | Your JWT system (bcryptjs + jsonwebtoken) | Your starter pack |
| Validation    | express-validator                         | Your starter pack |
| Email         | Nodemailer + Mailgen + Mailtrap           | Your starter pack |
| Database      | PostgreSQL (Docker local, Neon prod)      | Replace Mongoose  |
| ORM           | Drizzle ORM                               | Replace Mongoose  |
| Vector search | pgvector                                  | New for Scout     |
| LLM           | Claude API (`claude-sonnet-4-6`)          | New for Scout     |
| Web Search    | Tavily                                    | New for Scout     |
| HTML Parser   | `@mozilla/readability` + `jsdom`          | New for Scout     |
| Streaming     | SSE (Server-Sent Events)                  | New for Scout     |
| File uploads  | Multer                                    | Your starter pack |
| Frontend      | React + Vite (or Next.js pages only)      | New               |
| Deployment    | Railway (backend) + Vercel (frontend)     | New               |

---

## Bugs to Fix During Migration

Reading your code carefully — these need fixing before you add anything new:

**1. `refreshAccessToken` — `jwt` is used but never imported**
```ts
// Add this import at the top of auth.controllers.ts
import jwt from 'jsonwebtoken'
```

**2. `resendEmailVerification` — missing `{}` in findOne**
```ts
// Wrong
const user = User.findOne(email)
// Correct (also needs await)
const user = await User.findOne({ email })
```

**3. `verifyEmail` and `resetForgottenPassword` — wrong ApiResponse syntax**
```ts
// Wrong
res.status(200).json(new ApiResponse, {}, 'user verified successfully')
// Correct
res.status(200).json(new ApiResponse(200, {}, 'user verified successfully'))
```

**4. `getCurrentUser` — wrong json call**
```ts
// Wrong
res.status(200).json(200, { user }, 'User fetched successfully')
// Correct
res.status(200).json(new ApiResponse(200, { user }, 'User fetched successfully'))
```

**5. `jwt.middleware.js` — imports `Project` and `ProjectNote` that don't exist in this repo**
```ts
// Remove these two lines entirely — they'll cause import errors
import { Project } from '../models/project.models.js'
import { ProjectNote } from '../models/note.models.js'
// Also remove projectmiddeleware and notemiddeleware exports for now
// Add them back when you need them for Scout-specific middleware
```

Fix all five before migrating to TypeScript — easier to catch in JS first.

---

## Week 1 — TypeScript Migration + PostgreSQL Setup

**Goal:** Your starter pack running in TypeScript with PostgreSQL instead of MongoDB. All auth endpoints working. Deployed.

### 1.1 Set up TypeScript

In your existing project root:

```bash
npm install -D typescript ts-node @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cookie-parser @types/cors @types/multer @types/nodemailer
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibChecks": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "ts-node --esm src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 1.2 Install PostgreSQL dependencies (replacing Mongoose)

```bash
# Add Drizzle + Postgres
npm install drizzle-orm @neondatabase/serverless pg
npm install -D drizzle-kit @types/pg

# Remove Mongoose (no longer needed)
npm uninstall mongoose
```

### 1.3 Local PostgreSQL with Docker (pgvector image)

```bash
docker run -d \
  --name scout-db \
  -e POSTGRES_USER=scout \
  -e POSTGRES_PASSWORD=scout \
  -e POSTGRES_DB=scout \
  -p 5432:5432 \
  ankane/pgvector

# Verify
docker ps
```

### 1.4 Rename files from `.js` → `.ts`

```bash
# In your src/ directory, rename everything
find src -name "*.js" -exec sh -c 'mv "$1" "${1%.js}.ts"' _ {} \;
```

### 1.5 Migrate your utilities (add types, no logic changes)

**`src/utils/async-handler.ts`** — add types to the wrapper:

```ts
import { Request, Response, NextFunction } from 'express'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

function asyncHandler(requestHandler: AsyncRequestHandler) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(requestHandler(req, res, next)).catch(next)
  }
}

export { asyncHandler }
```

**`src/utils/api-error.ts`** — add types:

```ts
class ApiError extends Error {
  statusCode: number
  data: null
  success: boolean
  errors: unknown[]

  constructor(
    statusCode: number,
    message = 'Something went wrong',
    errors: unknown[] = [],
    stack = ''
  ) {
    super(message)
    this.statusCode = statusCode
    this.data = null
    this.message = message
    this.success = false
    this.errors = errors

    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export { ApiError }
```

**`src/utils/api-response.ts`** — add types:

```ts
class ApiResponse<T = unknown> {
  statusCode: number
  data: T
  message: string
  success: boolean

  constructor(statusCode: number, data: T, message = 'Success') {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
}

export { ApiResponse }
```

**`src/utils/mail.ts`** — add types (logic stays identical):

```ts
import Mailgen from 'mailgen'
import nodemailer from 'nodemailer'

interface SendEmailOptions {
  email: string
  subject: string
  mailgenContent: Mailgen.Content
}

const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const mailGenerator = new Mailgen({
    theme: 'default',
    product: {
      name: 'Scout',
      link: 'https://scout.app',
    },
  })

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
  const emailHtml = mailGenerator.generate(options.mailgenContent)

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: Number(process.env.MAILTRAP_SMTP_PORT),
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  })

  const mail = {
    from: 'mail.scout@example.com',
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  }

  try {
    await transporter.sendMail(mail)
  } catch (error) {
    console.error('Email service failed silently:', error)
  }
}

const emailVerificationMailgenContent = (
  username: string,
  verificationUrl: string
): Mailgen.Content => ({
  body: {
    name: username,
    intro: "Welcome to Scout! We're excited to have you on board.",
    action: {
      instructions: 'To verify your email please click on the following button:',
      button: {
        color: '#22BC66',
        text: 'Verify your email',
        link: verificationUrl,
      },
    },
    outro: "Need help? Just reply to this email, we'd love to help.",
  },
})

const forgotPasswordMailgenContent = (
  username: string,
  passwordResetUrl: string
): Mailgen.Content => ({
  body: {
    name: username,
    intro: 'We got a request to reset your password.',
    action: {
      instructions: 'To reset your password click on the following button:',
      button: {
        color: '#22BC66',
        text: 'Reset password',
        link: passwordResetUrl,
      },
    },
    outro: "Need help? Just reply to this email, we'd love to help.",
  },
})

export { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail }
```

### 1.6 Replace Mongoose User model with Drizzle schema

**`src/db/schema.ts`** — this replaces `user.models.js` entirely:

```ts
import {
  pgTable, uuid, text, timestamp,
  boolean, integer, real, jsonb, vector
} from 'drizzle-orm/pg-core'

// ─── Users (replaces your Mongoose userSchema) ───────────────────────────────
export const users = pgTable('users', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  username:                 text('username').notNull().unique(),
  email:                    text('email').notNull().unique(),
  fullName:                 text('full_name'),
  password:                 text('password').notNull(),
  avatarUrl:                text('avatar_url').default('https://via.placeholder.com/200x200.png'),
  isEmailVerified:          boolean('is_email_verified').default(false).notNull(),
  refreshToken:             text('refresh_token'),
  forgotPasswordToken:      text('forgot_password_token'),
  forgotPasswordExpiry:     timestamp('forgot_password_expiry'),
  emailVerificationToken:   text('email_verification_token'),
  emailVerificationExpiry:  timestamp('email_verification_expiry'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
})

// ─── Reports (new for Scout) ──────────────────────────────────────────────────
export const reports = pgTable('reports', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id),
  question:     text('question').notNull(),
  subQuestions: jsonb('sub_questions').$type<string[]>(),
  reportMd:     text('report_md'),
  citations:    jsonb('citations').$type<{ url: string; title: string }[]>(),
  status:       text('status').notNull().default('pending'), // pending | running | done | error
  tokensUsed:   integer('tokens_used'),
  costUsd:      real('cost_usd'),
  embedding:    vector('embedding', { dimensions: 1536 }),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

// ─── Tool calls (observability — build this from day 1) ──────────────────────
export const toolCalls = pgTable('tool_calls', {
  id:           uuid('id').primaryKey().defaultRandom(),
  reportId:     uuid('report_id').notNull().references(() => reports.id),
  stage:        text('stage').notNull(),     // planner | searcher | reader | synthesizer
  toolName:     text('tool_name'),           // web_search | fetch_url | null
  inputJson:    jsonb('input_json'),
  outputJson:   jsonb('output_json'),
  latencyMs:    integer('latency_ms'),
  inputTokens:  integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costUsd:      real('cost_usd'),
  error:        text('error'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

// TypeScript types inferred from schema
export type User     = typeof users.$inferSelect
export type Report   = typeof reports.$inferSelect
export type ToolCall = typeof toolCalls.$inferSelect
```

**`src/db/index.ts`** — replaces `db/index.js`:

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
```

**`drizzle.config.ts`** — at the project root:

```ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
```

Run migrations:

```bash
# Enable pgvector extension first
docker exec -it scout-db psql -U scout -d scout -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Generate and push schema
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### 1.7 User service (replaces Mongoose model methods)

Your Mongoose model had methods like `isPasswordCorrect`, `generateAccessToken` etc. In Drizzle, these become plain functions in a service file — cleaner and easier to test.

**`src/services/user.service.ts`**:

```ts
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from '../db/index.js'
import { users, type User } from '../db/schema.js'
import { eq } from 'drizzle-orm'

// ─── Password ─────────────────────────────────────────────────────────────────
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const isPasswordCorrect = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed)
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
export const generateAccessToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY ?? '15m' }
  )
}

export const generateRefreshToken = (user: User): string => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY ?? '7d' }
  )
}

export const generateTemporaryToken = (): {
  unHashedToken: string
  hashedToken: string
  tokenExpiry: Date
} => {
  const unHashedToken = crypto.randomBytes(20).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(unHashedToken).digest('hex')
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes
  return { unHashedToken, hashedToken, tokenExpiry }
}

// ─── DB helpers (replaces User.findOne, User.create, etc.) ───────────────────
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  return user ?? null
}

export const findUserById = async (id: string): Promise<User | null> => {
  const [user] = await db.select().from(users).where(eq(users.id, id))
  return user ?? null
}

export const createUser = async (data: {
  email: string
  username: string
  password: string
  fullName?: string
}): Promise<User> => {
  const hashed = await hashPassword(data.password)
  const [user] = await db.insert(users).values({
    ...data,
    password: hashed,
  }).returning()
  return user
}

export const updateUser = async (
  id: string,
  data: Partial<typeof users.$inferInsert>
): Promise<User> => {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning()
  return user
}
```

### 1.8 Migrate auth controllers

**`src/controllers/auth.controllers.ts`** — same logic, Drizzle calls instead of Mongoose:

```ts
import { Request, Response } from 'express'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import { ApiResponse } from '../utils/api-response.js'
import {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
} from '../utils/mail.js'
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  isPasswordCorrect,
  generateAccessToken,
  generateRefreshToken,
  generateTemporaryToken,
} from '../services/user.service.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq, gt } from 'drizzle-orm'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
}

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body

  const existing = await findUserByEmail(email)
  if (existing) throw new ApiError(400, 'User with this email already exists')

  const user = await createUser({ email, username, password })

  const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken()

  await updateUser(user.id, {
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: tokenExpiry,
  })

  await sendEmail({
    email,
    subject: 'Verify your email',
    mailgenContent: emailVerificationMailgenContent(
      username,
      `${process.env.BASE_URL}/api/v1/auth/verify/${unHashedToken}`
    ),
  })

  res.status(201).json(new ApiResponse(201, { id: user.id, email, username }, 'User registered successfully'))
})

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body

  const user = await findUserByEmail(email)
  if (!user) throw new ApiError(400, 'User with this email does not exist')

  const passwordValid = await isPasswordCorrect(password, user.password)
  if (!passwordValid) throw new ApiError(400, 'Incorrect password')

  if (!user.isEmailVerified) throw new ApiError(400, 'Please verify your email first')

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  await updateUser(user.id, { refreshToken })

  res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(new ApiResponse(200, { accessToken, refreshToken }, 'User logged in successfully'))
})

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  await updateUser(req.user!.id, { refreshToken: undefined })

  res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'))
})

// ─── Verify email ─────────────────────────────────────────────────────────────
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, hashedToken))

  if (!user || !user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
    throw new ApiError(400, 'Invalid or expired token')
  }

  await updateUser(user.id, {
    isEmailVerified: true,
    emailVerificationToken: undefined,
    emailVerificationExpiry: undefined,
  })

  res.status(200).json(new ApiResponse(200, {}, 'Email verified successfully'))
})

// ─── Resend verification ──────────────────────────────────────────────────────
export const resendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body

  const user = await findUserByEmail(email)
  if (!user) throw new ApiError(400, 'User not found')

  const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken()

  await updateUser(user.id, {
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: tokenExpiry,
  })

  await sendEmail({
    email,
    subject: 'Verify your email',
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/auth/verify/${unHashedToken}`
    ),
  })

  res.status(200).json(new ApiResponse(200, {}, 'Verification email sent'))
})

// ─── Forgot password ──────────────────────────────────────────────────────────
export const forgotPasswordRequest = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body

  const user = await findUserByEmail(email)
  if (!user) throw new ApiError(400, 'User not registered')

  const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken()

  await updateUser(user.id, {
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: tokenExpiry,
  })

  await sendEmail({
    email,
    subject: 'Reset your password',
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/auth/forgot-password/${unHashedToken}`
    ),
  })

  res.status(200).json(new ApiResponse(200, {}, 'Password reset email sent'))
})

// ─── Reset forgotten password ─────────────────────────────────────────────────
export const resetForgottenPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = req.body
  const { token } = req.params

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.forgotPasswordToken, hashedToken))

  if (!user || !user.forgotPasswordExpiry || user.forgotPasswordExpiry < new Date()) {
    throw new ApiError(400, 'Invalid or expired token')
  }

  const { hashPassword } = await import('../services/user.service.js')
  const hashed = await hashPassword(newPassword)

  await updateUser(user.id, {
    password: hashed,
    forgotPasswordToken: undefined,
    forgotPasswordExpiry: undefined,
  })

  res.status(200).json(new ApiResponse(200, {}, 'Password reset successfully'))
})

// ─── Change current password ──────────────────────────────────────────────────
export const changeCurrentPassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body
  const user = await findUserById(req.user!.id)
  if (!user) throw new ApiError(400, 'User not found')

  const valid = await isPasswordCorrect(oldPassword, user.password)
  if (!valid) throw new ApiError(400, 'Incorrect current password')

  const { hashPassword } = await import('../services/user.service.js')
  const hashed = await hashPassword(newPassword)
  await updateUser(user.id, { password: hashed })

  res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'))
})

// ─── Refresh access token ─────────────────────────────────────────────────────
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.refreshToken

  if (!incomingRefreshToken) throw new ApiError(401, 'Please login first')

  const decoded = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET!
  ) as { id: string }

  const user = await findUserById(decoded.id)
  if (!user) throw new ApiError(401, 'Invalid refresh token')
  if (incomingRefreshToken !== user.refreshToken)
    throw new ApiError(401, 'Refresh token expired or already used')

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  await updateUser(user.id, { refreshToken })

  res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(new ApiResponse(200, { accessToken, refreshToken }, 'Access token refreshed'))
})

// ─── Get current user ─────────────────────────────────────────────────────────
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await findUserById(req.user!.id)
  res.status(200).json(new ApiResponse(200, { user }, 'User fetched successfully'))
})
```

### 1.9 Migrate the JWT middleware

**`src/middlewares/jwt.middleware.ts`** — cleaned up, Project/Note imports removed:

```ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import { findUserById } from '../services/user.service.js'
import { User } from '../db/schema.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export const auth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.accessToken ?? req.headers.authorization?.split(' ')[1]

  if (!token) throw new ApiError(401, 'Not authorized')

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { id: string }
  const user = await findUserById(decoded.id)

  if (!user) throw new ApiError(404, 'User not found')

  req.user = user
  next()
})
```

### 1.10 Update app.ts and routes

**`src/app.ts`**:

```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import authRouter from './routes/auth.routes.js'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/v1/auth', authRouter)

// Global error handler
app.use((err: ApiError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.statusCode ?? 500
  res.status(status).json({ success: false, message: err.message, errors: err.errors })
})

export default app
```

**`src/routes/auth.routes.ts`** — identical to your JS version, just `.ts` extension and typed imports.

### 1.11 Update `.env`

```env
PORT=8000
NODE_ENV=development
BASE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173

# Database (local Docker)
DATABASE_URL=postgresql://scout:scout@localhost:5432/scout

# JWT
ACCESS_TOKEN_SECRET=your_access_secret_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_secret_here
REFRESH_TOKEN_EXPIRY=7d

# Email (Mailtrap for dev)
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=your_mailtrap_user
MAILTRAP_SMTP_PASS=your_mailtrap_pass

# LLM + Search (add in Week 4)
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
```

**Week 1 checkpoint:** All 10 auth endpoints work (`/register`, `/login`, `/logout`, `/verify/:token`, `/resend-emailverification`, `/forgot-password`, `/forgot-password/:token`, `/change-currentpassword`, `/refresh-accesstoken`, `/profile`). PostgreSQL running locally. TypeScript compiles with no errors. Deploy to Railway.

---

## Week 2 — Research API + Report Library

**Goal:** User can submit a research question, it gets saved as a `pending` report, and they can fetch all their past reports.

### 2.1 Report service

**`src/services/report.service.ts`**:

```ts
import { db } from '../db/index.js'
import { reports, type Report } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'

export const createReport = async (userId: string, question: string): Promise<Report> => {
  const [report] = await db.insert(reports).values({ userId, question }).returning()
  return report
}

export const getReportsByUser = async (userId: string): Promise<Report[]> => {
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt))
}

export const getReportById = async (id: string): Promise<Report | null> => {
  const [report] = await db.select().from(reports).where(eq(reports.id, id))
  return report ?? null
}

export const updateReport = async (
  id: string,
  data: Partial<typeof reports.$inferInsert>
): Promise<Report> => {
  const [report] = await db.update(reports).set(data).where(eq(reports.id, id)).returning()
  return report
}
```

### 2.2 Research routes and controller

**`src/routes/research.routes.ts`**:

```ts
import { Router } from 'express'
import { auth } from '../middlewares/jwt.middleware.js'
import {
  createResearchReport,
  getUserReports,
  getReport,
} from '../controllers/research.controllers.js'

const router = Router()

router.post('/', auth, createResearchReport)
router.get('/', auth, getUserReports)
router.get('/:id', auth, getReport)

export default router
```

**`src/controllers/research.controllers.ts`**:

```ts
import { Request, Response } from 'express'
import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/api-error.js'
import { ApiResponse } from '../utils/api-response.js'
import { createReport, getReportsByUser, getReportById } from '../services/report.service.js'

export const createResearchReport = asyncHandler(async (req: Request, res: Response) => {
  const { question } = req.body
  if (!question?.trim()) throw new ApiError(400, 'Question is required')

  const report = await createReport(req.user!.id, question.trim())
  res.status(201).json(new ApiResponse(201, { reportId: report.id }, 'Report created'))
})

export const getUserReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await getReportsByUser(req.user!.id)
  res.status(200).json(new ApiResponse(200, { reports }, 'Reports fetched'))
})

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await getReportById(req.params.id)
  if (!report || report.userId !== req.user!.id) throw new ApiError(404, 'Report not found')
  res.status(200).json(new ApiResponse(200, { report }, 'Report fetched'))
})
```

Register the router in `app.ts`:
```ts
import researchRouter from './routes/research.routes.js'
app.use('/api/v1/research', researchRouter)
```

**Week 2 checkpoint:** `POST /api/v1/research` saves a pending report. `GET /api/v1/research` returns a user's report library.

---

## Week 3 — Single-Shot Streaming Answer

**Goal:** Hit run on a report, get a streaming LLM response, save it when done.

### 3.1 Install LLM dependency

```bash
npm install @anthropic-ai/sdk
```

### 3.2 SSE streaming route

**`src/routes/research.routes.ts`** — add:

```ts
import { runReport } from '../controllers/research.controllers.js'
router.post('/:id/run', auth, runReport)
```

**In `research.controllers.ts`** — add the `runReport` function:

```ts
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic()

export const runReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await getReportById(req.params.id)
  if (!report || report.userId !== req.user!.id) throw new ApiError(404, 'Report not found')

  await updateReport(report.id, { status: 'running' })

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    send({ type: 'stage', label: 'Generating answer...' })

    let fullText = ''

    const stream = claude.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a research assistant. Write a thorough, well-structured answer in markdown.',
      messages: [{ role: 'user', content: report.question }],
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text
        send({ type: 'token', data: chunk.delta.text })
      }
    }

    const finalMsg = await stream.finalMessage()
    const usage = finalMsg.usage
    const cost = (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015)

    await updateReport(report.id, {
      reportMd: fullText,
      status: 'done',
      tokensUsed: usage.input_tokens + usage.output_tokens,
      costUsd: cost,
    })

    send({ type: 'done' })
    res.end()

  } catch (err) {
    await updateReport(report.id, { status: 'error' })
    send({ type: 'error', message: String(err) })
    res.end()
  }
})
```

**Week 3 checkpoint:** `POST /api/v1/research/:id/run` streams a response token by token. The report is saved and marked `done` when complete.

---

## Week 4 — Real Retrieval: Web Search + Citations

**Goal:** Answers are now grounded in real web sources.

### 4.1 Install retrieval dependencies

```bash
npm install tavily @mozilla/readability jsdom
npm install -D @types/jsdom
```

### 4.2 Searcher

**`src/lib/searcher.ts`**:

```ts
import { tavily } from 'tavily'
import { db } from '../db/index.js'
import { toolCalls } from '../db/schema.js'

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })

interface SearchResult {
  url: string
  title: string
  content: string
}

export const searchWeb = async (query: string, reportId: string): Promise<SearchResult[]> => {
  const start = Date.now()
  const result = await client.search(query, { maxResults: 5, searchDepth: 'basic' })

  await db.insert(toolCalls).values({
    reportId,
    stage: 'searcher',
    toolName: 'web_search',
    inputJson: { query },
    outputJson: result.results.map((r: SearchResult) => ({ url: r.url, title: r.title })),
    latencyMs: Date.now() - start,
  })

  return result.results
}
```

### 4.3 Reader

**`src/lib/reader.ts`**:

```ts
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db/index.js'
import { toolCalls } from '../db/schema.js'

const claude = new Anthropic()

export interface ExtractedFact {
  url: string
  facts: string
}

export const fetchAndExtract = async (
  url: string,
  subQuestion: string,
  reportId: string
): Promise<ExtractedFact | null> => {
  const start = Date.now()

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    const doc = new JSDOM(html, { url })
    const article = new Readability(doc.window.document).parse()
    const text = article?.textContent?.slice(0, 4000) ?? ''

    if (!text) return null

    const extraction = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku — faster + cheaper for extraction
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract only facts relevant to: "${subQuestion}"\n\nSource:\n${text}\n\nReturn bullet points only. If nothing relevant, return "IRRELEVANT".`
      }]
    })

    const facts = extraction.content[0].type === 'text' ? extraction.content[0].text : ''
    if (facts.trim() === 'IRRELEVANT') return null

    await db.insert(toolCalls).values({
      reportId,
      stage: 'reader',
      toolName: 'fetch_url',
      inputJson: { url, subQuestion },
      outputJson: { facts },
      latencyMs: Date.now() - start,
      inputTokens: extraction.usage.input_tokens,
      outputTokens: extraction.usage.output_tokens,
    })

    return { url, facts }

  } catch (err) {
    await db.insert(toolCalls).values({
      reportId, stage: 'reader', toolName: 'fetch_url',
      inputJson: { url }, error: String(err), latencyMs: Date.now() - start,
    })
    return null
  }
}
```

Update `runReport` to use search + read before synthesizing — same flow as the agent loop below but without the planner step.

**Week 4 checkpoint:** Reports now cite real URLs. `tool_calls` table shows every fetch + extraction.

---

## Week 5 — The Agent Loop: Planner + Multi-Step Tool Use

**Goal:** The LLM now plans what to search for using function calling. This is what makes Scout an agent.

### 5.1 Planner

**`src/lib/planner.ts`**:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db/index.js'
import { toolCalls } from '../db/schema.js'

const claude = new Anthropic()

export const planResearch = async (question: string, reportId: string): Promise<string[]> => {
  const start = Date.now()

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    tools: [{
      name: 'set_research_plan',
      description: 'Set the sub-questions to research',
      input_schema: {
        type: 'object' as const,
        properties: {
          sub_questions: {
            type: 'array',
            items: { type: 'string' },
            description: '3-5 specific, searchable sub-questions',
          }
        },
        required: ['sub_questions'],
      }
    }],
    tool_choice: { type: 'any' },
    system: 'Break complex questions into 3-5 specific, searchable sub-questions. Use the set_research_plan tool.',
    messages: [{ role: 'user', content: question }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  const subQuestions: string[] =
    toolUse?.type === 'tool_use'
      ? (toolUse.input as { sub_questions: string[] }).sub_questions
      : [question]

  await db.insert(toolCalls).values({
    reportId, stage: 'planner', toolName: 'set_research_plan',
    inputJson: { question },
    outputJson: { subQuestions },
    latencyMs: Date.now() - start,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  })

  return subQuestions
}
```

### 5.2 The full agent

**`src/lib/agent.ts`**:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { planResearch } from './planner.js'
import { searchWeb } from './searcher.js'
import { fetchAndExtract, type ExtractedFact } from './reader.js'
import { db } from '../db/index.js'
import { reports, toolCalls } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const claude = new Anthropic()

type Emitter = (event: object) => void

export const runScout = async (
  reportId: string,
  question: string,
  emit: Emitter
): Promise<void> => {
  try {
    // 1. Plan
    emit({ type: 'stage', label: 'Planning research...' })
    const subQuestions = await planResearch(question, reportId)

    await db.update(reports)
      .set({ subQuestions, status: 'running' })
      .where(eq(reports.id, reportId))

    emit({ type: 'plan', subQuestions })

    // 2. Search + Read per sub-question
    const allFacts: (ExtractedFact & { subQuestion: string })[] = []

    for (const subQ of subQuestions) {
      emit({ type: 'stage', label: `Searching: ${subQ}` })
      const results = await searchWeb(subQ, reportId)

      emit({ type: 'stage', label: `Reading sources for: ${subQ}` })
      for (const result of results.slice(0, 3)) {
        const extracted = await fetchAndExtract(result.url, subQ, reportId)
        if (extracted) allFacts.push({ ...extracted, subQuestion: subQ })
      }
    }

    // 3. Synthesize (streaming)
    emit({ type: 'stage', label: 'Writing report...' })

    const sourcesText = allFacts
      .map((f, i) => `[${i + 1}] ${f.url}\nRelevant to: ${f.subQuestion}\n${f.facts}`)
      .join('\n\n---\n\n')

    const citations = allFacts.map((f, i) => ({ index: i + 1, url: f.url }))

    let fullText = ''
    const start = Date.now()

    const stream = claude.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: 'You are a research writer. Write a comprehensive report with inline citations [1], [2] etc. Use markdown headers.',
      messages: [{
        role: 'user',
        content: `Question: ${question}\n\nSources:\n${sourcesText}\n\nWrite the full research report now.`
      }]
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text
        emit({ type: 'token', data: chunk.delta.text })
      }
    }

    const finalMsg = await stream.finalMessage()
    const usage = finalMsg.usage
    const cost = (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015)

    await db.insert(toolCalls).values({
      reportId, stage: 'synthesizer',
      inputJson: { sourceCount: allFacts.length },
      outputJson: { charCount: fullText.length },
      latencyMs: Date.now() - start,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd: cost,
    })

    await db.update(reports).set({
      reportMd: fullText,
      citations,
      status: 'done',
      tokensUsed: usage.input_tokens + usage.output_tokens,
      costUsd: cost,
    }).where(eq(reports.id, reportId))

    emit({ type: 'done', reportId })

  } catch (err) {
    await db.update(reports).set({ status: 'error' }).where(eq(reports.id, reportId))
    emit({ type: 'error', message: String(err) })
    throw err
  }
}
```

Update `runReport` in the research controller to call `runScout` instead of the direct LLM call.

**Week 5 checkpoint:** The full plan → search → read → synthesize loop runs. Every step is visible in the SSE stream and logged in `tool_calls`.

---

## Week 6 — Reliability

**Goal:** Scout doesn't embarrass you in a demo.

### Cost guard (add inside `runScout` after planning)

```ts
const MAX_COST_PER_RUN = 0.10
let runningCost = 0

// After each LLM call, accumulate and check:
runningCost += cost
if (runningCost > MAX_COST_PER_RUN) {
  emit({ type: 'stage', label: 'Budget limit reached — synthesizing with available data' })
  break
}
```

### Timeout wrapper

```ts
// src/utils/with-timeout.ts
export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> => {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )
  try {
    return await Promise.race([promise, timeout])
  } catch {
    return fallback
  }
}

// Usage in reader.ts:
const extracted = await withTimeout(fetchAndExtract(url, subQ, reportId), 10000, null)
```

### Test script

```ts
// scripts/test-scout.ts
const testQuestions = [
  'What are the trade-offs of different vector databases?',
  'How does TCP congestion control work?',
  'Compare REST vs GraphQL APIs',
  '',                          // empty — should throw 400
  'aslkdjhalskdjh',           // gibberish — should complete gracefully
]

// Hit your local server with each question and log status + cost
```

**Week 6 checkpoint:** Dead links, timeouts, and gibberish inputs are handled. Cost stays under $0.10/run.

---

## Week 7 — Productionize

**Goal:** CI/CD, Docker, production database, monitoring.

### GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run build
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

### Deploy to Railway

1. Push repo to GitHub
2. Railway → New Project → Deploy from GitHub
3. Add all env vars (use Neon connection string for `DATABASE_URL`)
4. Railway auto-detects Dockerfile and deploys

### Cost monitoring query

```sql
-- Run this in Neon console weekly
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT report_id) as runs,
  SUM(cost_usd) as total_cost,
  SUM(input_tokens + output_tokens) as total_tokens
FROM tool_calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Week 8 — pgvector Follow-ups + Demo

**Goal:** "Chat with your report" via semantic similarity. Demo video recorded.

### Generate embeddings on completion

```bash
npm install openai  # for text-embedding-3-small
```

In `runScout()`, after saving the completed report:

```ts
import OpenAI from 'openai'
const openai = new OpenAI()

const embeddingRes = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: fullText.slice(0, 8000),
})
const embedding = embeddingRes.data[0].embedding

await db.update(reports)
  .set({ embedding })
  .where(eq(reports.id, reportId))
```

### Follow-up route

```ts
// GET /api/v1/research/:id/followup?q=your+question
export const followUp = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as { q: string }

  const openai = new OpenAI()
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: q,
  })
  const qEmbedding = embeddingRes.data[0].embedding

  // Cosine similarity search via pgvector
  const related = await db.execute(
    sql`SELECT id, question, report_md,
        1 - (embedding <=> ${JSON.stringify(qEmbedding)}::vector) AS similarity
        FROM reports
        WHERE user_id = ${req.user!.id}
          AND 1 - (embedding <=> ${JSON.stringify(qEmbedding)}::vector) > 0.7
        ORDER BY similarity DESC
        LIMIT 3`
  )

  const context = related.rows.map(r => r.report_md).join('\n\n---\n\n')

  const answer = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: 'Answer using only the provided research context. Be concise.',
    messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${q}` }]
  })

  res.status(200).json(new ApiResponse(200, {
    answer: answer.content[0].type === 'text' ? answer.content[0].text : '',
    sources: related.rows.map(r => ({ id: r.id, question: r.question }))
  }, 'Follow-up answered'))
})
```

---

## Final Folder Structure

```
scout-backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controllers.ts      ← your starter pack, migrated
│   │   └── research.controllers.ts  ← new for Scout
│   ├── db/
│   │   ├── index.ts                 ← Drizzle + pg (replaces mongoose)
│   │   └── schema.ts                ← users + reports + tool_calls
│   ├── lib/                         ← agent brain (Week 4-5)
│   │   ├── agent.ts
│   │   ├── planner.ts
│   │   ├── reader.ts
│   │   └── searcher.ts
│   ├── middlewares/
│   │   ├── jwt.middleware.ts        ← your starter pack, cleaned up
│   │   ├── multer.middleware.ts     ← your starter pack, unchanged
│   │   └── validator.middleware.ts  ← your starter pack, unchanged
│   ├── routes/
│   │   ├── auth.routes.ts           ← your starter pack, migrated
│   │   └── research.routes.ts       ← new for Scout
│   ├── services/
│   │   ├── user.service.ts          ← Mongoose methods → plain functions
│   │   └── report.service.ts        ← new for Scout
│   ├── utils/
│   │   ├── api-error.ts             ← your starter pack + types
│   │   ├── api-response.ts          ← your starter pack + types
│   │   ├── async-handler.ts         ← your starter pack + types
│   │   ├── mail.ts                  ← your starter pack + types
│   │   └── with-timeout.ts          ← new (Week 6)
│   ├── validators/
│   │   └── index.ts                 ← your starter pack, unchanged
│   ├── app.ts
│   └── index.ts
├── drizzle/                         ← generated migration files
├── scripts/
│   └── test-scout.ts
├── drizzle.config.ts
├── tsconfig.json
├── Dockerfile
└── .env
```

---

## Environment Variables — Complete List

```env
# Server
PORT=8000
NODE_ENV=development
BASE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://scout:scout@localhost:5432/scout

# JWT
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=7d

# Email (Mailtrap for dev)
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=
MAILTRAP_SMTP_PASS=

# LLM + Search (Week 4+)
ANTHROPIC_API_KEY=
TAVILY_API_KEY=

# Embeddings (Week 8)
OPENAI_API_KEY=
```

---

## The Rule That Doesn't Change

**Do not use LangChain, LlamaIndex, or any agent framework until after Week 5.**

You are building `planResearch()`, `searchWeb()`, `fetchAndExtract()`, and `runScout()` as plain TypeScript functions with raw API calls. That is the point. Every abstraction a framework provides is something you need to understand from the inside first. Your second project can use LangChain. Not this one.
ENDOFFILE
