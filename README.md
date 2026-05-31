# Training Centers Admin

A React + TypeScript frontend prototype for the Training Operations Platform API.

## Run locally

1. Start the ASP.NET Core Web API backend.
2. By default, local development uses the Vite dev server proxy for `/api` requests.
   The proxy target is configured in `vite.config.ts`:

```bash
VITE_API_BASE_URL=https://localhost:7122
```

For production-style builds, `.env` points the built app directly at the backend.

3. Install dependencies if needed:

```bash
npm install
```

4. Start the Vite dev server:

```bash
npm run dev
```

## What is included

- Dashboard metrics and today's classes.
- CRUD screens for trainees, courses, instructors, batches, and schedules.
- Batch trainee enrollment management.
- Attendance marking by batch and date.
- Certificate listing and generation form.
- Typed API client with centralized ASP.NET ProblemDetails handling.
- Reusable table, pagination, status badge, drawer, form, search, loading, error, and empty states.

## Assumptions

- API responses use camelCase and enum strings.
- List endpoints return `{ items, page, pageSize, totalCount, totalPages }`.
- No authentication is required for this prototype.
- `react-router-dom` is not installed in this project, so navigation uses the browser History API without adding a dependency.
