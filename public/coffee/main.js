// ============================================================
// CIELO COFFEE — Premium Landing Page
// Three.js 3D Coffee Bean + GSAP ScrollTrigger Animations
// ============================================================

// ---- Init Three.js ----
const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0806);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 0.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// ---- Lights ----
const ambient = new THREE.AmbientLight(0x1a1410, 0.4);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xd4a854, 0.8);
keyLight.position.set(3, 4, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8a6a4a, 0.2);
fillLight.position.set(-3, 1, 3);
scene.add(fillLight);

const topLight = new THREE.DirectionalLight(0xd4a854, 0.1);
topLight.position.set(0, 6, 0);
scene.add(topLight);

const rimLight = new THREE.DirectionalLight(0xe8c470, 0.4);
rimLight.position.set(-2, 3, -4);
scene.add(rimLight);

// ---- Procedural Coffee Bean ----
const beanGroup = new THREE.Group();

// Bean body — organic shape via lathe geometry
function createBeanShape(segments, rings) {
  const points = [];
  // Profile: wider middle, tapered ends, slight asymmetry for realism
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI;
    // Asymmetric profile: bottom slightly flatter (coffee bean has flat inner face)
    const flatSide = Math.sin(angle) < 0 ? 0.7 + 0.3 * Math.abs(Math.sin(angle)) : 1;
    const radius = Math.sin(angle) * (0.9 + 0.1 * Math.sin(angle * 3)) * flatSide;
    const y = (t - 0.5) * 2.2; // S-shape curve
    points.push(new THREE.Vector2(radius * 0.5, y));
  }
  return new THREE.LatheGeometry(points, rings);
}

const beanSegments = 32;
const beanGeo = createBeanShape(48, beanSegments);

// Rich coffee-brown material with subtle sheen
const beanMat = new THREE.MeshPhysicalMaterial({
  color: 0x5c3a1e,
  roughness: 0.35,
  metalness: 0.15,
  clearcoat: 0.3,
  clearcoatRoughness: 0.4,
  envMapIntensity: 0.6,
  emissive: 0x3a2010,
  emissiveIntensity: 0.05,
});
const bean = new THREE.Mesh(beanGeo, beanMat);
bean.rotation.x = 0.3;
bean.rotation.z = 0.2;
bean.scale.set(1.1, 1, 1.1);
beanGroup.add(bean);

// Center crease line (the characteristic coffee bean cleft)
const creasePoints = [];
for (let i = 0; i <= 20; i++) {
  const t = (i / 20 - 0.5) * 2;
  const y = t * 1.1;
  const depth = 0.06 * Math.cos(t * 1.8) * (1 - t * t * 0.15);
  creasePoints.push(new THREE.Vector3(depth, y, 0));
}
const creaseGeo = new THREE.BufferGeometry().setFromPoints(creasePoints);
const creaseMat = new THREE.LineBasicMaterial({ color: 0x2a1508, transparent: true, opacity: 0.4 });
const creaseLine = new THREE.Line(creaseGeo, creaseMat);
beanGroup.add(creaseLine);

// Small highlight/shine on top
const shineMat = new THREE.MeshBasicMaterial({
  color: 0xe8c470,
  transparent: true,
  opacity: 0.08,
  side: THREE.FrontSide,
});
const shineGeo = new THREE.SphereGeometry(0.15, 8, 8);
const shine = new THREE.Mesh(shineGeo, shineMat);
shine.position.set(0.15, 0.4, 0.25);
shine.scale.set(1, 0.3, 0.5);
beanGroup.add(shine);

beanGroup.position.set(0, 0, 0);
scene.add(beanGroup);

// ---- Ground shadow ----
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x0a0806,
  transparent: true,
  opacity: 0.4,
});
const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), shadowMat);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -1.3;
scene.add(shadow);

// ---- Floating particles ----
const PARTICLE_COUNT = 200;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PARTICLE_COUNT * 3);
const pSizes = new Float32Array(PARTICLE_COUNT);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 8;
  pPos[i * 3 + 1] = (Math.random() - 0.5) * 4;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  pSizes[i] = 0.004 + Math.random() * 0.012;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
