/** STEM Centre options a family can tick on the enquiry form. */
export const INTERESTS = [
  { value: "lab", label: "Science laboratory" },
  { value: "coding", label: "Coding and programming" },
] as const;

export function interestLabels(v: string | null | undefined) {
  return (v ?? "")
    .split(",")
    .map((x) => INTERESTS.find((i) => i.value === x)?.label)
    .filter(Boolean) as string[];
}
