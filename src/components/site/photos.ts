/**
 * Website photography, hosted on the site itself so quality is consistent and pages don't depend on another server.
 * Source photos are free under the Unsplash Licence. Each was checked by eye before it was added.
 */
const p = (name: string) => `/site/photos/${name}.jpg`;

export const PHOTOS = {
  desk: { src: "/site/hero-desk.jpg", alt: "An open notebook on a wooden desk surrounded by colourful pens, crayons, chalk and a calculator" },
  westlands: { src: p("westlands"), alt: "Office towers in Westlands, Nairobi, with a palm tree in front" },
  // Students and teaching
  classroom: { src: p("classroom"), alt: "A smiling primary pupil working at his desk in class" },
  helping: { src: p("helping"), alt: "A student helping her classmates with their work" },
  examPrep: { src: p("examPrep"), alt: "A student resting her head on a stack of books at her study desk" },
  onlineLesson: { src: p("onlineLesson"), alt: "A young man working on a laptop at a desk" },
  homeStudy: { src: p("homeStudy"), alt: "A smiling student carrying her notes, with headphones around her neck" },
  reading: { src: p("reading"), alt: "A girl reading a book on a sofa in front of full bookshelves" },
  primaryWriting: { src: p("primaryWriting"), alt: "Primary pupils writing in their exercise books at their desks" },
  boyWriting: { src: p("boyWriting"), alt: "A boy at his desk with his exercise book, looking up from his work" },
  graduateMan: { src: p("graduateMan"), alt: "A smiling graduate in cap and gown" },
  graduateWoman: { src: p("graduateWoman"), alt: "A smiling graduate holding up her certificate" },
  athletics: { src: p("athletics"), alt: "A running track and sports field on a sunny day" },
  // STEM Centre
  labTeacher: { src: p("labTeacher"), alt: "Two scientists in lab coats examining test tubes in a laboratory" },
  labTeacher2: { src: p("labTeacher2"), alt: "A woman and a man in lab coats working together at a laboratory bench" },
  labGoggles: { src: p("labGoggles"), alt: "A scientist in a lab coat and gloves using a pipette at the bench" },
  labPour: { src: p("labPour"), alt: "A rack of test tubes filled with brightly coloured liquids" },
  codingGirl: { src: p("codingGirl"), alt: "A girl in glasses working on a laptop" },
  codingClass: { src: p("codingClass"), alt: "Two young people working through code together on a computer" },
  codingTablet: { src: p("codingTablet"), alt: "A student writing code on a laptop" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
