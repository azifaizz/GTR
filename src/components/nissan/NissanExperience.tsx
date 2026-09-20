import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ANNOTATIONS, type HotspotId, type ScreenPoint } from "./scene-data";

const NissanScene = lazy(() => import("./NissanScene"));

// ============= Audio engine (generated sound effects, /public/audio) =============
interface AudioEngine {
  ctx: AudioContext;
  master: GainNode;
  engineGain: GainNode;
  buffers: Record<string, AudioBuffer>;
}

const AUDIO_NAMES = ["engine-idle", "whoosh", "ui-blip", "exhaust-roar"] as const;

let audioEngine: AudioEngine | null = null;
let audioLoading: Promise<AudioEngine | null> | null = null;

const audioState = {
  muted: false,
  engineTarget: 0,
  loaderDone: false,
  roarPlayed: false,
  ready: false,
  progress: 0,
  failed: false,
};

function playOneShot(engine: AudioEngine, name: string, volume: number) {
  const buffer = engine.buffers[name];
  if (!buffer) return;
  const source = engine.ctx.createBufferSource();
  source.buffer = buffer;
  const gain = engine.ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(engine.master);
  source.start();
}

function fireRoar() {
  if (!audioEngine || audioState.roarPlayed) return;
  if (audioEngine.ctx.state !== "running") return;
  if (audioState.muted) return;
  audioState.roarPlayed = true;
  playOneShot(audioEngine, "exhaust-roar", 0.85);
}

/**
 * Fetch + decode every sound up front, while the loading screen is still up,
 * using a suspended AudioContext (decoding works before user interaction).
 * The context is only resumed on the first gesture, which is instant because
 * all buffers are already decoded.
 */
function preloadAudio(): Promise<AudioEngine | null> {
  if (audioLoading) return audioLoading;
  audioLoading = (async () => {
    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      const buffers: Record<string, AudioBuffer> = {};
      let done = 0;
      await Promise.all(
        AUDIO_NAMES.map(async (name) => {
          const response = await fetch(`/audio/${name}.mp3`);
          if (!response.ok) throw new Error(`audio ${name} ${response.status}`);
          buffers[name] = await ctx.decodeAudioData(await response.arrayBuffer());
          done += 1;
          audioState.progress = done / AUDIO_NAMES.length;
        })
      );
      // Looping engine rumble bed — starts silent, driven by scroll velocity.
      const engineSource = ctx.createBufferSource();
      engineSource.buffer = buffers["engine-idle"] ?? null;
      engineSource.loop = true;
      const engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineSource.connect(engineGain).connect(master);
      engineSource.start();
      audioEngine = { ctx, master, engineGain, buffers };
      audioState.ready = true;
      audioState.progress = 1;
      return audioEngine;
    } catch {
      // Never block the experience on audio.
      audioState.failed = true;
      audioState.ready = true;
      audioState.progress = 1;
      return null;
    }
  })();
  return audioLoading;
}

async function resumeAudio() {
  const engine = await preloadAudio();
  if (!engine) return;
  if (engine.ctx.state !== "running") {
    try {
      await engine.ctx.resume();
    } catch {
      return;
    }
  }
  if (audioState.loaderDone) fireRoar();
}

const ranges: Array<{ id: HotspotId; at: number }> = [
  { id: "front", at: 0 }, { id: "headlight", at: 0.13 }, { id: "splitter", at: 0.215 },
  { id: "frontWheel", at: 0.29 }, { id: "mirror", at: 0.375 }, { id: "profile", at: 0.455 },
  { id: "body", at: 0.545 }, { id: "rearWheel", at: 0.625 }, { id: "rearQuarter", at: 0.705 },
  { id: "wing", at: 0.785 }, { id: "rear", at: 0.865 }, { id: "final", at: 0.94 },
];

