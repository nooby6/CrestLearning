/**
 * Website photography. Free photos under the Unsplash Licence (no Unsplash+ images).
 * Served through next/image so Vercel resizes and caches them.
 */
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=75&w=2400`;

export const PHOTOS = {
  desk: { src: "/site/hero-desk.jpg", alt: "An open notebook on a wooden desk surrounded by colourful pens, crayons, chalk and a calculator", credit: "Crest Learning" },
  nairobi: { src: u("photo-1741991110666-88115e724741"), alt: "The Nairobi skyline among green trees on a sunny day", credit: "imsogabriel stock" },
  westlands: { src: u("photo-1693464550496-8a6b114585b8"), alt: "Office towers in Westlands, Nairobi, with a palm tree in front", credit: "Tedd_ M" },
  onlineLesson: { src: u("photo-1598032604570-d65c6680d246"), alt: "A boy following a lesson on a laptop at home", credit: "Thomas Park" },
  homeStudy: { src: u("photo-1758612898312-708f2ffdcd53"), alt: "A smiling boy studying at a desk with a laptop and notebook", credit: "Vitaly Gariev" },
  reading: { src: u("photo-1549737221-bef65e2604a6"), alt: "A girl sitting and reading a book", credit: "Josh Applegate" },
  classroom: { src: u("photo-1758270705031-ebd46917a454"), alt: "A teacher answering a question while students listen", credit: "Vitaly Gariev" },
  graduateMan: { src: u("photo-1631131426242-0abfa7f209c2"), alt: "A graduate in cap and gown", credit: "Askas Jeremy" },
  graduateWoman: { src: u("photo-1692883758975-cf33d6055bbe"), alt: "A graduate in her gown walking along a street", credit: "Raymond Owusu-Afriyie" },
  helping: { src: u("photo-1758525860435-502240649c59"), alt: "A teenage girl studying at a table at home with help from her older sister", credit: "Vitaly Gariev" },
  examPrep: { src: u("photo-1758525861793-f278aacf6bb5"), alt: "A teenage girl concentrating as she revises for an exam", credit: "Vitaly Gariev" },
  primaryWriting: { src: u("photo-1610552254576-9500a3e99999"), alt: "A young girl writing carefully on paper", credit: "Carl Jorgensen" },
  boyWriting: { src: u("photo-1560785496-3c9d27877182"), alt: "A young boy doing his schoolwork", credit: "Annie Spratt" },
  athletics: { src: u("photo-1760115244975-3783bdd30f7a"), alt: "Young athletes training on a running track", credit: "Sincerely Media" },
  teacherNotes: { src: u("photo-1758874384555-37d50c0ee81a"), alt: "A teacher writing notes at her desk", credit: "Vitaly Gariev" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
