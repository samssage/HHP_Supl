import type { Item } from "./types";

export type Skill = {
  slug: string;
  name: string;
  blurb: string;
  tags: string[];
  keywords: RegExp;
};

// Browse by movement skill — for instructors planning drills rather than a specific sport.
export const SKILLS: Skill[] = [
  {
    slug: "throwing-catching",
    name: "Throwing & catching",
    blurb: "Balls, bean bags, discs and gloves",
    tags: ["softball", "football", "lacrosse"],
    keywords: /bean bag|frisbee|disc|foam ball|playground ball|glove|mitt/i,
  },
  {
    slug: "kicking",
    name: "Kicking & footwork with a ball",
    blurb: "Soccer balls, kickballs, goals, kicking tees",
    tags: ["soccer", "kickball"],
    keywords: /kicking tee|playground ball/i,
  },
  {
    slug: "dribbling",
    name: "Dribbling & ball handling",
    blurb: "Basketballs, soccer balls, playground balls",
    tags: ["basketball"],
    keywords: /soccer ball|playground ball|foam ball/i,
  },
  {
    slug: "striking",
    name: "Striking with an implement",
    blurb: "Rackets, paddles, bats and clubs",
    tags: ["tennis", "badminton", "pickleball", "racquetball", "golf"],
    keywords: /\bbat\b|racket|racquet|paddle|club/i,
  },
  {
    slug: "agility",
    name: "Agility, speed & footwork",
    blurb: "Cones, spots, hurdles, ropes",
    tags: [],
    keywords: /cone|spot marker|hurdle|ropes|baton|aerobic step/i,
  },
  {
    slug: "balance",
    name: "Balance & body control",
    blurb: "Beams, BOSU, gymnastics and yoga gear",
    tags: ["gymnastics", "yoga"],
    keywords: /bosu|balance|foam pad/i,
  },
  {
    slug: "strength",
    name: "Strength & power",
    blurb: "Kettlebells, medicine balls, plyo boxes, throws",
    tags: ["strength"],
    keywords: /shot|plyo|resistance/i,
  },
  {
    slug: "flexibility",
    name: "Flexibility & recovery",
    blurb: "Mats, rollers, yoga blocks",
    tags: ["yoga"],
    keywords: /roller|mat\b|flexibility/i,
  },
  {
    slug: "cardio",
    name: "Cardio & conditioning",
    blurb: "Steps, ropes, treadmill",
    tags: ["fitness"],
    keywords: /treadmill|aerobic step|ropes/i,
  },
  {
    slug: "rhythm",
    name: "Rhythm & movement",
    blurb: "Mirrors, music, steps",
    tags: ["dance"],
    keywords: /aerobic step|hoop/i,
  },
  {
    slug: "combat",
    name: "Striking & self-defense",
    blurb: "Hit pads and strike shields",
    tags: ["self-defense"],
    keywords: /hit pad/i,
  },
  {
    slug: "water",
    name: "Water skills",
    blurb: "Kickboards and life vests",
    tags: ["aquatics"],
    keywords: /$^/,
  },
  {
    slug: "outdoor",
    name: "Outdoor & camping",
    blurb: "Tents, packs, sleeping gear",
    tags: ["outdoor"],
    keywords: /$^/,
  },
  {
    slug: "emergency",
    name: "Emergency response",
    blurb: "CPR manikins, AED trainers, first aid",
    tags: ["cpr"],
    keywords: /$^/,
  },
  {
    slug: "assessment",
    name: "Fitness testing",
    blurb: "Calipers, dynamometers, BP, FMS kits",
    tags: ["assessment"],
    keywords: /$^/,
  },
];

export function itemsForSkill(skill: Skill, items: Item[]) {
  return items.filter(
    (i) =>
      !i.isReference &&
      i.condition !== "Retired" &&
      (i.tags.some((t) => skill.tags.includes(t)) || skill.keywords.test(i.name)),
  );
}
