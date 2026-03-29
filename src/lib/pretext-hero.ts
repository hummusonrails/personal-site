/**
 * Editorial Engine Hero — Pretext-powered canvas layout
 *
 * Renders a magazine-style editorial layout with:
 * - Large serif headline (the randomized greeting)
 * - Two-column body text with a drop cap
 * - A draggable glowing orb that text reflows around at 60fps
 */

import {
  prepareWithSegments,
  layoutNextLine,
  layoutWithLines,
  type PreparedTextWithSegments,
  type LayoutCursor,
} from '@chenglou/pretext';

// ── Configuration ──────────────────────────────────────────

const HEADLINE_FONT = '600 32px Georgia, "Times New Roman", serif';
const BODY_FONT = '300 14px Sohne, -apple-system, sans-serif';
const DROPCAP_FONT = '400 64px Georgia, "Times New Roman", serif';
const HEADLINE_LINE_HEIGHT = 40;
const BODY_LINE_HEIGHT = 22;
const COLUMN_GAP = 28;
const PADDING = 32;
const ORB_RADIUS = 45;
const ORB_INFLUENCE_RADIUS = ORB_RADIUS + 20;

const BODY_TEXT =
  "Developer Relations Lead at Arbitrum, Docker Captain, and former Ruby Central board member. " +
  "Building developer experiences across four continents through conference talks, hands-on workshops, " +
  "and open source contributions. Author of Vector Search with JavaScript, published by The Pragmatic Bookshelf. " +
  "Focused on developer experience, community building, and AI-powered developer tools. " +
  "From blockchain infrastructure to vector search, enabling developers to build what matters.";

// ── State ──────────────────────────────────────────────────

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  hue: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface OrbState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dragging: boolean;
  hovering: boolean;
  particles: Particle[];
  trail: TrailPoint[];
  time: number;
  pulsePhase: number;
}

interface HeroState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  headline: string;
  preparedHeadline: PreparedTextWithSegments | null;
  preparedBody: PreparedTextWithSegments | null;
  preparedDropCap: PreparedTextWithSegments | null;
  orb: OrbState;
  animating: boolean;
  frameId: number;
  theme: 'dark' | 'light';
}

// ── Init ───────────────────────────────────────────────────

