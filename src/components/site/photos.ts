/**
 * Website photography: one-to-one teaching and hands-on STEM, never crowded classrooms.
 * Free photos under the Pexels Licence (self-hosted in /public/site/photos) or the Unsplash Licence.
 * Served through next/image so Vercel resizes and caches them.
 */
const p = (name: string) => `/site/photos/${name}.jpg`;
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=75&w=2400`;

export const PHOTOS = {
  desk: { src: "/site/hero-desk.jpg", alt: "An open notebook on a wooden desk surrounded by colourful pens, crayons, chalk and a calculator", credit: "Crest Learning & STEM Centre" },
  nairobi: { src: u("photo-1741991110666-88115e724741"), alt: "The Nairobi skyline among green trees on a sunny day", credit: "imsogabriel stock" },
  westlands: { src: u("photo-1693464550496-8a6b114585b8"), alt: "Office towers in Westlands, Nairobi, with a palm tree in front", credit: "Tedd_ M" },
  reading: { src: u("photo-1525715843408-5c6ec44503b1"), alt: "A girl reading a book on a sofa in front of full bookshelves", credit: "Unsplash" },
  athletics: { src: u("photo-1760115244975-3783bdd30f7a"), alt: "Young athletes training on a running track", credit: "Sincerely Media" },
  codeScreen: { src: u("photo-1607799279861-4dd421887fb3"), alt: "A laptop screen showing colourful program code", credit: "Mohammad Rahmani" },

  // One-to-one teaching (Pexels Licence, self-hosted)
  oneToOne: { src: p("one-to-one-whiteboard"), alt: "A smiling teacher with her arm around a young student at the whiteboard after their lesson", credit: "Katerina Holmes, Pexels", position: "center 22%" },
  teacherBoard: { src: p("teacher-whiteboard"), alt: "A teacher at her desk in front of a whiteboard of maths problems, ready for a lesson", credit: "Katerina Holmes, Pexels", position: "center 40%" },
  boardMaths: { src: p("primary-maths-whiteboard"), alt: "A primary pupil working through maths problems on a whiteboard", credit: "Katerina Holmes, Pexels", position: "75% center" },
  boyNotebook: { src: p("lower-secondary-notebook"), alt: "A smiling student with his notebook and pencil", credit: "Katerina Holmes, Pexels", position: "60% 30%" },
  onlineLesson: { src: p("online-lesson-boy"), alt: "A student taking notes in a one-to-one online lesson with his teacher on the laptop screen", credit: "Katerina Holmes, Pexels" },
  onlineGirl: { src: p("online-lesson-girl"), alt: "A student writing notes during a one-to-one online lesson with her teacher", credit: "Katerina Holmes, Pexels" },
  onlineGirl2: { src: p("online-lesson-girl-2"), alt: "A student and her teacher in a one-to-one video lesson, the teacher giving a thumbs-up", credit: "Katerina Holmes, Pexels" },
  tutorHome: { src: p("tutor-at-home"), alt: "A tutor and a young girl working together on a laptop at home", credit: "Pexels", position: "center 35%" },
  tutorHome2: { src: p("tutor-at-home-2"), alt: "A tutor sitting beside a girl as they follow a lesson on a laptop", credit: "Pexels", position: "65% 30%" },

  // STEM centre (Pexels Licence, self-hosted)
  roboticsTutor: { src: p("robotics-one-to-one"), alt: "A teacher and a teenage student talking through a robotics project beside a 3D printer", credit: "Pexels", position: "center 40%" },
  roboticsTutor2: { src: p("robotics-one-to-one-2"), alt: "A teacher guiding a student as he assembles a robot", credit: "Pexels", position: "center 60%" },
  roboticsBuild: { src: p("robotics-build"), alt: "A student wiring up the robot he is building", credit: "Pexels", position: "center 40%" },
  labCircuit: { src: p("lab-circuit"), alt: "A student in a lab coat working on a computer circuit board with a screwdriver", credit: "Pexels", position: "center 35%" },
  labCircuitClose: { src: p("lab-circuit-close"), alt: "A student in a lab coat carefully fitting a component into a circuit board", credit: "Pexels", position: "center 30%" },
  labTubes: { src: p("lab-test-tubes"), alt: "A student in a lab coat holding a rack of test tubes with green and orange solutions", credit: "Pexels" },
  labTablet: { src: p("lab-astronomy"), alt: "A student in a lab coat studying the Moon’s craters on a tablet beside a star chart", credit: "Pexels" },
  robotGirl: { src: p("coding-robot-young"), alt: "A young girl watching the small coding robot she programmed", credit: "Pexels", position: "65% center" },
  blockCoding: { src: p("block-coding"), alt: "A child snapping coding blocks together on a tablet to program colourful robot cubes", credit: "Pexels" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
/** Where to anchor a photo when it is cropped, unless the page says otherwise. */
export const photoPosition = (k: PhotoKey): string | undefined => (PHOTOS[k] as { position?: string }).position;
