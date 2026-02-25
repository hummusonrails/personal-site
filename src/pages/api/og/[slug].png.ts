import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadFont(name: string): Buffer {
  // Try multiple resolution paths for dev vs build
  const paths = [
    join(process.cwd(), 'public', 'fonts', name),
    join(process.cwd(), 'dist', 'client', 'fonts', name),
  ];
  for (const p of paths) {
    try {
      return readFileSync(p);
    } catch { /* try next */ }
  }
  throw new Error(`Font not found: ${name}`);
}

export const prerender = true;

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      params: { slug: post.slug },
      props: {
        title: post.data.title,
        date: post.data.date,
        tags: post.data.tags,
      },
    }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, date, tags } = props as {
    title: string;
    date: Date | string;
    tags?: Array<{ slug: string } | string>;
  };

  const fontRegular = loadFont('SpaceGrotesk-Regular.ttf');
  const fontBold = loadFont('SpaceGrotesk-Bold.ttf');

  const dateStr = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tagList = (tags || [])
    .map((t) => (typeof t === 'object' ? t.slug : t))
    .filter((t) => t !== 'posts')
    .slice(0, 3);

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
          padding: '60px',
          fontFamily: 'Space Grotesk',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // === GRADIENT MESH BACKGROUND ===
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
          // Warm amber glow — top left
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
          // Thin ring — top right
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
          // Small dot accent
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
          // Ring — bottom right
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
          // Vertical gradient line
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
          // Top bar with site name and date
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
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
                          },
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            color: '#9ca3af',
                            fontSize: '22px',
                            fontWeight: 400,
                            letterSpacing: '0.08em',
                          },
                          children: 'bengreenberg.dev',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: '#6b6b6b',
                      fontSize: '20px',
                      fontWeight: 400,
                    },
                    children: dateStr,
                  },
                },
              ],
            },
          },
          // Title
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flex: 1,
                alignItems: 'center',
              },
              children: [
                {
                  type: 'h1',
                  props: {
                    style: {
                      color: '#f5f5f5',
                      fontSize: title.length > 60 ? '48px' : title.length > 40 ? '56px' : '64px',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      margin: 0,
                      maxWidth: '900px',
                    },
                    children: title,
                  },
                },
              ],
            },
          },
          // Bottom bar with tags and author
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '40px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '24px',
              },
              children: [
                // Tags
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      gap: '10px',
                    },
                    children: tagList.map((tag) => ({
                      type: 'span',
                      props: {
                        style: {
                          color: '#c4b5fd',
                          fontSize: '18px',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          fontWeight: 400,
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                        },
                        children: `#${tag}`,
                      },
                    })),
                  },
                },
                // Author
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
                        type: 'span',
                        props: {
                          style: {
                            color: '#b4b4b4',
                            fontSize: '20px',
                            fontWeight: 400,
                          },
                          children: 'Ben Greenberg',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Space Grotesk', data: fontRegular, weight: 400, style: 'normal' as const },
        { name: 'Space Grotesk', data: fontBold, weight: 700, style: 'normal' as const },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