function Loader() {
  const { progress: sceneProgress, active } = useProgress();
  const [audioProgress, setAudioProgress] = useState(audioState.progress);
  const [isFullyReady, setIsFullyReady] = useState(false);

  // Start decoding sounds immediately, alongside the 3D assets.
  useEffect(() => {
    void preloadAudio();
    const id = window.setInterval(() => {
      setAudioProgress(audioState.progress);
      if (audioState.ready) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  // Weighted: the models dominate the wait, the sounds are a small slice.
  const progress = sceneProgress * 0.85 + audioProgress * 15;
  const loaded = sceneProgress >= 100 && !active && audioProgress >= 1;

  useEffect(() => {
    if (loaded) {
      // Add a small delay to allow the GPU to upload textures and compile shaders
      // without janking the initial fade-in animation.
      const timer = setTimeout(() => setIsFullyReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  const visible = !isFullyReady;

  // The GT-R roars the moment everything is loaded. If the browser hasn't
  // unlocked audio yet (no gesture), resumeAudio fires it on the first one.
  useEffect(() => {
    if (isFullyReady) {
      audioState.loaderDone = true;
      fireRoar();
    }
  }, [isFullyReady]);

  return (
    <div className={`vehicle-loader ${visible ? "is-visible" : ""}`} aria-live="polite" aria-hidden={!visible}>
      <div className="loader-lockup">
        <span className="loader-brand">NISSAN</span>
        <span className="loader-status">
          {sceneProgress >= 100 && audioProgress < 1 ? "LOADING AUDIO SYSTEM" : (loaded ? "COMPILING SHADERS" : "INITIALIZING VEHICLE SYSTEM")}
        </span>
        <div className="loader-track"><span style={{ transform: `scaleX(${Math.min(100, progress) / 100})` }} /></div>
        <span className="loader-percent">{Math.round(Math.min(100, progress)).toString().padStart(2, "0")}%</span>
      </div>
    </div>
  );
}


export default function NissanExperience() {
  const scrollRoot = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const projected = useRef<ScreenPoint>({ x: 0, y: 0, visible: false });
  const line = useRef<SVGLineElement>(null);
  const label = useRef<HTMLElement | null>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const activeRef = useRef<HotspotId>("front");
  const scrolledRef = useRef(false);
  const [active, setActive] = useState<HotspotId>("front");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [quality, setQuality] = useState<"low" | "high">("high");
  const annotation = ANNOTATIONS.find((item) => item.id === active && !(item.id === "front" && !hasScrolled));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    setQuality(mobile || cores < 6 ? "low" : "high");
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: reduced ? 0 : 1.15, smoothWheel: !reduced, wheelMultiplier: 0.82 });
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);
    const trigger = ScrollTrigger.create({
      trigger: scrollRoot.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        progress.current = self.progress;
        if (self.progress > 0.02 && !scrolledRef.current) {
          scrolledRef.current = true;
          setHasScrolled(true);
        }
        let next: HotspotId = "front";
        for (const range of ranges) if (self.progress >= range.at) next = range.id;
        if (next !== activeRef.current && audioEngine && !audioState.muted) {
          playOneShot(audioEngine, "whoosh", 0.5);
          playOneShot(audioEngine, "ui-blip", 0.4);
        }
        activeRef.current = next;
        setActive((current) => current === next ? current : next);
        // Engine rumble breathes with scroll speed.
        audioState.engineTarget = Math.min(0.34, 0.1 + Math.abs(self.getVelocity()) / 9000);
      },
    });
    // Browsers block autoplay: resume the (already decoded) audio engine on the first gesture.
    const handleUnlock = () => { void resumeAudio(); };
    window.addEventListener("pointerdown", handleUnlock, { once: true });
    window.addEventListener("wheel", handleUnlock, { once: true });
    window.addEventListener("touchstart", handleUnlock, { once: true });
    window.addEventListener("keydown", handleUnlock, { once: true });
    // Ease the engine rumble toward its target every frame.
    const pumpAudio = () => {
      if (!audioEngine) return;
      audioState.engineTarget = Math.max(0.1, audioState.engineTarget * 0.985);
      const goal = audioState.muted ? 0 : audioState.engineTarget;
      const gain = audioEngine.engineGain.gain;
      gain.value += (goal - gain.value) * 0.08;
    };
    gsap.ticker.add(pumpAudio);
    const updateLine = () => {
      const point = projected.current;
      const show = point.visible && activeRef.current !== "final" && !(activeRef.current === "front" && !scrolledRef.current);
      // The label remounts on every part change (key={active}); re-acquire the
      // live node if the cached ref points at a detached element.
      if (!label.current || !label.current.isConnected) {
        label.current = document.querySelector<HTMLElement>(".inspection-copy");
      }
      if (label.current) {
        const w = label.current.offsetWidth;
        const h = label.current.offsetHeight;
        const marginX = 20;
        const marginY = 78;
        const gapX = 26;
        const gapY = 30;
        // Prefer up-left of the dot; flip to the right when near the left edge,
        // drop below the dot when near the top. Clamp inside the viewport.
        let lx = point.x - gapX - w;
        let ly = point.y - gapY - h;
        if (lx < marginX) lx = point.x + gapX;
        if (ly < marginY) ly = point.y + gapY;
        lx = Math.min(lx, window.innerWidth - marginX - w);
        ly = Math.min(ly, window.innerHeight - 30 - h);
        label.current.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
      }
      if (line.current) {
        const box = label.current?.getBoundingClientRect();
        if (box) {
          // Anchor the line at the label edge nearest the dot.
          const ax = Math.min(Math.max(point.x, box.left + 6), box.right - 6);
          const ay = Math.min(Math.max(point.y, box.top + 6), box.bottom - 6);
          line.current.setAttribute("x1", `${ax}`);
          line.current.setAttribute("y1", `${ay}`);
        }
        line.current.setAttribute("x2", `${point.x}`);
        line.current.setAttribute("y2", `${point.y}`);
        line.current.style.opacity = show ? "1" : "0";
      }
      if (dot.current) {
        dot.current.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
        dot.current.style.opacity = show ? "1" : "0";
      }
    };
    gsap.ticker.add(updateLine);
    return () => {
      trigger.kill();
      lenis.destroy();
      gsap.ticker.remove(onTick);
      gsap.ticker.remove(updateLine);
      gsap.ticker.remove(pumpAudio);
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("wheel", handleUnlock);
      window.removeEventListener("touchstart", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
    };
  }, []);

  useEffect(() => {
    audioState.muted = !soundOn;
  }, [soundOn]);

  const sectionNumber = useMemo(() => String(Math.max(1, ranges.findIndex((item) => item.id === active) + 1)).padStart(2, "0"), [active]);

  return (
    <main className="nissan-experience">
      <div className="scene-layer" aria-hidden="true">
        <Suspense fallback={null}><NissanScene progress={progress} projected={projected} quality={quality} /></Suspense>
      </div>
      <Loader />
      <div className="grain" aria-hidden="true" />
      <header className="top-hud">
        <div className="brand-mark"><b>NISSAN</b><span>GT-R / R35</span></div>
        <div className="hud-right">
          <button
            type="button"
            className={`sound-toggle ${soundOn ? "is-on" : ""}`}
            onClick={() => { setSoundOn((value) => !value); void resumeAudio(); }}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
          >
            <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
            <span className="sound-label">{soundOn ? "SOUND ON" : "SOUND OFF"}</span>
          </button>
        </div>
      </header>
      <div className="side-index" aria-hidden="true"><span>{sectionNumber}</span><i /><span>12</span></div>
      <svg className="annotation-line" aria-hidden="true"><line ref={line} x1="28%" y1="64%" x2="28%" y2="64%" /></svg>
      <span ref={dot} className="projected-dot" aria-hidden="true"><i /></span>

      <section className={`intro-hud ${progress.current > 0.06 ? "is-dim" : ""}`}>
        <h1>NISSAN GT-R</h1>
        <div className="scroll-cue"><span>SCROLL</span><i /></div>
      </section>

      <aside ref={(node) => { label.current = node; }} className={`inspection-copy ${annotation ? "is-visible" : ""}`}>
        {annotation && <h2>{annotation.title}</h2>}
      </aside>

      <section className={`final-copy ${active === "final" ? "is-visible" : ""}`}>
        <span>NISSAN GT-R // FINAL CONFIGURATION</span>
        <h2>THE MACHINE.<br /><em>BUILT</em> TO MOVE.</h2>
        <button type="button" onClick={() => setSpecsOpen((value) => !value)} aria-expanded={specsOpen}>
          <span>{specsOpen ? "CLOSE SPECIFICATIONS" : "EXPLORE THE SPECIFICATIONS"}</span><i aria-hidden="true">↗</i>
        </button>
        <div id="specifications" className={`specifications ${specsOpen ? "is-open" : ""}`}>
          <div><b>3.8L</b><span>TWIN-TURBO V6</span></div>
          <div><b>AWD</b><span>ATTESA E-TS</span></div>
          <div><b>R35</b><span>GRAND TOURING</span></div>
        </div>
      </section>

      <div ref={scrollRoot} className="scroll-track" aria-hidden="true">
        {ranges.map((range) => <div key={range.id} data-shot={range.id} />)}
      </div>
    </main>
  );
}