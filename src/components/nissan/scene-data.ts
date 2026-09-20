import type { MutableRefObject } from "react";
import { Vector3 } from "three";

export type HotspotId =
  | "front"
  | "headlight"
  | "splitter"
  | "frontWheel"
  | "mirror"
  | "profile"
  | "body"
  | "rearWheel"
  | "rearQuarter"
  | "wing"
  | "rear"
  | "final";

export type Shot = {
  id: HotspotId;
  start: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  bank?: number;
};

export type ScreenPoint = { x: number; y: number; visible: boolean };

export type ExperienceRefs = {
  progress: MutableRefObject<number>;
  projected: MutableRefObject<ScreenPoint>;
};

// The car rests on the garage floor slab (y = 0.101) — all anchors are lifted +0.1 to stay glued to their parts.
export const HOTSPOTS: Record<HotspotId, [number, number, number]> = {
  front: [-0.45, 0.85, 2.25],
  headlight: [-0.76, 0.79, 2.24],
  splitter: [-0.58, 0.38, 2.48],
  frontWheel: [-1.02, 0.62, 1.47],
  mirror: [-1.14, 1.12, 0.46],
  profile: [-1.05, 0.98, 0],
  body: [-1.07, 0.82, -0.25],
  rearWheel: [-1.02, 0.62, -1.55],
  rearQuarter: [-0.92, 0.86, -2.05],
  wing: [-0.45, 1.52, -2.18],
  rear: [0, 0.92, -2.43],
  final: [0, 0.8, 0],
};

// Garage interior bounds: |x| < 4.9, |z| < 5.9, y < 5 — every waypoint stays inside.
export const DESKTOP_SHOTS: Shot[] = [
  { id: "front", start: 0, position: [-4.4, 1.7, 5.15], target: [0, 0.85, 0.2], fov: 40 },
  { id: "front", start: 0.075, position: [-3.35, 1.42, 4.8], target: [-0.3, 0.8, 1.45], fov: 35 },
  { id: "headlight", start: 0.16, position: [-2.18, 1.05, 3.25], target: [-0.72, 0.92, 2.29], fov: 30, bank: -0.018 },
  { id: "splitter", start: 0.24, position: [-2.05, 0.54, 3.35], target: HOTSPOTS.splitter, fov: 29 },
  { id: "frontWheel", start: 0.32, position: [-2.5, 0.7, 1.78], target: HOTSPOTS.frontWheel, fov: 31, bank: 0.015 },
  { id: "mirror", start: 0.4, position: [-2.55, 1.35, 0.9], target: [-1.1, 1.23, 0.62], fov: 29 },
  { id: "profile", start: 0.49, position: [-5.5, 1.35, 0.05], target: [0, 0.82, 0], fov: 35 },
  { id: "body", start: 0.58, position: [-2.55, 1.03, -0.15], target: HOTSPOTS.body, fov: 30, bank: -0.012 },
  { id: "rearWheel", start: 0.66, position: [-2.48, 0.72, -1.65], target: HOTSPOTS.rearWheel, fov: 30 },
  { id: "rearQuarter", start: 0.74, position: [-3.35, 1.0, -3.75], target: [-0.35, 0.82, -1.4], fov: 34, bank: 0.018 },
  { id: "wing", start: 0.82, position: [-2.22, 1.72, -3.15], target: HOTSPOTS.wing, fov: 29 },
  { id: "rear", start: 0.89, position: [0, 1.12, -4.7], target: HOTSPOTS.rear, fov: 33 },
  { id: "final", start: 0.96, position: [3.9, 1.85, -4.85], target: [0, 0.82, -0.35], fov: 39 },
  { id: "final", start: 1, position: [4.15, 2.0, -5.1], target: [0, 0.8, -0.2], fov: 40 },
];

export const MOBILE_SHOTS: Shot[] = DESKTOP_SHOTS.map((shot) => ({
  ...shot,
  // Keep the camera inside the garage bounds (same X/Z as desktop, just slightly lifted if too low)
  position: [shot.position[0], Math.max(shot.position[1], 0.85), shot.position[2]],
  // Rely entirely on a wider Field of View (FOV) to fit the car horizontally
  fov: Math.min(75, shot.fov + 28),
  bank: 0,
}));

export const ANNOTATIONS = [
  { id: "front", kicker: "01 / FORM", title: "THE FRONT", copy: "A silhouette designed to look aggressive before it moves." },
  { id: "headlight", kicker: "01 / LIGHTING", title: "SIGNATURE LED HEADLIGHTS", copy: "Precision illumination. Designed for instant recognition." },
  { id: "splitter", kicker: "02 / AERODYNAMICS", title: "FRONT SPLITTER", copy: "Engineered for visual aggression and controlled airflow." },
  { id: "frontWheel", kicker: "03 / PERFORMANCE", title: "PERFORMANCE WHEEL", copy: "Precision grip. Mechanical confidence." },
  { id: "mirror", kicker: "04 / DETAIL", title: "SIDE MIRROR", copy: "Every surface has a purpose." },
  { id: "profile", kicker: "05 / SILHOUETTE", title: "THE PROFILE", copy: "Long. Low. Unmistakable." },
  { id: "body", kicker: "06 / DESIGN", title: "SCULPTED BODYWORK", copy: "Light moves across every surface with intention." },
  { id: "rearWheel", kicker: "07 / PERFORMANCE", title: "REAR WHEEL", copy: "Balanced. Planted. Ready." },
  { id: "rearQuarter", kicker: "07 / FORM", title: "REAR QUARTER", copy: "Power carried through every line." },
  { id: "wing", kicker: "08 / AERODYNAMICS", title: "REAR WING", copy: "A statement in motion." },
  { id: "rear", kicker: "09 / IDENTITY", title: "THE REAR", copy: "Designed to leave a lasting impression." },
] as const;

export function interpolateShot(progress: number, shots: Shot[]) {
  const first = shots[0];
  if (!first) {
    return { id: "front" as HotspotId, position: new Vector3(-4.4, 1.7, 5.15), target: new Vector3(0, 0.85, 0.2), fov: 40, bank: 0 };
  }
  let index = 0;
  while (index < shots.length - 2 && progress > (shots[index + 1]?.start ?? 1)) index += 1;
  const from = shots[index] ?? first;
  const to = shots[Math.min(index + 1, shots.length - 1)] ?? from;
  const span = Math.max(0.001, to.start - from.start);
  const raw = Math.min(1, Math.max(0, (progress - from.start) / span));
  const t = raw * raw * (3 - 2 * raw);
  return {
    id: raw > 0.58 ? to.id : from.id,
    position: new Vector3(...from.position).lerp(new Vector3(...to.position), t),
    target: new Vector3(...from.target).lerp(new Vector3(...to.target), t),
    fov: from.fov + (to.fov - from.fov) * t,
    bank: (from.bank ?? 0) + ((to.bank ?? 0) - (from.bank ?? 0)) * t,
  };
}