const pMat = new THREE.PointsMaterial({
  size: 0.008,
  color: 0xd4a854,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ---- Steam / aroma wisps (upward-moving particles) ----
const STEAM_COUNT = 60;
const sGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(STEAM_COUNT * 3);
const sVel = new Float32Array(STEAM_COUNT);
const sLife = new Float32Array(STEAM_COUNT);
const sSizes = new Float32Array(STEAM_COUNT);
for (let i = 0; i < STEAM_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 0.2 + Math.random() * 0.8;
  sPos[i * 3] = Math.cos(angle) * radius;
  sPos[i * 3 + 1] = -0.5 + Math.random() * 0.2;
  sPos[i * 3 + 2] = Math.sin(angle) * radius;
  sVel[i] = 0.2 + Math.random() * 0.4;
  sLife[i] = Math.random();
  sSizes[i] = 0.01 + Math.random() * 0.03;
}
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
sGeo.setAttribute('size', new THREE.BufferAttribute(sSizes, 1));
const sMat = new THREE.PointsMaterial({
  size: 0.025,
  color: 0xd4a854,
  transparent: true,
  opacity: 0.08,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
const steam = new THREE.Points(sGeo, sMat);
steam.position.set(0, 0, 0);
scene.add(steam);

// ---- GSAP ScrollTrigger ----
gsap.registerPlugin(ScrollTrigger);

// Track scroll progress for Three.js scene
let scrollProgress = 0;

ScrollTrigger.create({
  onUpdate: (self) => { scrollProgress = self.progress; },
});

// Hero section animations
gsap.fromTo('.hero-eyebrow',
  { opacity: 0, y: 30 },
  { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '#hero', start: 'top 80%', end: 'top 20%', toggleActions: 'play none none reverse' } }
);
gsap.fromTo('.hero-title .hero-line',
  { opacity: 0, y: 60 },
  { opacity: 1, y: 0, duration: 1.4, stagger: 0.2, ease: 'power4.out', scrollTrigger: { trigger: '#hero', start: 'top 75%', end: 'top 15%', toggleActions: 'play none none reverse' } }
);
gsap.fromTo('.hero-sub',
  { opacity: 0, y: 30 },
  { opacity: 1, y: 0, duration: 1, delay: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '#hero', start: 'top 70%', end: 'top 20%', toggleActions: 'play none none reverse' } }
);
gsap.fromTo('.hero-cta',
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.8, delay: 1, ease: 'power2.out', scrollTrigger: { trigger: '#hero', start: 'top 65%', end: 'top 15%', toggleActions: 'play none none reverse' } }
);

// Reveal sections on scroll
document.querySelectorAll('[data-scroll]').forEach((el) => {
  const isCard = el.classList.contains('craft-card') || el.classList.contains('origin-card');
  gsap.fromTo(el,
    { opacity: 0, y: isCard ? 60 : 40 },
    {
      opacity: 1, y: 0, duration: isCard ? 0.8 : 1,
      stagger: isCard ? 0.08 : 0,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'top 35%',
        toggleActions: 'play none none reverse',
      },
    }
  );
});

// Stats counter animation
gsap.from('.stat-value', {
  scrollTrigger: { trigger: '.stats-row', start: 'top 80%', end: 'top 30%', toggleActions: 'play none none reverse' },
  textContent: 0,
  duration: 2,
  ease: 'power2.out',
  snap: { textContent: 1 },
  stagger: 0.15,
});

// ---- Track custom analytics events ----
function trackScrollMilestone(milestone) {
  if (typeof gtag === 'function') {
    gtag('event', 'scroll_milestone', { milestone, page: 'coffee-landing' });
  }
}
let lastMilestone = 0;
ScrollTrigger.create({
  onUpdate: (self) => {
    const pct = Math.round(self.progress * 100);
    const milestones = [25, 50, 75, 100];
    for (const m of milestones) {
      if (pct >= m && lastMilestone < m) {
        lastMilestone = m;
        trackScrollMilestone(`${m}%`);
      }
    }
  },
});

