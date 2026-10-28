import type { Curriculum } from "@prisma/client";

/** The subjects and curriculum levels Crest teaches. Loaded automatically on a fresh database. */
export const SUBJECTS: [string, string][] = [
  ["Mathematics", "MATH"],
  ["English", "ENG"],
  ["Kiswahili", "KIS"],
  ["Physics", "PHY"],
  ["Chemistry", "CHEM"],
  ["Biology", "BIO"],
  ["Integrated Science", "ISCI"],
  ["Computer Science", "CS"],
  ["Business Studies", "BUS"],
  ["Economics", "ECON"],
  ["Geography", "GEO"],
  ["History", "HIST"],
  ["French", "FRE"],
];

export const LEVELS: Record<Curriculum, string[]> = {
  CAMBRIDGE: [
    "Primary Stage 4", "Primary Stage 5", "Primary Stage 6",
    "Lower Secondary Stage 7", "Lower Secondary Stage 8", "Lower Secondary Stage 9",
    "IGCSE Year 10", "IGCSE Year 11", "AS Level", "A Level",
  ],
  EDEXCEL: [
    "iPrimary", "iLowerSecondary",
    "International GCSE Year 10", "International GCSE Year 11",
    "International AS Level", "International A Level",
  ],
  CBE: [
    "Grade 4", "Grade 5", "Grade 6",
    "Grade 7 (Junior School)", "Grade 8 (Junior School)", "Grade 9 (Junior School)",
    "Grade 10 (Senior School)", "Grade 11 (Senior School)", "Grade 12 (Senior School)",
  ],
  IB: ["PYP", "MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP1", "DP2"],
};
