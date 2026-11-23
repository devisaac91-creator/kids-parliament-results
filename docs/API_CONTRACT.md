# API Contract

This application targets a RESTful JSON backend (`/api`) with cookie sessions (`credentials: 'include'`).

## Endpoints

### Auth
- `POST /api/auth/sign-in` `{ email, password }` -> `User`
- `POST /api/auth/sign-up` `{ email, fullName, password, signupCode }` -> `User`
- `POST /api/auth/sign-out` -> `{}`
- `GET /api/auth/me` -> `User | null`

### Students & Classes
- `GET /api/classes` -> `ClassRoom[]`
- `POST /api/classes` `{ name }` -> `ClassRoom`
- `GET /api/students?classId=` -> `Student[]`
- `POST /api/students` `Partial<Student>` -> `Student`
- `POST /api/students/bulk` `{ students: Partial<Student>[] }` -> `{ imported: number }`

### Scores & Slips
- `GET /api/scores?periodId=&classId=&subjectId=` -> `Score[]`
- `POST /api/scores` `{ periodId, classId, subjectId, rawScore, absent, studentId }` -> `Score`
- `GET /api/slips/class?periodId=&classId=` -> `StudentSlip[]`
- `GET /api/parent/slip?code=&periodId=` -> `StudentSlip`
