# Cielo Coffee — Premium Landing Page

An immersive, premium landing page for a fictional luxury coffee brand.

## Features

- **Interactive 3D Coffee Bean Model** — Procedurally generated with Three.js, featuring realistic materials, subtle animations, and mouse-responsive parallax.
- **Scroll-Triggered Animations** — GSAP ScrollTrigger powers section reveals, staggered card entries, and counter animations.
- **Premium Typography** — Playfair Display (serif headings), Inter (sans-serif body), and JetBrains Mono (mono accents) via Google Fonts.
- **Analytics & Tracking** — Google Analytics snippet with custom event tracking (scroll milestones, CTA clicks, form submissions, bean interactions).
- **3D Steam/Aroma Particles** — Custom particle system simulating rising steam wisps above the bean.
- **Performance Optimizations** — Canvas-limited pixel ratio, quality-tier detection, `prefers-reduced-motion` support.

## File Structure

```
public/coffee/
├── index.html    # Main HTML structure with all sections
├── styles.css    # All styling (dark theme, responsive, animations)
├── main.js       # Three.js scene + GSAP ScrollTrigger + analytics
└── README.md     # This file
```

## Setup

No build step required. Serve from any static server:

```bash
# Using Python
python3 -m http.server 8000
# Visit http://localhost:8000/coffee/

# Using Node.js
npx serve .
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Three.js 0.160 | 3D rendering, post-processing |
| GSAP 3.12 | Scroll-triggered animations |
| Google Analytics 4 | Usage tracking |
| Google Fonts | Playfair Display, Inter, JetBrains Mono |

## Configuration

Replace `G-XXXXXXXXXX` in `index.html` with your actual Google Analytics measurement ID.

To customize the 3D bean, modify the procedural geometry parameters in `main.js`:
- `beanSegments` (line ~35) — LOD control
- `beanMat` color/roughness — material appearance
- Key light intensity — mood and warmth

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+
