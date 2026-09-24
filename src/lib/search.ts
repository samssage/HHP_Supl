import type { Course, Item } from "./types";

// What people actually type -> what the inventory calls it.
const SYNONYMS: Record<string, string[]> = {
  pennies: ["pinnies"],
  penny: ["pinnies"],
  pinny: ["pinnies"],
  vests: ["pinnies"],
  beanbag: ["bean"],
  beanbags: ["bean"],
  bean: ["bean"],
  racquet: ["racket", "racquet"],
  racket: ["racket", "racquet"],
  racquets: ["racket", "racquet"],
  rackets: ["racket", "racquet"],
  mat: ["mat"],
  mats: ["mat"],
  mannequin: ["manikin"],
  mannequins: ["manikin"],
  dummy: ["manikin"],
  ball: ["ball"],
  balls: ["ball"],
  frisbee: ["frisbee", "disc"],
  frisbees: ["frisbee", "disc"],
  weights: ["kettlebell", "medicine ball", "bumper", "weight"],
  hoops: ["hoop"],
  jump: ["rope"],
  track: ["track"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function stem(w: string) {
  return w.length > 3 ? w.replace(/(es|s)$/, "") : w;
}

function haystack(i: Item) {
  return norm(
    [i.name, i.originalName, i.description, i.make, i.model, i.color, i.location, i.category, i.id, ...i.tags]
      .filter(Boolean)
      .join(" "),
  );
}

export function matchCourse(q: string, courses: Course[]): Course | undefined {
  const m = q.toLowerCase().replace(/\s/g, "").match(/^(pe)?(\d{3})$/);
  if (!m) return undefined;
  return courses.find((c) => c.slug === `pe${m[2]}`);
}

export function searchCourses(q: string, courses: Course[]) {
  const nq = norm(q);
  if (!nq) return [];
  const exact = matchCourse(q, courses);
  if (exact) return [exact];
  const words = nq.split(" ").map(stem);
  return courses.filter((c) => {
    const h = norm(`${c.code} ${c.title} ${c.sport} ${c.category} ${c.coreTags.join(" ")}`);
    return words.every((w) => h.includes(w));
  });
}

export function searchItems(q: string, items: Item[]) {
  const nq = norm(q);
  if (!nq) return [];
  const words = nq.split(" ");
  const scored: { item: Item; score: number }[] = [];
  for (const item of items) {
    const h = haystack(item);
    const name = norm(item.name);
    let score = 0;
    let ok = true;
    for (const w of words) {
      const options = SYNONYMS[w] ?? [stem(w)];
      const hit = options.find((o) => h.includes(o));
      if (!hit) {
        ok = false;
        break;
      }
      score += name.includes(hit) ? 3 : 1;
    }
    if (ok) scored.push({ item, score: score + (item.isReference ? -5 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name)).map((s) => s.item);
}
