# Kids Parliament Results

Build the FRONT END ONLY of a school results web app called "Kids Parliament Results" for Kids Parliament Educational Centre (Ghana).

HARD RULES
- Frontend only. Do NOT use Supabase, Lovable Cloud, edge functions, or any real backend, database or integration. Do not connect anything.
- Every data call goes through one API layer (described below) so a developer can later replace the mock with a real backend without touching the screens.
- Stack: React, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query.
- Mobile first. Teachers and parents mostly use phones on slow data: light pages, no heavy libraries, tables become cards on small screens.
- Look: clean, professional school style. Primary navy blue #1B2A9B, white background, green/amber/red only for status. Inter or system sans font.

ARCHITECTURE (follow exactly)
1. src/types/index.ts: all domain types (Role, User, Student, ClassRoom, Subject, ExamPeriod, Score, GradeBand, TeacherAssignment, AuditEntry, SubjectReport, StudentSlip, etc.). IDs are strings, dates are ISO strings.
2. src/api/types.ts: one interface called Api listing every backend call as a typed async function, grouped: auth, students, classes, teachers, assignments, examPeriods, scores, reports, slips, parentAccess, settings, auditLog.
3. src/api/mock/: mock implementation of Api with seed data kept in memory and localStorage so it survives refresh. Seed: 3 classes (Basic 7, 8, 9) with about 20 students each, 1 admin, 3 teachers (one pending approval), 3 exam periods (two published, one open) and realistic scores.
4. src/api/index.ts: exports "api". This is the ONLY place that chooses mock or http. Also create src/api/http/ with a stub implementation that calls fetch on VITE_API_BASE_URL (default "/api") with credentials "include".
5. Screens never import mock data. They use hooks in src/hooks/ that call "api".
6. src/lib/grading.ts: pure functions only (scoreToGrade, totalBestSix, isPass, etc). No UI code.
7. src/constants.ts: subjects, core subjects, default grade scale, pass marks.
8. Create docs/API_CONTRACT.md describing every Api function: purpose, inputs, outputs, which role may call it, and the business rule it enforces. Create docs/DATA_MODEL.md describing every entity and field. Keep both updated.

DOMAIN RULES
- Subjects (hardcoded; every student takes all 10). Core: Mathematics, English Language, Integrated Science, Social Studies. Others: Religious and Moral Education (RME), Creative Arts and Design, Computing, Career Technology, French, Ghanaian Language.
- Classes: Basic 7, Basic 8, Basic 9 (admin can add or rename).
- Exam period: one per month, e.g. "October 2026". Status flow: draft, open, closed, published.
- Score: whole number 0 to 100 per student, subject and period. Or status "absent" (counts as 0 in totals, grade 9). Or empty (not yet entered).
- Grade scale (editable by Admin): 80-100 = 1 Excellent; 70-79 = 2 Very Good; 60-69 = 3 Good; 50-59 = 4 Credit; 45-49 = 5 Credit; 40-44 = 6 Credit; 35-39 = 7 Pass; 25-34 = 8 Pass; 0-24 = 9 Fail.
- Total score = 4 core subjects + the best 2 of the other 6 (by score), out of 600. Total pass mark 300. Subject pass mark 50.
- NO class positions, NO rankings, NO teacher remarks anywhere in the app.
- Teachers can edit scores only while the period is "open" and only for their assigned subject and class. Admin can edit anytime. Every score change goes to an audit log (who, what, old value, new value, when).
- Parents see results only when the period is "published".

ROLES AND SCREENS
Public pages: /signin (staff email and password), /signup (teacher: full name, email, password, school sign-up code; make the code field hideable by a config flag), /parent (enter student code).
A new teacher account is "pending". After login they see only "Waiting for Admin approval".
For the demo, show quick-login buttons for Admin, Teacher and a sample parent code on the sign-in page.

