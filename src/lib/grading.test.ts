import { describe, expect, it } from "vitest";
import { DEFAULT_GRADE_SCALE } from "@/constants";
import { gradeForValue, isTotalPass, parseScoreInput, scoreToGrade, strengthFor, totalBestSix } from "./grading";

describe("grading rules", () => {
  it("maps scores to the default grade bands", () => {
    expect(scoreToGrade(80, DEFAULT_GRADE_SCALE).grade).toBe(1);
    expect(scoreToGrade(79, DEFAULT_GRADE_SCALE).grade).toBe(2);
    expect(scoreToGrade(50, DEFAULT_GRADE_SCALE).grade).toBe(4);
    expect(scoreToGrade(45, DEFAULT_GRADE_SCALE).grade).toBe(5);
    expect(scoreToGrade(24, DEFAULT_GRADE_SCALE).grade).toBe(9);
  });
  it("treats absent as grade 9", () => {
    expect(gradeForValue("absent", DEFAULT_GRADE_SCALE)?.grade).toBe(9);
  });
  it("totals 4 core subjects plus the best 2 others", () => {
    const r = totalBestSix({ math: 50, eng: 50, sci: 50, soc: 50, rme: 90, cad: 10, comp: 80, ctech: 20, french: 30, ghl: "absent" });
    expect(r.total).toBe(370);
    expect(r.countedSubjectIds).toContain("rme");
    expect(r.countedSubjectIds).toContain("comp");
    expect(r.countedSubjectIds).not.toContain("cad");
  });
  it("passes the total at 300", () => {
    expect(isTotalPass(300, 300)).toBe(true);
    expect(isTotalPass(299, 300)).toBe(false);
  });
  it("classifies subject strength by pass %", () => {
    expect(strengthFor(70)).toBe("STRONG");
    expect(strengthFor(50)).toBe("FAIR");
    expect(strengthFor(49)).toBe("WEAK");
  });
  it("rejects scores outside 0-100", () => {
    expect(parseScoreInput("101").ok).toBe(false);
    expect(parseScoreInput("7.5").ok).toBe(false);
  });
});
