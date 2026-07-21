# Flowboard Kanban application

Open `index.html` in a browser for the responsive drag-and-drop demo. It includes a local demo sign-in and persists board state in `localStorage`.

## Production setup
1. Create a PostgreSQL database and apply `schema.sql`.
2. Implement the routes in `API.md` in Next.js/Express using Argon2 password hashes and HTTP-only secure session cookies.
3. Replace the localStorage adapter with authenticated API calls and optimistic card moves.
4. Deploy the app to Vercel/Render and PostgreSQL to Neon/Supabase. Configure `DATABASE_URL`, `SESSION_SECRET`, and the production origin.

The supplied schema, API contract, and UI are deliberately separated so the demo can be adopted into a production stack without reworking its interaction model.
