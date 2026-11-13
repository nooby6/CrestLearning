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
      { href: "/stem#lab", label: "Science laboratory" },
      { href: "/stem#coding", label: "Coding and programming" },
      { href: "/stem#pathway", label: "The coding pathway" },
    ],
  },
  {
    label: "Homeschooling",
    href: "/homeschooling",
    items: [
      { href: "/homeschooling", label: "How homeschooling works" },
      { href: "/homeschooling#who", label: "Who it’s for" },
      { href: "/homeschooling#week", label: "A week at Crest" },
    ],
  },
  { label: "For parents", href: "/parents" },
  {
    label: "Admissions",
    href: "/admissions",
    items: [
      { href: "/admissions", label: "How to join" },
      { href: "/admissions#fees", label: "Fees and payment" },
      { href: "/admissions#enquire", label: "Enquire now" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

export const PORTALS = [
  { href: "/portal", label: "Parent portal" },
  { href: "/portal", label: "Student portal" },
  { href: "/portal", label: "Teacher portal" },
];
