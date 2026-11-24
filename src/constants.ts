import type { GradeBand, Settings, Subject } from "@/types";

export const SUBJECTS: Subject[] = [
  { id: "math", name: "Mathematics", shortName: "Maths", core: true },
  { id: "eng", name: "English Language", shortName: "English", core: true },
  { id: "sci", name: "Integrated Science", shortName: "Science", core: true },
  { id: "soc", name: "Social Studies", shortName: "Social", core: true },
  { id: "rme", name: "Religious and Moral Education", shortName: "RME", core: false },
  { id: "cad", name: "Creative Arts and Design", shortName: "CAD", core: false },
  { id: "comp", name: "Computing", shortName: "Computing", core: false },
  { id: "ctech", name: "Career Technology", shortName: "Career Tech", core: false },
  { id: "french", name: "French", shortName: "French", core: false },
  { id: "ghl", name: "Ghanaian Language", shortName: "Gh. Lang", core: false },
];

export const CORE_SUBJECT_IDS = SUBJECTS.filter((s) => s.core).map((s) => s.id);
export const ELECTIVES_COUNTED = 2;
export const MAX_TOTAL = 600;

export const DEFAULT_GRADE_SCALE: GradeBand[] = [
  { min: 80, max: 100, grade: 1, description: "Excellent" },
  { min: 70, max: 79, grade: 2, description: "Very Good" },
  { min: 60, max: 69, grade: 3, description: "Good" },
  { min: 50, max: 59, grade: 4, description: "Credit" },
  { min: 45, max: 49, grade: 5, description: "Credit" },
  { min: 40, max: 44, grade: 6, description: "Credit" },
  { min: 35, max: 39, grade: 7, description: "Pass" },
  { min: 25, max: 34, grade: 8, description: "Pass" },
  { min: 0, max: 24, grade: 9, description: "Fail" },
];

export const DEFAULT_SUBJECT_PASS_MARK = 50;
export const DEFAULT_TOTAL_PASS_MARK = 300;

/** Config flag: show the school sign-up code field on teacher sign-up. */
export const REQUIRE_SIGNUP_CODE = true;

/** Parent code lookups allowed before a temporary lockout. */
export const PARENT_MAX_ATTEMPTS = 5;
export const PARENT_LOCKOUT_MS = 5 * 60 * 1000;

export const subjectName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id;

/** School details shown when the server's settings cannot be loaded (sign-up code is never included). */
export const FALLBACK_SETTINGS: Settings = {
  schoolName: "Kids Parliament Educational Centre",
  motto: "Knowledge Is Power",
  gradeScale: DEFAULT_GRADE_SCALE,
  subjectPassMark: DEFAULT_SUBJECT_PASS_MARK,
  totalPassMark: DEFAULT_TOTAL_PASS_MARK,
  logoUrl: "/assets/logo.png",
  stampUrl: "/assets/stamp.png",
  signatureUrl: "/assets/signature.png",
  signatoryName: "",
  signatoryPosition: "Head, Examination Committee",
  signupCode: "",
};
