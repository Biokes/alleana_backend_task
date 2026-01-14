# AIleana – Payments & Calls

## 1. Project Overview

This service implements a minimal backend for AIleana to support:
- User authentication with JWT (access/refresh tokens)
- User wallet and payment flow (funding via mocked Monnify, ledgered transactions)
- Call initiation and session tracking (initiate → accept/reject → end), debiting wallet on call end

Key features:
- Auth: Register, Login, Refresh, Logout with secure cookies
- Wallet: 1 wallet per user, credit/debit/transfer, transaction ledger
- Payments: Monnify integration mocked, webhook verification (HMAC), idempotency handling
- Calls: Call session lifecycle tracking and billing upon call end

---

## 2. Tech Stack

- Framework: Node.js, Express 5, TypeScript
- Database: PostgreSQL
- ORM: TypeORM
- Auth: JWT (Access + Refresh), cookies for token storage
- Validation: Zod
- Logging: Winston
- Payment: Monnify (mocked client, HMAC-verified webhook)
- Utilities: cookie-parser, express-rate-limit, cors, bcrypt

---

## 3. Architecture Overview

Folder structure (high-level):
- src/
  - app.ts: Express app setup, middleware, CORS, rate-limiting, cookies, routes
  - config/
    - index.ts: App config, TypeORM DataSource, bootstrap, graceful shutdown
  - data/
    - models.ts: Entities (User, Wallet, Transaction, CallSession, CallEvent)
    - repositories/: BaseRepository and concrete repositories
  - services/
    - user.ts: Auth service
    - wallet.ts: Wallet domain service (fund, debit, transfer)
    - calls.ts: Calls lifecycle service
    - monnify/
      - client.ts: MonnifyClient, HMAC helpers, idempotency store
      - monnify.mock.ts: Mock Monnify client
  - controller/
    - auths.ts: Auth controller
    - wallet.ts: Wallet controller
    - calls.ts: Calls controller
  - router/
    - index.ts: AppRouter with sub-routers
    - auth.ts, wallet.ts, calls.ts: Route definitions
  - middleware/
    - errorHandler.ts: Global error handling
    - validationHandler.ts: Zod validation
  - auth/middleware/
    - auth.ts: JWT middleware
  - utils/
    - ApiResponse.ts: Standardized API response model
    - types.ts: DTOs, schemas, enums

Key modules:
- Auth: Registration, login, refresh token handling, logout
- Wallet: Balance inquiry, transaction ledger, credit/debit, transfer, funding via Monnify mock
- Payments: Monnify mock client for fund intents; webhook verification via HMAC; idempotency
- Calls: Session lifecycle (initiate, accept, reject, end), duration & cost calculation, wallet debit

Entity relationships:
- User (1) → Wallet (1) via unique userId on Wallet (enforced)
- Wallet (1) → Transaction (N)
- CallSession references Users: callerId and calleeId (Many-to-One to User)
- CallEvent (N) → CallSession (1) for audit trail

---

## 4. Setup & Installation

Prerequisites:
- Node.js 18+
- PostgreSQL 13+
- pnpm (recommended) or npm/yarn

Environment variables:
- See “Environment Variables” section below for a complete list and example.

Install dependencies:
```bash
pnpm install
```

Database setup:
- Ensure the database configured in .env exists in PostgreSQL.
- TypeORM uses `synchronize: true` for development (auto-creates tables from entities). For production, set migrations.

Starting the server:
Development (via ts-node):
```bash
# If src/server.ts is missing, run app.ts directly via ts-node
./node_modules/.bin/ts-node src/app.ts
```

Alternatively (if server.ts and build pipeline are configured):
```bash
pnpm dev       # nodemon + ts-node
pnpm build     # tsc
pnpm start     # node dist/server.js
```

Health check:
```bash
curl -i http://localhost:5000/api/v1/health
```

---

## 5. Environment Variables

