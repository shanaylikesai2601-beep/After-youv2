# Hero Section Accessibility Requirements

This document specifies the ARIA attributes and CSS media query rules needed to enhance the accessibility of the hero section, particularly for screen reader users and those who prefer reduced motion.

## ARIA Attributes

Apply the following ARIA attributes to the hero section elements to improve accessibility:

1. **role="banner"** on the outermost container of the hero section (typically a `<header>` or `<div>`).  
   - Indicates that the region contains site‑focused content rather than page‑specific content.

2. **aria-label** or **aria-labelledby** on the hero container if it lacks a visible heading.  
   - Provides an accessible name for the region. Use `aria-labelledby` pointing to the main heading's ID when available; otherwise use a concise `aria-label` (e.g., "Home page hero banner").

3. **aria-live="polite"** on any dynamic content area inside the hero (e.g., a carousel of slides, rotating offers, or live updates).  
   - Notifies assistive technologies of changes without being overly disruptive.

4. **aria-atomic="true"** (paired with `aria-live`) on the same dynamic region.  
   - Ensures that the entire region is announced as a single unit when it updates, preventing fragmented announcements.

5. **aria-hidden="true"** on decorative hero images or icons that do not convey meaningful information.  
   - Hides purely decorative elements from screen readers to reduce noise.

6. **tabindex="0"** (or `-1` as appropriate) on interactive hero elements such as call‑to‑action buttons, slide navigation controls, or skip links.  
   - Ensures keyboard focusability and logical tab order.

7. **aria-controls** and **aria-expanded** on hero carousel navigation buttons (previous/next).  
   - `aria-controls` points to the ID of the carousel region; `aria-expanded` indicates whether the associated panel is expanded (if applicable).

8. **aria-roledescription** (optional) on complex hero widgets to provide a more descriptive role (e.g., "carousel", "slideshow").  
   - Use sparingly and only when the standard role does not adequately describe the widget.

## CSS Media Query for Prefers‑Reduced‑Motion

Respect the user's motion preference by disabling or reducing non‑essential animations and transitions in the hero section.

```css
/* Disable animations and transitions for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  /* Hero container: stop any background animations */
  .hero {
    animation: none !important;
    transition: none !important;
  }

  /* Carousel/slide transitions */
  .hero .slide,
  .hero .carousel-inner {
    transition: none !important;
  }

  /* Fade or slide effects */
  .hero .fade-in,
  .hero .slide-in {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  /* Button hover/focus animations */
  .hero .cta-button {
    transition: none !important;
  }

  /* Any decorative moving elements (e.g., floating shapes) */
  .hero .decorative-element {
    animation: none !important;
  }
}
```

### Implementation Notes

- Place the ARIA attributes directly in the HTML markup of the hero section.
- Ensure that any JavaScript controlling the hero (e.g., carousel timers) respects the `prefers-reduced-motion` media query via `window.matchMedia('(prefers-reduced-motion: reduce)')` and disables or scales back motion accordingly.
- Test with screen readers (NVDA, JAWS, VoiceOver) and keyboard navigation to verify that labels, live regions, and controls are announced correctly.
- Validate reduced‑motion behavior using browser dev tools or system settings to confirm that animations are paused or removed.
