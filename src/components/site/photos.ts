/**
 * Website photography. Free photos under the Unsplash Licence (no Unsplash+ images).
 * Served through next/image so Vercel resizes and caches them.
 */
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=75&w=2400`;

export const PHOTOS = {
  desk: { src: "/site/hero-desk.jpg", alt: "An open notebook on a wooden desk surrounded by colourful pens, crayons, chalk and a calculator", credit: "Crest Learning & STEM Centre" },
  nairobi: { src: u("photo-1741991110666-88115e724741"), alt: "The Nairobi skyline among green trees on a sunny day", credit: "imsogabriel stock" },
  westlands: { src: u("photo-1693464550496-8a6b114585b8"), alt: "Office towers in Westlands, Nairobi, with a palm tree in front", credit: "Tedd_ M" },
  onlineLesson: { src: u("photo-1620829813573-7c9e1877706f"), alt: "A young man working on a laptop at a desk", credit: "Unsplash" },
  homeStudy: { src: u("photo-1759852692971-a2abc6799cbd"), alt: "A smiling student carrying her notes, with headphones around her neck", credit: "Unsplash" },
  reading: { src: u("photo-1525715843408-5c6ec44503b1"), alt: "A girl reading a book on a sofa in front of full bookshelves", credit: "Unsplash" },
  classroom: { src: u("photo-1758270705031-ebd46917a454"), alt: "A teacher answering a question while students listen", credit: "Vitaly Gariev" },
  graduateMan: { src: u("photo-1631131426242-0abfa7f209c2"), alt: "A graduate in cap and gown", credit: "Askas Jeremy" },
  graduateWoman: { src: u("photo-1692883758975-cf33d6055bbe"), alt: "A graduate in her gown walking along a street", credit: "Raymond Owusu-Afriyie" },
  helping: { src: u("photo-1758525860435-502240649c59"), alt: "A teenage girl studying at a table at home with help from her older sister", credit: "Vitaly Gariev" },
  examPrep: { src: u("photo-1758525861793-f278aacf6bb5"), alt: "A teenage girl concentrating as she revises for an exam", credit: "Vitaly Gariev" },
  primaryWriting: { src: u("photo-1567057420215-0afa9aa9253a"), alt: "Primary pupils writing in their exercise books at their desks", credit: "Unsplash" },
  boyWriting: { src: u("photo-1632932693914-89b90ae3d16d"), alt: "A boy at his desk with his exercise book, looking up from his work", credit: "Unsplash" },
  athletics: { src: u("photo-1760115244975-3783bdd30f7a"), alt: "Young athletes training on a running track", credit: "Sincerely Media" },
  // STEM centre
  labTeacher: { src: u("photo-1582719471137-c3967ffb1c42"), alt: "Two scientists in lab coats examining test tubes in a laboratory", credit: "Unsplash" },
  labTeacher2: { src: u("photo-1760074032600-36943c264fbf"), alt: "A woman and a man in lab coats working together at a laboratory bench", credit: "Unsplash" },
  labGoggles: { src: u("photo-1583911860345-9ae84483d7af"), alt: "A scientist in a lab coat and gloves using a pipette at the bench", credit: "Unsplash" },
  labPour: { src: u("photo-1694230155228-cdde50083573"), alt: "A rack of test tubes filled with brightly coloured liquids", credit: "Unsplash" },
  labFlasks: { src: u("photo-1614283226124-5a2f0f23752b"), alt: "Flasks of coloured liquid lined up on a laboratory bench", credit: "Unsplash" },
  codingGirl: { src: u("photo-1653566031285-8e198bca09d5"), alt: "A girl in glasses working on a laptop", credit: "UK Black Tech" },
  codingClass: { src: u("photo-1531482615713-2afd69097998"), alt: "Two young people working through code together on a computer", credit: "Unsplash" },
  codingTablet: { src: u("photo-1710770563074-6d9cc0d3e338"), alt: "A student writing code on a laptop", credit: "Unsplash" },
  codeScreen: { src: u("photo-1607799279861-4dd421887fb3"), alt: "A laptop screen showing colourful program code", credit: "Mohammad Rahmani" },
  teacherNotes: { src: u("photo-1758874384555-37d50c0ee81a"), alt: "A teacher writing notes at her desk", credit: "Vitaly Gariev" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
