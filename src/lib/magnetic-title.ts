/**
 * Magnetic Title Effect
 *
 * Characters in headings with [data-magnetic] subtly drift toward the cursor.
 * Nearest characters shift position and tint green. Disabled on touch devices.
 */

const RADIUS = 120;
const MAX_DISPLACEMENT = 8;
const ACCENT_COLOR = '#10a37f';

interface CharState {
  span: HTMLSpanElement;
  originalX: number;
  originalY: number;
}

function initMagneticTitle(heading: HTMLElement) {
  // Skip on touch-only devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  const text = heading.textContent || '';
  if (!text.trim()) return;

  // Store original styles
  const originalColor = getComputedStyle(heading).color;

  // Split text into per-character spans
  heading.innerHTML = '';
  const chars: CharState[] = [];

  for (const char of text) {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.display = 'inline-block';
    span.style.transition = 'transform 0.15s ease, color 0.15s ease';
    // Preserve whitespace width
    if (char === ' ') {
      span.style.width = '0.3em';
    }
    heading.appendChild(span);
    chars.push({ span, originalX: 0, originalY: 0 });
  }

  // Cache positions after layout
  let positionsCached = false;
  const cachePositions = () => {
    const headingRect = heading.getBoundingClientRect();
    for (const c of chars) {
      const rect = c.span.getBoundingClientRect();
      c.originalX = rect.left + rect.width / 2 - headingRect.left;
      c.originalY = rect.top + rect.height / 2 - headingRect.top;
    }
    positionsCached = true;
  };

  let rafId = 0;
  let mouseX = 0;
  let mouseY = 0;
  let isOver = false;

  const update = () => {
    if (!positionsCached) cachePositions();

    for (const c of chars) {
      if (!isOver) {
        c.span.style.transform = '';
        c.span.style.color = '';
        continue;
      }

      const dx = mouseX - c.originalX;
      const dy = mouseY - c.originalY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > RADIUS || dist === 0) {
        c.span.style.transform = '';
        c.span.style.color = '';
        continue;
      }

      // Intensity: 1 at center, 0 at edge (quadratic falloff for smoother feel)
      const t = 1 - (dist / RADIUS);
      const intensity = t * t;

      // Move toward cursor
      const moveX = (dx / dist) * MAX_DISPLACEMENT * intensity;
      const moveY = (dy / dist) * MAX_DISPLACEMENT * intensity;

      c.span.style.transform = `translate(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px)`;

      // Color interpolation toward accent
      if (intensity > 0.3) {
        c.span.style.color = ACCENT_COLOR;
      } else {
        c.span.style.color = '';
      }
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = heading.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isOver = true;

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  };

  const onMouseLeave = () => {
    isOver = false;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  };

  // Recache on resize
  const onResize = () => {
    positionsCached = false;
  };

  heading.addEventListener('mousemove', onMouseMove);
  heading.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('resize', onResize);
}

// Auto-init all [data-magnetic] headings
function initAll() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(initMagneticTitle);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

// Re-init on Astro page transitions
document.addEventListener('astro:page-load', initAll);

export { initMagneticTitle };
