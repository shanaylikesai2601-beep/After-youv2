# API routes
`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` issue/clear secure HTTP-only sessions. `GET|POST /api/boards`; `GET|PATCH|DELETE /api/boards/:id`; `POST /api/boards/:id/columns`; `POST /api/cards`; `PATCH /api/cards/:id` accepts `{columnId,position}` for atomic drag-and-drop moves; `DELETE /api/cards/:id`.

Every route verifies membership before reading or mutating a workspace. Use a transaction plus the `cards_column_position` index to reorder cards safely.
