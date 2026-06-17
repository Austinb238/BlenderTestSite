/* ===== LUMÉ scroll-driven site ===== */
gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 192;
const FRAME_SPEED = 2.0;            // 1.8–2.2; product animation finishes ~55% scroll
const IMAGE_SCALE = 0.85;          // padded-cover sweet spot
const framePath = (i) => `frames/frame_${String(i + 1).padStart(4, "0")}.webp`;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const canvasWrap = document.querySelector(".canvas-wrap");
const heroSection = document.getElementById("hero");
const scrollContainer = document.getElementById("scroll-container");

const frames = new Array(FRAME_COUNT);
let currentFrame = -1;
let bgColor = "#0a0a0a";

/* ---------- Canvas sizing ---------- */
function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFrame(currentFrame < 0 ? 0 : currentFrame);
}

/* ---------- Padded cover renderer ---------- */
function sampleBgColor(img) {
  try {
    const s = document.createElement("canvas");
    s.width = s.height = 1;
    const sctx = s.getContext("2d");
    sctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
    bgColor = `rgb(${r},${g},${b})`;
  } catch (e) { /* keep previous */ }
}

function drawFrame(index) {
  const img = frames[index];
  if (!img) return;
  const cw = window.innerWidth, ch = window.innerHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ---------- Two-phase preloader ---------- */
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loader-fill");
const loaderPercent = document.getElementById("loader-percent");

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { frames[i] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = framePath(i);
  });
}

async function preload() {
  let loaded = 0;
  const bump = () => {
    loaded++;
    const pct = Math.round((loaded / FRAME_COUNT) * 100);
    loaderFill.style.width = pct + "%";
    loaderPercent.textContent = pct + "%";
  };

  // Phase 1: first 10 frames for instant first paint
  const firstBatch = Math.min(10, FRAME_COUNT);
  for (let i = 0; i < firstBatch; i++) { await loadFrame(i); bump(); }
  if (frames[0]) sampleBgColor(frames[0]);
  drawFrame(0);

  // Phase 2: remaining frames in parallel
  await Promise.all(
    Array.from({ length: FRAME_COUNT - firstBatch }, (_, k) =>
      loadFrame(firstBatch + k).then(bump)
    )
  );
  loader.classList.add("hidden");
  ScrollTrigger.refresh();
}

/* ---------- Lenis smooth scroll ---------- */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ---------- Frame-to-scroll binding ---------- */
ScrollTrigger.create({
  trigger: scrollContainer,
  start: "top top",
  end: "bottom bottom",
  scrub: true,
  onUpdate: (self) => {
    const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
    const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
    if (index !== currentFrame) {
      currentFrame = index;
      if (index % 20 === 0 && frames[index]) sampleBgColor(frames[index]);
      requestAnimationFrame(() => drawFrame(currentFrame));
    }
  },
});

/* ---------- Circle-wipe hero reveal ---------- */
ScrollTrigger.create({
  trigger: scrollContainer,
  start: "top top",
  end: "bottom bottom",
  scrub: true,
  onUpdate: (self) => {
    const p = self.progress;
    heroSection.style.opacity = Math.max(0, 1 - p * 15);
    const wipe = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
    canvasWrap.style.clipPath = `circle(${wipe * 75}% at 50% 50%)`;
  },
});

/* ---------- Section entrance animations ---------- */
function buildTimeline(type, children) {
  const tl = gsap.timeline({ paused: true });
  switch (type) {
    case "fade-up":    tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" }); break;
    case "slide-left": tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
    case "slide-right":tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
    case "scale-up":   tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out" }); break;
    case "stagger-up": tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" }); break;
    case "clip-reveal":tl.from(children, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" }); break;
    default:           tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
  }
  return tl;
}

document.querySelectorAll(".scroll-section").forEach((section) => {
  const type = section.dataset.animation;
  const persist = section.dataset.persist === "true";
  const enter = parseFloat(section.dataset.enter) / 100;
  const leave = parseFloat(section.dataset.leave) / 100;
  const children = section.querySelectorAll(
    ".section-label, .section-heading, .section-body, .section-note, .cta-button, .stat"
  );
  const tl = buildTimeline(type, children);
  let played = false;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      const visible = p >= enter && p <= leave;
      section.style.opacity = visible || (persist && p > leave) ? 1 : 0;
      if (visible && !played) { tl.play(); played = true; }
      else if (!visible && played && !persist && p < enter) { tl.reverse(); played = false; }
    },
  });
});

/* ---------- Counters ---------- */
document.querySelectorAll(".stat-number").forEach((el) => {
  const target = parseFloat(el.dataset.value);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const obj = { v: 0 };
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      // Trigger the count once the stats band is roughly on screen (~58–74%)
      if (self.progress >= 0.56 && obj.v === 0) {
        gsap.to(obj, {
          v: target, duration: 2, ease: "power1.out",
          onUpdate: () => {
            el.textContent = decimals === 0
              ? Math.round(obj.v).toLocaleString()
              : obj.v.toFixed(decimals);
          },
        });
      }
    },
  });
});

/* ---------- Horizontal marquee ---------- */
document.querySelectorAll(".marquee-wrap").forEach((el) => {
  const speed = parseFloat(el.dataset.scrollSpeed) || -25;
  const enter = parseFloat(el.dataset.enter) / 100;
  const leave = parseFloat(el.dataset.leave) / 100;
  gsap.to(el.querySelector(".marquee-text"), {
    xPercent: speed, ease: "none",
    scrollTrigger: { trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true },
  });
  ScrollTrigger.create({
    trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true,
    onUpdate: (self) => {
      const p = self.progress; const fade = 0.03; let o = 0;
      if (p >= enter - fade && p <= enter) o = (p - (enter - fade)) / fade;
      else if (p > enter && p < leave) o = 1;
      else if (p >= leave && p <= leave + fade) o = 1 - (p - leave) / fade;
      el.style.opacity = o;
    },
  });
});

/* ---------- Gallery overlay ---------- */
const galleryTab = document.getElementById("gallery-tab");
const galleryOverlay = document.getElementById("gallery-overlay");
const galleryClose = document.getElementById("gallery-close");

function openGallery(e) {
  if (e) e.preventDefault();
  galleryOverlay.classList.add("open");
  galleryOverlay.setAttribute("aria-hidden", "false");
  lenis.stop();                       // freeze background scroll while open
}
function closeGallery() {
  galleryOverlay.classList.remove("open");
  galleryOverlay.setAttribute("aria-hidden", "true");
  lenis.start();
}
if (galleryTab) galleryTab.addEventListener("click", openGallery);
if (galleryClose) galleryClose.addEventListener("click", closeGallery);
galleryOverlay.addEventListener("click", (e) => { if (e.target === galleryOverlay) closeGallery(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGallery(); });

/* ---------- Init ---------- */
window.addEventListener("resize", sizeCanvas);
sizeCanvas();
preload();