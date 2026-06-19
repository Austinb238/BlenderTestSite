/* ===== LUMÉ — overlay tab handlers ===== */

function makeOverlay(tabId, overlayId, closeId) {
  const tab     = document.getElementById(tabId);
  const overlay = document.getElementById(overlayId);
  const close   = document.getElementById(closeId);
  const video   = document.getElementById("hero-video");

  function open(e) {
    if (e) e.preventDefault();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    if (video) video.pause();
  }
  function closeOverlay() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    if (video) video.play();
  }

  if (tab)   tab.addEventListener("click", open);
  if (close) close.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); });

  return closeOverlay;
}

const closeGallery = makeOverlay("gallery-tab", "gallery-overlay", "gallery-close");
const closeDocker  = makeOverlay("docker-tab",  "docker-overlay",  "docker-close");
const closeCyber   = makeOverlay("cyber-tab",   "cyber-overlay",   "cyber-close");
const closeCS      = makeOverlay("cs-tab",      "cs-overlay",      "cs-close");

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeGallery(); closeDocker(); closeCyber(); closeCS(); }
});
