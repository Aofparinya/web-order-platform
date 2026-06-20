# Order Platform Back Office

Next.js back-office application for the Order Platform. The browser only talks
to the built-in BFF route handlers; access and refresh tokens remain in
HttpOnly cookies.

## Local development

```powershell
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3004`. The API Gateway must run on
`http://localhost:3000`.

Default administrator:

```text
admin@order-platform.local
ChangeMe123!
```

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Security model

- Access and refresh tokens are stored in HttpOnly, SameSite=Lax cookies.
- Mutations require a double-submit CSRF token and same-origin request.
- The BFF rotates refresh tokens and retries one failed request after a 401.
- Backend services remain the source of truth for authorization.
