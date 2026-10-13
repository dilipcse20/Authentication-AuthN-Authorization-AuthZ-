# Auth + Authorization Service

A production-style Authentication + Authorization service built with
**Node.js, Express, MongoDB (Mongoose)**, secured with **JWT (access + refresh)
in httpOnly cookies**, RBAC, permission-based authorization, session
management, and a login-notification email — plus a small React "route
guard" kit for the frontend.

## Features

- Registration with strong-password validation, bcrypt hashing, email uniqueness
- Email verification (Nodemailer) — login blocked until verified
- Login with access + refresh JWTs set as **httpOnly, secure, sameSite cookies**
- **Login notification email** after every successful login (time, IP, browser, device, OS)
- Logout (current device) and logout-all-devices
- Forgot / reset password with expiring, hashed tokens
- Change password (invalidates other sessions)
- Email OTP flow with expiry + attempt limiting
- Refresh-token rotation + session store (Mongo, TTL-indexed)
- Active sessions listing + per-session revoke
- RBAC (`USER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`) via `authorize()`
- Fine-grained permissions (`READ_USERS`, `DELETE_USERS`, ...) via `checkPermission()`
- Account lockout after repeated failed logins
- Security hardening: `helmet`, `cors` (credentialed), `express-mongo-sanitize`,
  `xss-clean`, `hpp`, per-route rate limiting
- React: `ProtectedRoute`, `RoleProtectedRoute`, `PermissionRoute`, an
  `AuthContext`, and an axios client that **auto-refreshes the access token**
  on 401 and retries the original request

## Folder structure

```
src/
├── config          # env.js, db.js
├── constants        # roles.js, permissions.js
├── controllers      # auth.controller.js
├── services         # auth.service.js, token.service.js, email.service.js
├── repositories      # user.repository.js, session.repository.js
├── models           # User.js, Session.js
├── routes           # auth.routes.js
├── middleware
│   ├── authenticate.js
│   ├── authorize.js
│   ├── permission.js
│   ├── rateLimiter.js
│   ├── security.js
│   └── errorHandler.js
├── validators        # auth.validator.js
├── emails
│   ├── mailer.js
│   ├── verificationEmail.js
│   ├── resetPasswordEmail.js
│   ├── loginAlertEmail.js
│   └── otpEmail.js
├── utils            # ApiError, ApiResponse, asyncHandler, jwt, otp
├── logs
├── app.js
└── server.js

client/src/
├── api/axiosClient.js
├── context/AuthContext.jsx
├── components/ProtectedRoute.jsx, RoleProtectedRoute.jsx, PermissionRoute.jsx
├── pages/ (example pages)
└── App.jsx
```

## Setup

```bash
# Backend
cp .env.example .env     # fill in MONGO_URI, JWT secrets, SMTP creds
npm install
npm run dev               # nodemon, or `npm start`

# Frontend (optional example client)
cd client
npm install
npm start
```

MongoDB must be running and reachable at `MONGO_URI`. For real email
delivery, fill in `SMTP_HOST/PORT/USER/PASS` (e.g. Mailtrap for dev,
SES/SendGrid/Postmark for prod).

## How auth actually works here

1. **Login** (`POST /api/auth/login`) verifies credentials, then issues:
   - an **access token** (short-lived, e.g. 15m) — cookie `accessToken`
   - a **refresh token** (long-lived, e.g. 7d) — cookie `refreshToken`,
     scoped to `path=/api/auth` so it's only ever sent to auth routes
   - Both cookies are `httpOnly`, `secure` in production, and `sameSite`.
   - A **session document** is stored in Mongo with a **hash** of the
     refresh token (never the raw token), device/browser/OS/IP, and a
     TTL `expiresAt` so Mongo prunes expired sessions automatically.
   - A **login alert email** is fired (fire-and-forget) with the login
     metadata.

2. **Every protected request** goes through `authenticate`, which reads the
   `accessToken` cookie (or `Authorization: Bearer` header for non-browser
   clients), verifies the JWT, loads the user, and attaches `req.user`.

3. **When the access token expires**, the client calls
   `POST /api/auth/refresh` (the included axios interceptor does this
   automatically on a 401 and retries the original request). The server
   verifies the refresh token, matches it against the session's stored
   hash, and **rotates** both tokens (refresh-token rotation) — a stolen,
   already-used refresh token becomes invalid on the next legitimate use.

4. **Authorization** is layered on top of authentication:
   - `authorize('ADMIN', 'SUPER_ADMIN')` — role gate
   - `checkPermission('DELETE_USERS')` — fine-grained permission gate
     (`SUPER_ADMIN` always passes)
   - The **frontend guards are UX only**. The backend middleware is the
     real enforcement — a request to `DELETE /api/users/1` made directly
     (bypassing the UI) still gets a `403` if the caller lacks the
     permission.

## Key endpoints (`/api/auth`)

| Method | Path                     | Auth required | Description |
|--------|--------------------------|----------------|--------------|
| POST   | `/register`              | –              | Create account, send verification email |
| POST   | `/verify-email`          | –              | Verify email with token |
| POST   | `/resend-verification`   | –              | Resend verification email |
| POST   | `/login`                 | –              | Login, sets cookies, sends login alert |
| POST   | `/refresh`               | refresh cookie | Rotate access/refresh tokens |
| POST   | `/logout`                | access cookie  | Revoke current session |
| POST   | `/logout-all`            | ✔              | Revoke all sessions |
| POST   | `/forgot-password`       | –              | Send reset email |
| POST   | `/reset-password`        | –              | Reset with token |
| POST   | `/change-password`       | ✔              | Change password, revokes other sessions |
| POST   | `/otp/request`           | –              | Send email OTP |
| POST   | `/otp/verify`            | –              | Verify OTP |
| GET    | `/me`                    | ✔              | Current user |
| GET    | `/sessions`              | ✔              | List active sessions |
| DELETE | `/sessions/:sessionId`   | ✔              | Revoke one session |
| GET    | `/admin/users`           | ✔ + RBAC/perm  | Example RBAC + permission route |
| DELETE | `/admin/users/:id`       | ✔ + RBAC/perm  | Example RBAC + permission route |

## Notes / production checklist

- Set real, long random values for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
- Set `NODE_ENV=production` so cookies get `secure: true` and `sameSite: strict`.
- Point `CLIENT_URL` / CORS at your real frontend origin.
- Consider adding email/IP-based anomaly detection before sending login alerts.
- Add integration tests around token rotation and permission middleware before shipping.