Required:
- PORT: HTTP port, e.g., 5000
- NODE_ENV: development | test | production
- FRONTEND_URL: Allowed CORS origin (e.g., http://localhost:5173)

Database:
- DB_HOST: PostgreSQL host
- DB_PORT: PostgreSQL port (number)
- DB_USERNAME: PostgreSQL username
- DB_PASSWORD: PostgreSQL password
- DB_NAME: PostgreSQL database name

Auth:
- JWT_SECRET: Access token secret
- JWT_REFRESH_SECRET: Refresh token secret
- PASSWORD_HASH: bcrypt salt rounds (number)

Payments/Calls:
- MONNIFY_WEBHOOK_SECRET: Webhook HMAC secret (used to verify webhook signatures)
- CALL_RATE_PER_MIN: NGN per minute for call billing (number; default 5)

Example .env:
```env
# App
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# DB
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=alleana

# Auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_jwt_secret
PASSWORD_HASH=10

# Calls
CALL_RATE_PER_MIN=5

# Payments
MONNIFY_WEBHOOK_SECRET=your_webhook_secret
```

Note: src/app.ts loads `.env` if NODE_ENV=development, otherwise `.env.test`.

---

## 6. Authentication Flow

- Register creates a user with hashed password.
- Login verifies credentials and issues:
  - accessToken: signed with JWT_SECRET, set as httpOnly cookie; also usable via Bearer header
  - refreshToken: signed with JWT_REFRESH_SECRET, httpOnly cookie
- Refresh token: exchanges refreshToken for a new accessToken
- Logout: clears both cookies

Authenticated requests:
- Provide Authorization header:
  - `Authorization: Bearer <ACCESS_TOKEN>`
- Or rely on `accessToken` httpOnly cookie (if your client is configured with credentials)

---

## 7. Wallet & Payment Flow

- One wallet per user (unique userId on Wallet).
- Wallet balance stored as DECIMAL (2dp) in DB, converted to JS number through a numeric transformer.
- Funding flow (mocked Monnify):
  - Client requests `POST /wallet/fund-intent` with amount.
  - Server uses MockMonnifyClient to return a payment intent (reference + checkoutUrl).
  - Webhook: `POST /wallet/webhook`
    - Must include:
      - `x-monnify-signature`: HMAC SHA256 signature of raw JSON body using MONNIFY_WEBHOOK_SECRET
      - `idempotency-key`: unique id for the event
    - On `status=PAID`, wallet is credited via a CREDIT transaction; idempotent (duplicates ignored).
- Debits (e.g., from calls) create DEBIT transactions.
- Transfer method (service) atomically debits and credits between users.

---

## 8. Call Session Flow

Lifecycle:
- Initiate:
  - `POST /calls/initiate` creates a CallSession with status INITIATED.
- Accept:
  - `POST /calls/:id/accept` (callee only) sets status ACTIVE and startedAt.
- Reject:
  - `POST /calls/:id/reject` (callee only) sets status FAILED.
- End:
  - `POST /calls/:id/end` (either participant) sets status ENDED, endedAt, computes duration and cost, and debits caller wallet.

Cost:
- Computed: durationSec × (CALL_RATE_PER_MIN / 60), rounded to 2dp.

Access control:
- Only participants (caller or callee) can read/modify a session.

---

## 9. API Documentation

Base URL: `http://localhost:5000/api/v1`

Auth
- POST /auths/register
  - Auth: none
  - Body:
    ```json
    { "email": "user@example.com", "password": "Passw0rd!", "name": "User" }
    ```
  - Response: 201, user summary

- POST /auths/login
  - Auth: none
  - Body:
    ```json
    { "email": "user@example.com", "password": "Passw0rd!" }
    ```
  - Response: 200, sets cookies accessToken, refreshToken; returns user

- POST /auths/refresh-token
  - Auth: refreshToken cookie
  - Response: 200, sets new accessToken cookie

- POST /auths/logout
  - Auth: accessToken/refreshToken cookies
  - Response: 200, clears cookies

Wallet
- POST /wallet/fund-intent
  - Auth: required (Bearer or cookie)
  - Body:
    ```json
    { "amount": 1000, "currency": "NGN" }
    ```
  - Example:
    ```bash
    curl -X POST http://localhost:5000/api/v1/wallet/fund-intent \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <ACCESS_TOKEN>" \
      -d '{"amount":1000,"currency":"NGN"}'
    ```
  - Response: 201
    ```json
    {
      "success": true,
      "statusCode": 201,
      "data": {
        "reference": "MN-1-...-abcd1234",
        "amount": 1000,
        "currency": "NGN",
        "checkoutUrl": "https://mock.monnify/checkout/MN-1-...-abcd1234",
        "status": "PENDING"
      }
    }
    ```

- POST /wallet/webhook
  - Auth: none (secured by signature + idempotency)
  - Headers:
    - x-monnify-signature: HMAC SHA256 of raw JSON body with MONNIFY_WEBHOOK_SECRET
    - idempotency-key: unique event id
  - Body:
    ```json
    {
      "event": "PAYMENT_SUCCESS",
      "data": {
        "userId": 1,
        "amount": 1000,
        "currency": "NGN",
        "reference": "MN-1-REF-123",
        "status": "PAID"
      }
    }
    ```
  - Example:
    ```bash
    BODY='{"event":"PAYMENT_SUCCESS","data":{"userId":1,"amount":1000,"currency":"NGN","reference":"MN-1-REF-123","status":"PAID"}}'
    SIG=$(node -e "const crypto=require('crypto');console.log(crypto.createHmac('sha256', process.env.MONNIFY_WEBHOOK_SECRET||'your_webhook_secret').update(process.argv[1]).digest('hex'))" "$BODY")

    curl -X POST http://localhost:5000/api/v1/wallet/webhook \
      -H "Content-Type: application/json" \
      -H "x-monnify-signature: $SIG" \
      -H "idempotency-key: webhook-123" \
      -d "$BODY"
    ```
  - Response: 200

- GET /wallet/balance
  - Auth: required
  - Example:
    ```bash
    curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:5000/api/v1/wallet/balance
    ```
  - Response: 200
    ```json
    { "success": true, "statusCode": 200, "data": { "balance": 1000, "currency": "NGN" } }
    ```

- GET /wallet/transactions
  - Auth: required
  - Example:
    ```bash
    curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:5000/api/v1/wallet/transactions
    ```
  - Response: 200, list of transactions

Calls
- POST /calls/initiate
  - Auth: required
  - Body:
    ```json
    { "calleeId": 2 }
    ```
  - Example:
    ```bash
    curl -X POST http://localhost:5000/api/v1/calls/initiate \
      -H "Authorization: Bearer <ACCESS_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"calleeId":2}'
    ```
  - Response: 201, CallSession

- POST /calls/:id/accept
  - Auth: required (callee only)
  - Example:
    ```bash
    curl -X POST http://localhost:5000/api/v1/calls/1/accept \
      -H "Authorization: Bearer <ACCESS_TOKEN_OF_CALLEE>"
    ```
  - Response: 200

- POST /calls/:id/reject
  - Auth: required (callee only)
  - Example:
    ```bash
    curl -X POST http://localhost:5000/api/v1/calls/1/reject \
      -H "Authorization: Bearer <ACCESS_TOKEN_OF_CALLEE>"
    ```
  - Response: 200

- POST /calls/:id/end
  - Auth: required (participants)
  - Example:
    ```bash
    curl -X POST http://localhost:5000/api/v1/calls/1/end \
      -H "Authorization: Bearer <ACCESS_TOKEN_OF_CALLER_OR_CALLEE>"
    ```
  - Response: 200, includes cost and duration

- GET /calls/:id
  - Auth: required (participants)
  - Example:
    ```bash
    curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:5000/api/v1/calls/1
    ```
  - Response: 200, CallSession

- GET /calls
  - Auth: required
  - Example:
    ```bash
    curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:5000/api/v1/calls
    ```
  - Response: 200, list of sessions

---

## 10. Running Tests

If tests are present and configured:
```bash
pnpm test
```
Recommended areas for tests:
- Wallet: fund, debit, transfer (atomicity, balance checks)
- Calls: initiate/accept/reject/end, cost computation, wallet debit
- Webhook: signature verification and idempotency handling

---

## 11. Common Issues & Troubleshooting

- App fails to start with dev script:
  - If src/server.ts is not available, run:
    ```bash
    ./node_modules/.bin/ts-node src/app.ts
    ```

- Database connection errors:
  - Ensure PostgreSQL is running and .env credentials match.
  - Ensure DB_NAME exists.

- CORS/credentials:
  - Ensure FRONTEND_URL is set correctly and your client sends credentials if using cookies.

- Webhook signature mismatch:
  - Confirm signature is computed with HMAC SHA256 over the exact raw JSON string and MONNIFY_WEBHOOK_SECRET.

---

## 12. Assessment Alignment

- Node.js + Express: Implemented.
- Database: PostgreSQL + TypeORM with entities for User, Wallet, Transaction, CallSession, CallEvent.
- Auth: JWT access/refresh with cookies; login, register, refresh, logout are implemented.
- Payment: Monnify integration mocked:
  - Payment intent generation endpoint
  - Webhook handling with HMAC signature verification and idempotency
  - Wallet credit via transaction ledger
- Calls: REST-based signaling endpoints:
  - initiate, accept, reject, end
  - Session tracking with statuses and timestamps
  - Billing on end (debits caller’s wallet)
- Security:
  - JWT middleware for protected routes
  - Error handling and rate limiting
  - Validation via Zod on request payloads
