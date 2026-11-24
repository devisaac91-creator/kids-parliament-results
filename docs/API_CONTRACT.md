# API Contract

The browser calls same-origin `/api` endpoints with JSON and cookie credentials. The server handler is `server/index.ts` (served through the `/api/$` route); its paths and response shapes match `src/api/http/index.ts` and `src/api/types.ts`.

## Authentication
- `POST /api/auth/signin` `{ email, password }` -> `{ user: User }`
- `POST /api/auth/signup` `{ fullName, email, password, signupCode? }` -> `{ user: User }`
- `POST /api/auth/signout` -> `{}`
- `GET /api/auth/me` -> `User | null`

## Classes, Students, and Staff
- `GET /api/classes` -> `ClassRoom[]`
- `POST /api/classes` `{ name, level }` -> `ClassRoom`
- `PATCH /api/classes/:id` `{ name }` -> `ClassRoom`
- `POST /api/classes/:id/promote` -> `{ moved, graduated }`
- `GET /api/students?classId=&search=&includeInactive=` -> `Student[]`
- `GET /api/students/:id` -> `Student`
- `POST /api/students` `{ fullName, gender, classId }` -> `Student`
- `POST /api/students/bulk` `{ classId, rows }` -> `Student[]`
- `PATCH /api/students/:id` `{ fullName?, gender? }` -> `Student`
- `POST /api/students/move` `{ ids, classId }` -> `204`
- `POST /api/students/:id/withdraw` -> `Student`
- `POST /api/students/:id/regenerate-code` -> `Student`
- `GET /api/teachers` -> `User[]` (admin only)
- `POST /api/teachers/:id/approve`, `POST /api/teachers/:id/status`, `POST /api/teachers/:id/password`
- `GET /api/assignments?teacherId=` -> `TeacherAssignment[]`
- `PUT /api/teachers/:id/assignments` `{ items }` -> `TeacherAssignment[]`

## Results and Settings
- `GET /api/exam-periods`; `POST /api/exam-periods` `{ name, month }`
- `POST /api/exam-periods/:id/status` `{ status }`; `GET /api/exam-periods/:id/missing-scores`
- `GET /api/scores?periodId=&classId=&subjectId=` -> `Score[]`
- `PUT /api/scores` `{ periodId, studentId, subjectId, value }` -> `Score | 204`
- `GET /api/scores/progress?periodId=` -> `EntryProgress[]`
- `GET /api/reports/subject?periodId=&classId=&subjectId=` -> `SubjectReport`
- `GET /api/reports/class-analysis?periodId=&classId=` -> `ClassAnalysis` (admin only)
- `GET /api/slips/student?periodId=&studentId=` -> `StudentSlip` (admin only)
- `GET /api/slips/class?periodId=&classId=` -> `StudentSlip[]` (admin only)
- `POST /api/parent/lookup` `{ code }` -> `ParentStudentView`
- `POST /api/parent/slip` `{ code, periodId }` -> `StudentSlip`
- `GET /api/settings` -> `Settings` (signup code is redacted except for admins)
- `PATCH /api/settings` `Partial<Settings>` -> `Settings` (admin only)
- `GET /api/audit-log?action=&actorId=&from=&to=` -> `AuditEntry[]` (admin only)

Admin/teacher authorization is enforced in the API handler. Teacher score and report access is limited to assigned class/subject pairs. Public parent-code attempts and sign-in failures are rate-limited using the `api_rate_limits` table; run `docs/NEON_FOLLOW_UP.sql` after the initial schema.
