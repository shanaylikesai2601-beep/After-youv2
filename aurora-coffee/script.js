/* ============================================================
   Aurora Coffee — Interactions & Animations
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ---- Particle Canvas (Hero background) ---- */
  (function initParticles() {
    const container = document.getElementById("particles");
    if (!container) return;
    for (let i = 0; i < 24; i++) {
      const p = document.createElement("div");
      p.className = "hero-particle";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 8}s`;
      p.style.animationDuration = `${6 + Math.random() * 6}s`;
      p.style.width = `${2 + Math.random() * 4}px`;
      p.style.height = p.style.width;
      container.appendChild(p);
    }
  })();

  /* ---- Navbar scroll effect + Back to top ---- */
  const navbar = document.getElementById("navbar");
  const backTop = document.getElementById("backToTop");

  window.addEventListener("scroll", () => {
    const y = window.scrollY;

    if (y > 60) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }

    if (backTop) {
      if (y > 600) {
        backTop.classList.add("visible");
      } else {
        backTop.classList.remove("visible");
      }
    }

    /* Parallax hero bg */
    const heroBg = document.querySelector(".hero-bg");
    if (heroBg && y < window.innerHeight) {
      heroBg.style.transform = `translateY(${y * 0.18}px)`;
    }
  }, { passive: true });

  if (backTop) {
    backTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---- Mobile nav toggle ---- */
  const toggle = document.getElementById("navToggle");
  const navLinks = document.querySelector(".nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.classList.remove("open");
        navLinks.classList.remove("open");
      });
    });
  }

  /* ---- Intersection Observer: reveal animations ---- */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  /* ---- Testimonial Carousel ---- */
  const dots = document.querySelectorAll(".testimonial-dot");
  const cards = document.querySelectorAll(".testimonial-card");
  let current = 0;
  let autoInterval;
  let transitioning = false;

  function showTestimonial(index) {
    if (transitioning || index === current) return;
    transitioning = true;

    const prev = cards[current];
    const next = cards[index];

    prev.classList.remove("active");
    prev.classList.add("exit");
    dots.forEach((d) => d.classList.remove("active"));

    setTimeout(() => {
      prev.classList.remove("exit");
      next.classList.add("active");
      dots[index].classList.add("active");
      current = index;
      transitioning = false;
    }, 400);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showTestimonial(parseInt(dot.dataset.index, 10));
      resetAuto();
    });
  });

  function resetAuto() {
    clearInterval(autoInterval);
    autoInterval = setInterval(() => {
      const next = (current + 1) % cards.length;
      showTestimonial(next);
    }, 5000);
  }

  if (cards.length > 0) {
    cards[0].classList.add("active");
    current = 0;
    dots[0].classList.add("active");
    autoInterval = setInterval(() => {
      const next = (current + 1) % cards.length;
      showTestimonial(next);
    }, 5000);
  }

  /* ---- Contact form ---- */
  const form = document.getElementById("contactForm");
  if (form) {
    const emailInput = document.getElementById("email");

    emailInput.addEventListener("input", () => {
      const v = emailInput.value.trim();
      if (v.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        emailInput.classList.remove("error");
        emailInput.classList.add("valid");
      } else if (v.length > 0) {
        emailInput.classList.remove("valid");
        emailInput.classList.add("error");
      } else {
        emailInput.classList.remove("valid", "error");
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("email");
      if (!input.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) === false) return;

      const btn = form.querySelector(".btn");
      const original = btn.textContent;
      btn.textContent = "Subscribed ✓";
      btn.style.pointerEvents = "none";
      input.value = "";
      input.classList.remove("valid", "error");

      setTimeout(() => {
        btn.textContent = original;
        btn.style.pointerEvents = "";
      }, 2500);
    });
  }

  /* ---- Button Ripple ---- */
  document.querySelectorAll(".btn-primary, .btn-outline").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(245,240,235,0.15);width:${Math.max(rect.width, rect.height)}px;height:${Math.max(rect.width, rect.height)}px;left:${e.clientX - rect.left - Math.max(rect.width, rect.height) / 2}px;top:${e.clientY - rect.top - Math.max(rect.width, rect.height) / 2}px;transform:scale(0);animation:rippleAnim 0.6s ease-out forwards;pointer-events:none`;
      this.style.position = "relative";
      this.style.overflow = "hidden";
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  });

  /* ---- Smooth scroll nav link enhancement ---- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
});