// Track bean interaction
let beanClicked = false;
function trackBeanInteraction(type) {
  if (typeof gtag === 'function') {
    gtag('event', 'bean_interaction', { type, page: 'coffee-landing' });
  }
}

// ---- Mouse tracking ----
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
document.addEventListener('mousemove', (e) => {
  mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
});

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Animation loop ----
const clock = new THREE.Clock();
const beanRestY = 0;
let beanBobPhase = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // Smooth mouse
  mouse.x += (mouse.targetX - mouse.x) * 0.04;
  mouse.y += (mouse.targetY - mouse.y) * 0.04;

  // Bean rotation — slow auto-rotation + mouse influence
  beanGroup.rotation.y += dt * 0.08;
  const mouseRotX = mouse.y * 0.15;
  const mouseRotZ = mouse.x * -0.1;
  beanGroup.rotation.x = 0.3 + mouseRotX + Math.sin(time * 0.3) * 0.02;
  beanGroup.rotation.z = 0.2 + mouseRotZ;

  // Bean gentle bob
  beanBobPhase += dt * 0.5;
  beanGroup.position.y = Math.sin(beanBobPhase) * 0.04;

  // Camera subtle parallax
  camera.position.x = mouse.x * 0.2;
  camera.position.y = 0.5 + mouse.y * 0.1;
  camera.lookAt(0, 0, 0);

  // Shadow follows bean
  const shadowScale = 1.2 + 0.1 * Math.sin(beanBobPhase);
  shadow.scale.set(shadowScale, shadowScale, 1);

  // Scroll-based bean transform
  const scrollInfluence = scrollProgress * 0.5;
  beanGroup.scale.set(
    1.1 + scrollInfluence * 0.15,
    1 + scrollInfluence * 0.1,
    1.1 + scrollInfluence * 0.15
  );

  // Steam animation
  const sPosAttr = steam.geometry.attributes.position;
  const sPosArr = sPosAttr.array;
  for (let i = 0; i < STEAM_COUNT; i++) {
    const i3 = i * 3;
    sPosArr[i3 + 1] += sVel[i] * dt * 0.3;
    sPosArr[i3] += Math.sin(time + i) * dt * 0.1;
    sPosArr[i3 + 2] += Math.cos(time * 0.7 + i * 1.3) * dt * 0.1;
    if (sPosArr[i3 + 1] > 2) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.8;
      sPosArr[i3] = Math.cos(angle) * radius;
      sPosArr[i3 + 1] = -0.5;
      sPosArr[i3 + 2] = Math.sin(angle) * radius;
    }
  }
  sPosAttr.needsUpdate = true;

  // Particle drift
  const pPosAttr = particles.geometry.attributes.position;
  const pPosArr = pPosAttr.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPosArr[i * 3 + 1] += Math.sin(time * 0.5 + i) * dt * 0.005;
    pPosArr[i * 3] += Math.cos(time * 0.3 + i * 0.7) * dt * 0.003;
  }
  pPosAttr.needsUpdate = true;

  // Bean light intensity variation (warm pulse)
  keyLight.intensity = 0.8 + Math.sin(time * 0.5) * 0.15;

  renderer.render(scene, camera);
}

animate();

// ---- Subscribe form tracking ----
document.querySelector('.subscribe-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = e.target.querySelector('input')?.value;
  if (email && typeof gtag === 'function') {
    gtag('event', 'subscribe', { email_provided: true, page: 'coffee-landing' });
  }
  alert('Thank you for subscribing. You will hear from us soon.');
  e.target.reset();
});

// 'Explore Our Roasts' button
document.querySelectorAll('.btn-primary')[0]?.addEventListener('click', () => {
  if (typeof gtag === 'function') {
    gtag('event', 'cta_click', { cta: 'explore_roasts', page: 'coffee-landing' });
  }
});

// 'Watch Film' button
document.querySelector('.btn-secondary')?.addEventListener('click', () => {
  if (typeof gtag === 'function') {
    gtag('event', 'cta_click', { cta: 'watch_film', page: 'coffee-landing' });
  }
});