ADMIN (/admin/...)
- Dashboard: totals of students, classes, teachers; pending teacher approvals; score-entry progress for the open period as a class x subject grid (entered / total).
- Students: searchable list with class filter. Add one student (full name, gender, class). Bulk add: upload CSV or Excel with columns Name, Gender (optional Class); show a preview table with validation (missing gender, duplicates), let the admin pick the class for the batch, then confirm to save. Offer a downloadable template. Edit a student, move to another class (single and multi-select), mark as withdrawn.
- Parent codes: show or regenerate a student's code; printable list of codes per class (name, class, code).
- Classes: create or rename; "Promote class" (move a whole class up, archive Basic 9 leavers) with a confirmation step.
- Teachers: list; approve pending; assign subjects and classes to each teacher; disable or enable; set a new password.
- Exam periods: create, open, close, publish or unpublish. Publishing warns about missing scores.
- Scores: view by period, class and subject; edit; download CSV or Excel in a fixed layout: Student, Gender, Class, one column per subject (10), Total. Also download a single subject.
- Reports: Subject Performance Analysis Report for a class and period (see below).
- Result slips: choose period and class, preview any student's slip, download PDF for one student or the whole class (one page per student).
- Settings: grade scale, pass marks, school name, upload logo, stamp and signature, signatory name and position (default "Mr. Dan-Derrick Believe", "Head, Examination Committee"), school sign-up code.
- Activity log with filters.

TEACHER (/teacher/...)
- Dashboard: my assignments (subject and class) with entry progress.
- Enter scores: choose period, class, subject. List students with a numeric input (0 to 100) and an "Absent" toggle. Inline validation, autosave per row with a saved indicator, progress such as "14 of 21 entered". Show a locked message when the period is closed.
- Subject report for my subject, class and period: students who wrote, pass, fail, pass %, average, high, low, change in average since last month, grade distribution (1 to 9) as a simple bar chart, and a list of students below 50. Print or download PDF.

PARENT (/parent)
- Enter a student code, then see that student's page: month selector (published months only), the result slip, and Download PDF and Print buttons. Friendly error for an invalid code, and a "too many attempts, try again later" state. No sign up. Keep the code in session memory only.

RESULT SLIP (reusable component SlipView, A4 portrait with print CSS)
Match the school's existing report style: thick navy double border around the page; header with logo on the left, "KIDS PARLIAMENT EDUCATIONAL CENTRE" in bold navy, "EXAMINATION COMMITTEE" in grey, "Knowledge Is Power" in italics; thick navy rule; title "STUDENT RESULT SLIP"; line "Basic 8 | End-of-Month Examination | October 2026"; student name and gender. Table with navy header row: Subject | Score | Grade | Description | Counted. Core subjects first, then the others, alternating light blue-grey rows, with a mark on the 6 subjects counted in the total. Below it: TOTAL SCORE (out of 600) and PASS or FAIL against 300. Small legend of the grade scale. Note line: "Pass mark is 50%. Total score is the 4 core subjects plus the best 2 other subjects (out of 600)." Footer "AUTHORISATION AND APPROVAL" with certify text, NAME, POSITION, SIGNATURE (image), DATE, and a dashed box holding the stamp image captioned "EXAMINATION COMMITTEE STAMP". Use placeholder images at public/assets/logo.png, stamp.png and signature.png that I will replace.

SUBJECT PERFORMANCE ANALYSIS REPORT (component ReportView, A4, same page style)
Title "SUBJECT PERFORMANCE ANALYSIS REPORT" and the line "Basic 8 | End-of-Month Examination | October 2026". Four summary cards: Students who wrote, Class average total (out of 600), Passed in total, Failed in total. Table: Subject | Sat | Pass | Fail | Pass % (with bar) | Avg | High | Low | Change | Status (STRONG = 70% or more passed, FAIR = 50 to 69%, WEAK = under 50%), ending with a TOTAL SCORE (out of 600) row. "Sat" excludes absent students. Then "Strongest subjects" (top 3) and "Weakest subjects - priority for improvement" (bottom 3) boxes, then "Observations and recommendations" bullets generated from the data (weakest area, WEAK subjects, change since last month, biggest improvement and drop, number of students who failed 3 or more core subjects), then the same authorisation block.

Build all screens against the mock API with role-based route guards, loading, empty and error states, and the two docs files. Do not add real authentication or any server code.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5c874695-eb95-4da2-b89f-3aec72432363).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy to Vercel

The repository includes `vercel.json`, and `vite.config.ts` selects Nitro's `vercel` preset when Vercel builds the project. Keep **Output Directory** unset in Vercel; Nitro generates `.vercel/output` automatically.

After pushing these files to GitHub, redeploy the Vercel project. In **Settings → Environment Variables**, add:

- `VITE_USE_MOCK_API=true` while using the built-in demonstration data. Change it to `false` only after the production HTTP API is available.
- `VITE_API_BASE_URL=/api` when using the HTTP API.
- `DATABASE_URL` and `SESSION_SECRET` only for the server-side production API. Never prefix secrets with `VITE_`, because those values are exposed to the browser.

The current repository still needs its production API implemented before real accounts and Neon records can work.
