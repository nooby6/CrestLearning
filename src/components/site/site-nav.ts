/** The website's menus: header (with dropdowns), mobile menu and footer. */
export type NavGroup = { label: string; href: string; items?: { href: string; label: string; note?: string }[] };

export const SITE_NAV: NavGroup[] = [
  {
    label: "Programmes",
    href: "/programmes",
    items: [
      { href: "/programmes#primary", label: "Primary", note: "Ages 5 to 11" },
      { href: "/programmes#lower-secondary", label: "Lower Secondary", note: "Ages 11 to 14" },
      { href: "/programmes#igcse", label: "IGCSE and GCSE", note: "Ages 14 to 16" },
      { href: "/programmes#a-level", label: "A Level and IB Diploma", note: "Ages 16 to 18" },
    ],
  },
  {
    label: "STEM Centre",
    href: "/stem",
    items: [
      { href: "/stem", label: "About the STEM Centre" },
      { href: "/stem#lab", label: "Science Laboratory" },
      { href: "/stem#coding", label: "Coding and Programming" },
      { href: "/stem#pathway", label: "The Coding Pathway" },
    ],
  },
  {
    label: "Homeschooling",
    href: "/homeschooling",
    items: [
      { href: "/homeschooling", label: "How Homeschooling Works" },
      { href: "/homeschooling#who", label: "Who It’s For" },
      { href: "/homeschooling#week", label: "A Week at Crest" },
    ],
  },
  { label: "For Parents", href: "/parents" },
  {
    label: "Admissions",
    href: "/admissions",
    items: [
      { href: "/admissions", label: "How to Join" },
      { href: "/admissions#fees", label: "Fees and Payment" },
      { href: "/admissions#enquire", label: "Enquire Now" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

export const PORTALS = [
  { href: "/portal", label: "Parent Portal" },
  { href: "/portal", label: "Student Portal" },
  { href: "/portal", label: "Teacher Portal" },
];
