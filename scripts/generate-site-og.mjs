import satori from 'satori';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const fontRegular = readFileSync('public/fonts/SpaceGrotesk-Regular.ttf');
const fontBold = readFileSync('public/fonts/SpaceGrotesk-Bold.ttf');

const WIDTH = 1200;
const HEIGHT = 630;

// Step 1: Generate the background + text layer with Satori
const svg = await satori(
  {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0a',
        padding: '50px 60px',
        fontFamily: 'Space Grotesk',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        // === BACKGROUND GRADIENT MESH ===
        // Large indigo/purple blob — top right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '-120px',
              right: '-60px',
              width: '550px',
              height: '550px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)',
            },
          },
        },
        // Teal/cyan blob — bottom left
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '-100px',
              left: '-80px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, rgba(20, 184, 166, 0.04) 50%, transparent 70%)',
            },
          },
        },
        // Rose/pink blob — center right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '180px',
              right: '150px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.03) 50%, transparent 70%)',
            },
          },
        },
        // Warm amber glow — top left subtle
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '20px',
              left: '200px',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
            },
          },
        },
        // === GEOMETRIC ACCENTS ===
        // Thin ring — top right area
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '40px',
              right: '80px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            },
          },
        },
        // Small filled circle accent
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '90px',
              right: '120px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.5)',
            },
          },
        },
        // Another ring — bottom right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '80px',
              right: '60px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '1px solid rgba(20, 184, 166, 0.15)',
            },
          },
        },
        // Diagonal line accent (thin tall div rotated appearance)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '0px',
              right: '350px',
              width: '1px',
              height: '100%',
              background: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.1) 40%, rgba(244, 63, 94, 0.08) 60%, transparent)',
            },
          },
        },
        // Second vertical line
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '0px',
              right: '348px',
              width: '1px',
              height: '100%',
              background: 'linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.05) 30%, rgba(20, 184, 166, 0.06) 70%, transparent)',
            },
          },
        },
        // === BOTTOM GRADIENT ACCENT BAR ===
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '100%',
              height: '4px',
              background: 'linear-gradient(to right, #6366f1, #ec4899, #14b8a6, #6366f1)',
            },
          },
        },
        // === CONTENT ===
        // Top bar
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#6366f1',
                          boxShadow: '0 0 12px rgba(99, 102, 241, 0.6)',
                        },
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          color: '#9ca3af',
                          fontSize: '20px',
                          fontWeight: 400,
                          letterSpacing: '0.08em',
                        },
                        children: 'bengreenberg.dev',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Title section
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              marginBottom: '4px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    color: '#f5f5f5',
                    fontSize: '52px',
                    fontWeight: 700,
                    lineHeight: 1.15,
                  },
                  children: 'Meet Ben.',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    color: '#f5f5f5',
                    fontSize: '52px',
                    fontWeight: 700,
                    lineHeight: 1.15,
                  },
                  children: 'Building developer communities',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    color: '#f5f5f5',
                    fontSize: '52px',
                    fontWeight: 700,
                    lineHeight: 1.15,
                  },
                  children: 'around the world.',
                },
              },
            ],
          },
        },
        // Spacer
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
            },
          },
        },
      ],
    },
  },
  {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Space Grotesk', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Space Grotesk', data: fontBold, weight: 700, style: 'normal' },
    ],
  }
);

// Step 2: Convert SVG to PNG buffer
const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

// Step 3: Prepare photos — center photo (with_group) is larger
const SIDE_PHOTO_SIZE = 200;
const CENTER_PHOTO_SIZE = 250;
const PHOTO_RADIUS = 20;
const PHOTO_Y_SIDE = 395;
const PHOTO_Y_CENTER = 355;
const PHOTO_GAP = 28;

const photoConfigs = [
  { path: 'public/static/images/ben.jpeg', size: SIDE_PHOTO_SIZE },
  { path: 'public/static/images/with_group.jpeg', size: CENTER_PHOTO_SIZE },
  { path: 'public/static/images/ben_and_matz.jpeg', size: SIDE_PHOTO_SIZE },
];

const photoBuffers = await Promise.all(
  photoConfigs.map(async ({ path, size }) => {
    const roundedMask = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="white"/>
      </svg>`
    );
    const img = sharp(readFileSync(path));
    const meta = await img.metadata();
    const cropSize = Math.min(meta.width, meta.height);
    return img
      .extract({
        left: Math.round((meta.width - cropSize) / 2),
        top: Math.round((meta.height - cropSize) / 2),
        width: cropSize,
        height: cropSize,
      })
      .resize(size, size)
      .composite([{ input: roundedMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  })
);

// Step 4: Add a glowing border around each photo
const borderedPhotos = await Promise.all(
  photoConfigs.map(async ({ size }, i) => {
    const borderWidth = 2;
    const glowPad = 6;
    const totalPad = borderWidth + glowPad;
    const outerSize = size + totalPad * 2;

    // Glow layer
    const glowSvg = Buffer.from(
      `<svg width="${outerSize}" height="${outerSize}">
        <rect x="${glowPad / 2}" y="${glowPad / 2}" width="${outerSize - glowPad}" height="${outerSize - glowPad}"
          rx="${PHOTO_RADIUS + 4}" ry="${PHOTO_RADIUS + 4}"
          fill="none" stroke="rgba(99, 102, 241, 0.15)" stroke-width="${glowPad}"/>
        <rect x="${glowPad}" y="${glowPad}" width="${size + borderWidth * 2}" height="${size + borderWidth * 2}"
          rx="${PHOTO_RADIUS + 2}" ry="${PHOTO_RADIUS + 2}"
          fill="#2a2a2a"/>
      </svg>`
    );
    return sharp(glowSvg)
      .composite([{
        input: photoBuffers[i],
        top: totalPad,
        left: totalPad,
      }])
      .png()
      .toBuffer();
  })
);

// Step 5: Composite everything together
const sidePad = 2 + 6; // borderWidth + glowPad
const sideOuter = SIDE_PHOTO_SIZE + sidePad * 2;
const centerOuter = CENTER_PHOTO_SIZE + sidePad * 2;
const totalWidth = sideOuter + PHOTO_GAP + centerOuter + PHOTO_GAP + sideOuter;
const startX = Math.round((WIDTH - totalWidth) / 2);

const composites = [
  { input: borderedPhotos[0], top: PHOTO_Y_SIDE - sidePad, left: startX },
  { input: borderedPhotos[1], top: PHOTO_Y_CENTER - sidePad, left: startX + sideOuter + PHOTO_GAP },
  { input: borderedPhotos[2], top: PHOTO_Y_SIDE - sidePad, left: startX + sideOuter + PHOTO_GAP + centerOuter + PHOTO_GAP },
];

const result = await sharp(bgBuffer)
  .composite(composites)
  .png()
  .toBuffer();

writeFileSync('public/static/images/twitter-card.png', result);
console.log('Generated site OG image:', result.length, 'bytes');