export function initPretextHero(
  canvas: HTMLCanvasElement,
  headline: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const state: HeroState = {
    canvas,
    ctx,
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    headline,
    preparedHeadline: null,
    preparedBody: null,
    preparedDropCap: null,
    orb: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      dragging: false,
      hovering: false,
      particles: Array.from({ length: 24 }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: ORB_RADIUS * (0.6 + Math.random() * 0.8),
        speed: (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
        size: 1 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.7,
        hue: 150 + Math.random() * 30, // green-teal range
      })),
      trail: [],
      time: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    },
    animating: false,
    frameId: 0,
    theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  };

  // Prepare text (one-time)
  state.preparedHeadline = prepareWithSegments(headline, HEADLINE_FONT);
  state.preparedBody = prepareWithSegments(BODY_TEXT, BODY_FONT);
  state.preparedDropCap = prepareWithSegments(BODY_TEXT[0], DROPCAP_FONT);

  // Size canvas
  const resize = () => {
    const rect = canvas.parentElement!.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = rect.width;
    state.height = Math.max(rect.height, 340);
    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    canvas.style.width = state.width + 'px';
    canvas.style.height = state.height + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    // Place orb in right column area initially
    if (!state.orb.dragging) {
      state.orb.x = state.width * 0.7;
      state.orb.y = state.height * 0.5;
      state.orb.targetX = state.orb.x;
      state.orb.targetY = state.orb.y;
    }

    render(state);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement!);
  resize();

  // Start ambient animation (orb particles always animate)
  startAnimation(state);

  // Theme observer
  const themeObserver = new MutationObserver(() => {
    state.theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    render(state);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // ── Mouse / Touch Events ──────────────────────────────

  const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const isOverOrb = (x: number, y: number) => {
    const dx = x - state.orb.x;
    const dy = y - state.orb.y;
    return dx * dx + dy * dy <= ORB_RADIUS * ORB_RADIUS;
  };

  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getPos(e);
    if (isOverOrb(x, y)) {
      state.orb.dragging = true;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getPos(e);
    if (state.orb.dragging) {
      state.orb.targetX = x;
      state.orb.targetY = y;
    } else {
      state.orb.hovering = isOverOrb(x, y);
      canvas.style.cursor = state.orb.hovering ? 'grab' : 'default';
    }
  });

  const endDrag = () => {
    if (state.orb.dragging) {
      state.orb.dragging = false;
      canvas.style.cursor = state.orb.hovering ? 'grab' : 'default';
    }
  };

  canvas.addEventListener('mouseup', endDrag);
  canvas.addEventListener('mouseleave', endDrag);

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    const { x, y } = getPos(e.touches[0]);
    if (isOverOrb(x, y)) {
      e.preventDefault();
      state.orb.dragging = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (state.orb.dragging) {
      e.preventDefault();
      const { x, y } = getPos(e.touches[0]);
      state.orb.targetX = x;
      state.orb.targetY = y;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', endDrag);

  return () => {
    ro.disconnect();
    themeObserver.disconnect();
    cancelAnimationFrame(state.frameId);
  };
}

// ── Animation Loop ─────────────────────────────────────────

function startAnimation(state: HeroState) {
  if (state.animating) return;
  state.animating = true;

  const tick = () => {
    state.orb.time += 0.016; // ~60fps timestep
    state.orb.pulsePhase += 0.02;

    // Smooth orb movement
    const ease = state.orb.dragging ? 0.15 : 0.05;
    state.orb.x += (state.orb.targetX - state.orb.x) * ease;
    state.orb.y += (state.orb.targetY - state.orb.y) * ease;

    // Update trail
    if (state.orb.dragging) {
      state.orb.trail.push({ x: state.orb.x, y: state.orb.y, age: 0 });
    }
    for (const pt of state.orb.trail) pt.age += 0.04;
    state.orb.trail = state.orb.trail.filter(pt => pt.age < 1);

    // Update orbiting particles
    for (const p of state.orb.particles) {
      p.angle += p.speed * 0.02;
    }

    render(state);
    state.frameId = requestAnimationFrame(tick);
  };

  state.frameId = requestAnimationFrame(tick);
}

// ── Render ─────────────────────────────────────────────────

function render(state: HeroState) {
  const { ctx, width, height, orb, theme } = state;

  const bgColor = theme === 'light' ? '#ffffff' : '#212121';
  const textColor = theme === 'light' ? '#0d0d0d' : '#ececec';
  const mutedColor = theme === 'light' ? '#6b6b6b' : '#8e8e8e';
  const accentColor = '#10a37f';
  const dividerColor = theme === 'light' ? '#ebebeb' : '#3a3a3a';

  // Clear
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  if (!state.preparedHeadline || !state.preparedBody) return;

  const contentWidth = width - PADDING * 2;
  if (contentWidth < 100) return;

  let y = PADDING;

  // ── Headline ──────────────────────────────────────────

  ctx.font = HEADLINE_FONT;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  const headlineResult = layoutWithLines(state.preparedHeadline, contentWidth, HEADLINE_LINE_HEIGHT);

  for (const line of headlineResult.lines) {
    ctx.fillText(line.text, PADDING, y);
    y += HEADLINE_LINE_HEIGHT;
  }

  y += 16; // space below headline

  // ── Divider line ──────────────────────────────────────
  ctx.strokeStyle = dividerColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(width - PADDING, y);
  ctx.stroke();
  y += 16;

  // ── Two-column body text with orb obstacle ────────────

  const columnWidth = (contentWidth - COLUMN_GAP) / 2;
  const col1X = PADDING;
  const col2X = PADDING + columnWidth + COLUMN_GAP;
  const bodyStartY = y;

  // Render columns
  const bodyHeight = height - y - PADDING;
  renderColumn(state, col1X, bodyStartY, columnWidth, bodyHeight, 0, true);
}

function renderColumn(
  state: HeroState,
  colX: number,
  startY: number,
  columnWidth: number,
  maxHeight: number,
  startFromSegment: number,
  isFirstColumn: boolean,
) {
  const { ctx, orb, width, theme } = state;

  const textColor = theme === 'light' ? '#0d0d0d' : '#ececec';
  const accentColor = '#10a37f';
  const col2X = PADDING + ((width - PADDING * 2 - COLUMN_GAP) / 2) + COLUMN_GAP;
  const columnW = (width - PADDING * 2 - COLUMN_GAP) / 2;

  if (!state.preparedBody) return;

  // We'll manually lay out both columns
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = startY;
  let currentColX = colX;
  let currentColWidth = columnW;
  let inSecondColumn = false;
  let isFirstLine = true;

  ctx.font = BODY_FONT;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  while (true) {
    if (y - startY > maxHeight) {
      if (!inSecondColumn) {
        // Switch to second column
        inSecondColumn = true;
        currentColX = col2X;
        y = startY;
        continue;
      }
      break;
    }

    // Calculate available width for this line considering the orb
    let lineWidth = currentColWidth;
    let lineX = currentColX;

    const lineTop = y;
    const lineBottom = y + BODY_LINE_HEIGHT;
    const lineMidY = (lineTop + lineBottom) / 2;

    // Check if orb intersects this line
    if (orbIntersectsLine(orb, lineTop, lineBottom, currentColX, currentColX + currentColWidth)) {
      const orbLeft = orb.x - ORB_INFLUENCE_RADIUS;
      const orbRight = orb.x + ORB_INFLUENCE_RADIUS;
      const colLeft = currentColX;
      const colRight = currentColX + currentColWidth;

      // How much of the circle is in this line's vertical slice
      const dy = Math.abs(lineMidY - orb.y);
      const sliceHalf = dy < ORB_INFLUENCE_RADIUS
        ? Math.sqrt(ORB_INFLUENCE_RADIUS * ORB_INFLUENCE_RADIUS - dy * dy)
        : 0;

      if (sliceHalf > 0) {
        const circleLeft = orb.x - sliceHalf;
        const circleRight = orb.x + sliceHalf;

        // Determine which side has more space
        const spaceLeft = Math.max(0, circleLeft - colLeft);
        const spaceRight = Math.max(0, colRight - circleRight);

        if (spaceLeft >= spaceRight && spaceLeft > 30) {
          lineWidth = spaceLeft;
          lineX = colLeft;
        } else if (spaceRight > 30) {
          lineWidth = spaceRight;
          lineX = circleRight;
        } else {
          // Not enough space, skip this line
          y += BODY_LINE_HEIGHT;
          continue;
        }
      }
    }

    // Drop cap on first line of first column
    if (isFirstLine && isFirstColumn) {
      isFirstLine = false;
      const dropCapSize = 54;
      const dropCapLines = 3;

      // Draw drop cap
      ctx.save();
      ctx.font = DROPCAP_FONT;
      ctx.fillStyle = accentColor;
      ctx.fillText(BODY_TEXT[0], lineX, y - 4);
      ctx.restore();

      // Measure drop cap width
      ctx.save();
      ctx.font = DROPCAP_FONT;
      const dcMetrics = ctx.measureText(BODY_TEXT[0]);
      const dcWidth = dcMetrics.width + 8;
      ctx.restore();

      // Skip the first character in the prepared text
      cursor = { segmentIndex: 0, graphemeIndex: 1 };

      // Lay out lines next to drop cap
      ctx.font = BODY_FONT;
      ctx.fillStyle = textColor;

      for (let i = 0; i < dropCapLines; i++) {
        let dcLineWidth = lineWidth - dcWidth;
        let dcLineX = lineX + dcWidth;

        // Re-check orb intersection for drop cap lines
        const dcLineTop = y;
        const dcLineMidY = y + BODY_LINE_HEIGHT / 2;

        if (orbIntersectsLine(orb, dcLineTop, dcLineTop + BODY_LINE_HEIGHT, dcLineX, dcLineX + dcLineWidth)) {
          const dy = Math.abs(dcLineMidY - orb.y);
          const sliceHalf = dy < ORB_INFLUENCE_RADIUS
            ? Math.sqrt(ORB_INFLUENCE_RADIUS * ORB_INFLUENCE_RADIUS - dy * dy)
            : 0;
          if (sliceHalf > 0) {
            const circleRight = orb.x + sliceHalf;
            const spaceRight = dcLineX + dcLineWidth - circleRight;
            if (spaceRight > 30) {
              dcLineWidth = spaceRight;
              dcLineX = circleRight;
            }
          }
        }

        if (dcLineWidth < 30) {
          y += BODY_LINE_HEIGHT;
          continue;
        }

        const line = layoutNextLine(state.preparedBody!, cursor, dcLineWidth);
        if (!line) break;
        ctx.fillText(line.text, dcLineX, y);
        cursor = line.end;
        y += BODY_LINE_HEIGHT;
      }
      continue;
    }

    if (lineWidth < 30) {
      y += BODY_LINE_HEIGHT;
      continue;
    }

    const line = layoutNextLine(state.preparedBody!, cursor, lineWidth);
    if (!line) {
      if (!inSecondColumn) {
        // Text exhausted before second column — done
        break;
      }
      break;
    }

    ctx.fillText(line.text, lineX, y);
    cursor = line.end;
    y += BODY_LINE_HEIGHT;
  }

  // ── Draw orb ──────────────────────────────────────────

  drawOrb(ctx, orb, accentColor);
}

function orbIntersectsLine(
  orb: OrbState,
  lineTop: number,
  lineBottom: number,
  lineLeft: number,
  lineRight: number,
): boolean {
  // Check if the orb's influence circle intersects this line rectangle
  const closestY = Math.max(lineTop, Math.min(orb.y, lineBottom));
  const closestX = Math.max(lineLeft, Math.min(orb.x, lineRight));
  const dx = orb.x - closestX;
  const dy = orb.y - closestY;
  return dx * dx + dy * dy < ORB_INFLUENCE_RADIUS * ORB_INFLUENCE_RADIUS;
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  orb: OrbState,
  accentColor: string,
) {
  const { x, y, time, pulsePhase, particles, trail, dragging } = orb;

  // ── Comet trail (while dragging) ──────────────────────
  if (trail.length > 1) {
    for (let i = 0; i < trail.length - 1; i++) {
      const pt = trail[i];
      const alpha = (1 - pt.age) * 0.4;
      const size = (1 - pt.age) * ORB_RADIUS * 0.6;
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size);
      grad.addColorStop(0, `rgba(46, 232, 165, ${alpha})`);
      grad.addColorStop(1, 'rgba(46, 232, 165, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Pulsing outer aura ────────────────────────────────
  const pulse = Math.sin(pulsePhase) * 0.5 + 0.5;
  const auraRadius = ORB_RADIUS * (2.2 + pulse * 0.4);
  const auraGrad = ctx.createRadialGradient(x, y, ORB_RADIUS * 0.3, x, y, auraRadius);
  auraGrad.addColorStop(0, `rgba(16, 163, 127, ${0.08 + pulse * 0.06})`);
  auraGrad.addColorStop(0.5, `rgba(46, 232, 165, ${0.03 + pulse * 0.02})`);
  auraGrad.addColorStop(1, 'rgba(16, 163, 127, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  // ── Orbiting particles ────────────────────────────────
  for (const p of particles) {
    const px = x + Math.cos(p.angle) * p.radius;
    const py = y + Math.sin(p.angle) * p.radius;
    const flickerOpacity = p.opacity * (0.5 + Math.sin(time * p.speed * 3 + p.angle) * 0.5);
    ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${flickerOpacity})`;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Inner nebula layers ───────────────────────────────
  // Layer 1: deep core
  const coreShift = Math.sin(time * 0.8) * 3;
  const core1 = ctx.createRadialGradient(
    x + coreShift, y - coreShift, 0,
    x, y, ORB_RADIUS,
  );
  core1.addColorStop(0, 'rgba(46, 232, 165, 0.6)');
  core1.addColorStop(0.4, 'rgba(16, 163, 127, 0.4)');
  core1.addColorStop(0.8, 'rgba(10, 92, 68, 0.2)');
  core1.addColorStop(1, 'rgba(10, 92, 68, 0)');
  ctx.fillStyle = core1;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Layer 2: rotating color band
  const bandAngle = time * 0.5;
  const bx = x + Math.cos(bandAngle) * ORB_RADIUS * 0.2;
  const by = y + Math.sin(bandAngle) * ORB_RADIUS * 0.2;
  const core2 = ctx.createRadialGradient(
    bx, by, 0,
    x, y, ORB_RADIUS * 0.9,
  );
  core2.addColorStop(0, 'rgba(100, 255, 218, 0.3)');
  core2.addColorStop(0.5, 'rgba(16, 163, 127, 0.15)');
  core2.addColorStop(1, 'rgba(16, 163, 127, 0)');
  ctx.fillStyle = core2;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Layer 3: hot center
  const hotPulse = Math.sin(pulsePhase * 1.5) * 0.3 + 0.7;
  const hot = ctx.createRadialGradient(
    x - ORB_RADIUS * 0.15, y - ORB_RADIUS * 0.15, 0,
    x, y, ORB_RADIUS * 0.5,
  );
  hot.addColorStop(0, `rgba(255, 255, 255, ${0.35 * hotPulse})`);
  hot.addColorStop(0.3, `rgba(180, 255, 230, ${0.2 * hotPulse})`);
  hot.addColorStop(1, 'rgba(46, 232, 165, 0)');
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // ── Glass rim highlight ───────────────────────────────
  ctx.save();
  ctx.strokeStyle = `rgba(46, 232, 165, ${0.15 + pulse * 0.1})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ── Specular highlight ────────────────────────────────
  const hlGrad = ctx.createRadialGradient(
    x - ORB_RADIUS * 0.3, y - ORB_RADIUS * 0.3, 0,
    x - ORB_RADIUS * 0.3, y - ORB_RADIUS * 0.3, ORB_RADIUS * 0.4,
  );
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}
