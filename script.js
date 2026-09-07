// ============================================================
//  3D Anime Portfolio – script.js
//  Three.js r158 · ES6 modules · Bloom · MeshToonMaterial
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── Globals ─────────────────────────────────────────────────
let scene, camera, renderer, composer, clock;
let character, charParts = {};
let scrollZ = 0, targetScrollZ = 0;
let camRotX = 0, camRotY = 0;
let isDragging = false, lastMouseX = 0, lastMouseY = 0;
let config = null;
let currentZone = -1;
let charWalkTime = 0;
let introVisible = true;

const ZONES = [
  { id: 'intro',     zStart: 0,    zEnd: -25,  label: 'Intro'     },
  { id: 'about',     zStart: -25,  zEnd: -65,  label: 'About'     },
  { id: 'projects',  zStart: -65,  zEnd: -125, label: 'Projects'  },
  { id: 'skills',    zStart: -125, zEnd: -175, label: 'Skills'    },
  { id: 'education', zStart: -175, zEnd: -215, label: 'Education' },
  { id: 'contact',   zStart: -215, zEnd: -250, label: 'Contact'   },
];

// ─── Path curve ──────────────────────────────────────────────
function getPathX(z) {
  return Math.sin(z * 0.05) * 12 + Math.sin(z * 0.02) * 5;
}

// ─── Anime material ──────────────────────────────────────────
function createGradientTex(darkHex, midHex, lightHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 4;
  const ctx = canvas.getContext('2d');
  const toRgb = h => {
    const c = new THREE.Color(h);
    return `rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`;
  };
  ctx.fillStyle = toRgb(darkHex);  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = toRgb(midHex);   ctx.fillRect(0, 1, 1, 1);
  ctx.fillStyle = toRgb(lightHex); ctx.fillRect(0, 2, 1, 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function createAnimeMaterial(color, opts = {}) {
  const dark  = opts.dark  || new THREE.Color(color).multiplyScalar(0.35).getHexString();
  const mid   = opts.mid   || new THREE.Color(color).multiplyScalar(0.7).getHexString();
  const light = opts.light || '#' + new THREE.Color(color).getHexString();
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: createGradientTex(`#${dark}`, `#${mid}`, light),
    ...opts.extra
  });
}

function addOutline(mesh, thickness = 0.03, color = 0x000000) {
  const geo = mesh.geometry.clone();
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(geo, mat);
  outline.scale.setScalar(1 + thickness);
  mesh.add(outline);
  return outline;
}

// ─── Character ───────────────────────────────────────────────
function buildCharacter() {
  const root = new THREE.Group();

  const addPart = (geo, mat, px, py, pz, name) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    addOutline(mesh, 0.02);
    root.add(mesh);
    charParts[name] = mesh;
    return mesh;
  };

  // Body (coral suit)
  addPart(new THREE.BoxGeometry(0.6, 0.8, 0.35), createAnimeMaterial('#ff7675'), 0, 0.9, 0, 'body');
  // Head (skin)
  addPart(new THREE.BoxGeometry(0.55, 0.55, 0.55), createAnimeMaterial('#ffdcb6'), 0, 1.6, 0, 'head');
  // Hair
  addPart(new THREE.BoxGeometry(0.6, 0.2, 0.6), createAnimeMaterial('#2d3436'), 0, 1.95, 0, 'hair');
  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
  const eyeMat = createAnimeMaterial('#0984e3');
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.14, 1.62, 0.28); root.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.14, 1.62, 0.28); root.add(eyeR);
  // Pants
  addPart(new THREE.BoxGeometry(0.55, 0.5, 0.32), createAnimeMaterial('#2d3436'), 0, 0.3, 0, 'pants');
  // Legs
  addPart(new THREE.BoxGeometry(0.22, 0.6, 0.22), createAnimeMaterial('#2d3436'), -0.16, -0.3, 0, 'legL');
  addPart(new THREE.BoxGeometry(0.22, 0.6, 0.22), createAnimeMaterial('#2d3436'), 0.16, -0.3, 0, 'legR');
  // Arms
  addPart(new THREE.BoxGeometry(0.18, 0.65, 0.18), createAnimeMaterial('#ff7675'), -0.42, 0.85, 0, 'armL');
  addPart(new THREE.BoxGeometry(0.18, 0.65, 0.18), createAnimeMaterial('#ff7675'), 0.42, 0.85, 0, 'armR');
  // Shoes
  addPart(new THREE.BoxGeometry(0.25, 0.15, 0.35), createAnimeMaterial('#0984e3'), -0.16, -0.62, 0.05, 'shoeL');
  addPart(new THREE.BoxGeometry(0.25, 0.15, 0.35), createAnimeMaterial('#0984e3'), 0.16, -0.62, 0.05, 'shoeR');
  // Backpack
  addPart(new THREE.BoxGeometry(0.32, 0.45, 0.18), createAnimeMaterial('#fdcb6e'), 0, 1.0, -0.26, 'backpack');

  root.scale.setScalar(1.5);
  return root;
}

function animateCharacter(t) {
  const freq = 3, amp = 0.18;
  if (charParts.legL) charParts.legL.rotation.x = Math.sin(t * freq) * amp;
  if (charParts.legR) charParts.legR.rotation.x = Math.sin(t * freq + Math.PI) * amp;
  if (charParts.armL) charParts.armL.rotation.x = Math.sin(t * freq + Math.PI) * amp * 0.6;
  if (charParts.armR) charParts.armR.rotation.x = Math.sin(t * freq) * amp * 0.6;
  if (charParts.head) charParts.head.rotation.y = Math.sin(t * 1.2) * 0.08;
  if (charParts.body) charParts.body.position.y = 0.9 + Math.sin(t * freq * 2) * 0.015;
}

// ─── Ground ──────────────────────────────────────────────────
function buildGround() {
  const segs = 150;
  const geo = new THREE.PlaneGeometry(60, 300, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const px = getPathX(z);
    pos.setX(i, pos.getX(i) + px * 0.3);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const mat = createAnimeMaterial('#1a1a3e', {
    dark: '0d0d1f', mid: '1a1a3e', light: '#2d2d5e',
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = -150;
  scene.add(mesh);
}

// ─── Zone Builders ───────────────────────────────────────────

// Zone 1 – Intro (0 → -25)
function buildZoneIntro() {
  const g = new THREE.Group();

  // Platform
  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.5, 0.4, 32),
    createAnimeMaterial('#6c5ce7')
  );
  plat.position.set(getPathX(-12), 0, -12);
  addOutline(plat, 0.02);
  g.add(plat);

  // Cyan ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4, 0.15, 16, 80),
    createAnimeMaterial('#00d2ff', { extra: { emissive: new THREE.Color('#00d2ff'), emissiveIntensity: 0.4 } })
  );
  ring.position.set(getPathX(-12), 2, -12);
  ring.name = 'introRing';
  g.add(ring);

  scene.add(g);
}

// Zone 2 – About (-25 → -65)
function buildZoneAbout() {
  const g = new THREE.Group();

  // 12 trees
  for (let i = 0; i < 12; i++) {
    const z = -28 - i * 3.2;
    const side = i % 2 === 0 ? -1 : 1;
    const px = getPathX(z) + side * (8 + Math.random() * 4);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8), createAnimeMaterial('#8d5524'));
    trunk.position.set(px, 0.75, z);
    addOutline(trunk, 0.03);
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.8, 8), createAnimeMaterial('#00b894'));
    crown.position.set(px, 2.8, z);
    addOutline(crown, 0.03);
    g.add(crown);
    const crown2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 8), createAnimeMaterial('#55efc4'));
    crown2.position.set(px, 4.2, z);
    addOutline(crown2, 0.02);
    g.add(crown2);
  }

  // 25 green orbs
  for (let i = 0; i < 25; i++) {
    const z = -30 - (i / 24) * 32;
    const angle = (i / 25) * Math.PI * 2;
    const r = 6 + Math.random() * 6;
    const px = getPathX(z) + Math.cos(angle) * r;
    const pz = z + Math.sin(angle) * 2;
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.25 + Math.random() * 0.2, 12, 12),
      createAnimeMaterial('#00b894', { extra: { emissive: new THREE.Color('#00b894'), emissiveIntensity: 0.3 } })
    );
    orb.position.set(px, 1.5 + Math.random() * 3, pz);
    orb.name = 'floatOrb_' + i;
    orb.userData.baseY = orb.position.y;
    orb.userData.phase = Math.random() * Math.PI * 2;
    g.add(orb);
  }

  scene.add(g);
}

// Zone 3 – Projects (-65 → -125)
function buildZoneProjects() {
  const g = new THREE.Group();

  // Cyan holographic floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 60, 20, 30),
    new THREE.MeshToonMaterial({ color: 0x003344, wireframe: true, transparent: true, opacity: 0.5 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(getPathX(-95), 0.05, -95);
  g.add(floor);

  // 6 tech pillars
  const pillarColors = ['#6c5ce7','#00d2ff','#e040fb','#fdcb6e','#ff7675','#00b894'];
  for (let i = 0; i < 6; i++) {
    const z = -70 - i * 9;
    const side = i % 2 === 0 ? -1 : 1;
    const px = getPathX(z) + side * 7;
    const h = 4 + Math.random() * 4;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, h, 8),
      createAnimeMaterial(pillarColors[i], { extra: { emissive: new THREE.Color(pillarColors[i]), emissiveIntensity: 0.25 } })
    );
    pillar.position.set(px, h / 2, z);
    addOutline(pillar, 0.04);
    g.add(pillar);

    // cap
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 12, 12),
      createAnimeMaterial(pillarColors[i], { extra: { emissive: new THREE.Color(pillarColors[i]), emissiveIntensity: 0.6 } })
    );
    cap.position.set(px, h + 0.6, z);
    cap.name = 'pillarCap_' + i;
    cap.userData.baseY = cap.position.y;
    cap.userData.phase = (i / 6) * Math.PI * 2;
    g.add(cap);
  }

  scene.add(g);
}

// Zone 4 – Skills (-125 → -175)
function buildZoneSkills() {
  const g = new THREE.Group();
  const cx = getPathX(-150), cz = -150;

  // Magenta wireframe core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.5, 1),
    new THREE.MeshToonMaterial({ color: 0xe040fb, wireframe: true })
  );
  core.position.set(cx, 3, cz);
  core.name = 'skillCore';
  core.userData.center = new THREE.Vector3(cx, 3, cz);
  g.add(core);

  const innerCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 0),
    createAnimeMaterial('#e040fb', { extra: { emissive: new THREE.Color('#e040fb'), emissiveIntensity: 0.3 } })
  );
  innerCore.position.set(cx, 3, cz);
  g.add(innerCore);

  // 10 orbiting orbs
  const orbColors = ['#00d2ff','#fdcb6e','#ff7675','#6c5ce7','#00b894','#e040fb','#a29bfe','#55efc4','#fd79a8','#ffeaa7'];
  for (let i = 0; i < 10; i++) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      createAnimeMaterial(orbColors[i], { extra: { emissive: new THREE.Color(orbColors[i]), emissiveIntensity: 0.5 } })
    );
    orb.userData.orbitRadius = 4.5 + (i % 3) * 1.2;
    orb.userData.orbitSpeed = 0.4 + (i % 5) * 0.15;
    orb.userData.orbitPhase = (i / 10) * Math.PI * 2;
    orb.userData.orbitY = 3 + Math.sin((i / 10) * Math.PI) * 2;
    orb.userData.orbitCenter = new THREE.Vector3(cx, 0, cz);
    orb.name = 'skillOrb_' + i;
    g.add(orb);
  }

  scene.add(g);
}

// Zone 5 – Education (-175 → -215)
function buildZoneEducation() {
  const g = new THREE.Group();
  const cx = getPathX(-195), cz = -195;

  // Gold monument base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.6, 5),
    createAnimeMaterial('#fdcb6e')
  );
  base.position.set(cx, 0.3, cz);
  addOutline(base, 0.03);
  g.add(base);

  const obelisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.8, 6, 4),
    createAnimeMaterial('#fdcb6e', { extra: { emissive: new THREE.Color('#fdcb6e'), emissiveIntensity: 0.2 } })
  );
  obelisk.position.set(cx, 3.6, cz);
  addOutline(obelisk, 0.03);
  g.add(obelisk);

  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5),
    createAnimeMaterial('#ffeaa7', { extra: { emissive: new THREE.Color('#ffeaa7'), emissiveIntensity: 0.7 } })
  );
  star.position.set(cx, 7, cz);
  star.name = 'eduStar';
  g.add(star);

  // 4 columns
  const colOffsets = [[-2,-2],[2,-2],[-2,2],[2,2]];
  colOffsets.forEach(([ox, oz]) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 4, 12),
      createAnimeMaterial('#d4ac0d')
    );
    col.position.set(cx + ox, 2, cz + oz);
    addOutline(col, 0.03);
    g.add(col);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.3, 0.8),
      createAnimeMaterial('#fdcb6e')
    );
    cap.position.set(cx + ox, 4.15, cz + oz);
    g.add(cap);
  });

  scene.add(g);
}

// Zone 6 – Contact (-215 → -250)
function buildZoneContact() {
  const g = new THREE.Group();
  const cx = getPathX(-232), cz = -232;

  // Blue portal ring
  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(4, 0.4, 16, 60),
    createAnimeMaterial('#0984e3', { extra: { emissive: new THREE.Color('#0984e3'), emissiveIntensity: 0.5 } })
  );
  portal.position.set(cx, 4, cz);
  portal.name = 'portal';
  g.add(portal);

  // Inner portal glow
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x0052cc, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  inner.position.set(cx, 4, cz - 0.1);
  // portal at new contact position
  g.add(inner);

  // Portal particles
  const pGeo = new THREE.BufferGeometry();
  const pCount = 200;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 3.5 + (Math.random() - 0.5) * 1.5;
    pPos[i * 3]     = cx + Math.cos(angle) * r;
    pPos[i * 3 + 1] = 4 + Math.sin(angle) * r;
    pPos[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.5;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x74b9ff, size: 0.08, transparent: true, opacity: 0.8 });
  g.add(new THREE.Points(pGeo, pMat));

  scene.add(g);
}

// ─── Particle Systems ────────────────────────────────────────
function buildParticles() {
  // 2000 stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(2000 * 3);
  for (let i = 0; i < 2000; i++) {
    starPos[i * 3]     = (Math.random() - 0.5) * 200;
    starPos[i * 3 + 1] = Math.random() * 80 + 5;
    starPos[i * 3 + 2] = -(Math.random() * 320);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7 });
  scene.add(new THREE.Points(starGeo, starMat));

  // 1000 dust particles
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(1000 * 3);
  for (let i = 0; i < 1000; i++) {
    dustPos[i * 3]     = (Math.random() - 0.5) * 40;
    dustPos[i * 3 + 1] = Math.random() * 10;
    dustPos[i * 3 + 2] = -(Math.random() * 300);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xc8d6e5, size: 0.06, transparent: true, opacity: 0.4 });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.name = 'dust';
  scene.add(dustPoints);

  // 600 cyan streamers
  const streamGeo = new THREE.BufferGeometry();
  const streamPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    streamPos[i * 3]     = (Math.random() - 0.5) * 50;
    streamPos[i * 3 + 1] = Math.random() * 30;
    streamPos[i * 3 + 2] = -(Math.random() * 300);
  }
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
  const streamMat = new THREE.PointsMaterial({ color: 0x00d2ff, size: 0.09, transparent: true, opacity: 0.6 });
  const streamPoints = new THREE.Points(streamGeo, streamMat);
  streamPoints.name = 'streamers';
  scene.add(streamPoints);
}

// ─── Panels ──────────────────────────────────────────────────
function buildPanels(cfg) {
  // Intro
  document.getElementById('panel-intro').innerHTML = `
    <div class="panel-tag">Welcome</div>
    <div class="panel-title">${cfg.personal.name}</div>
    <div class="panel-body">${cfg.personal.title}</div>
  `;

  // About
  document.getElementById('panel-about').innerHTML = `
    <div class="panel-tag">About Me</div>
    <div class="panel-title">Who I Am</div>
    <div class="panel-body">${cfg.personal.bio.map(p => `<p style="margin-bottom:.6rem">${p}</p>`).join('')}</div>
    <div class="stat-grid">
      ${cfg.personal.stats.map(s => `<div class="stat-item"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`).join('')}
    </div>
  `;

  // Projects
  document.getElementById('panel-projects').innerHTML = `
    <div class="panel-tag">Projects</div>
    <div class="panel-title">What I've Built</div>
    <div class="proj-grid">
      ${cfg.projects.map(p => `
        <div class="proj-card" style="background:${p.gradient}">
          <div class="proj-emoji">${p.emoji}</div>
          <div class="proj-name">${p.name}</div>
          <div class="proj-tags">${p.tags.map(t => `<span class="proj-tag">${t}</span>`).join('')}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Skills
  document.getElementById('panel-skills').innerHTML = `
    <div class="panel-tag">Skills</div>
    <div class="panel-title">My Toolkit</div>
    ${cfg.skills.map(cat => `
      <div class="skill-cat">
        <div class="skill-cat-name">${cat.category}</div>
        ${cat.items.map(item => `
          <div class="skill-item">
            <div class="skill-name"><span>${item.name}</span><span class="skill-lvl">${item.level}%</span></div>
            <div class="skill-bar"><div class="skill-fill" style="width:${item.level}%"></div></div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;

  // Education
  document.getElementById('panel-education').innerHTML = `
    <div class="panel-tag">Education</div>
    <div class="panel-title">My Learning</div>
    ${cfg.education.map(e => `
      <div class="edu-card">
        <div class="edu-icon">${e.icon}</div>
        <div class="edu-degree">${e.degree}</div>
        <div class="edu-inst">${e.institution}</div>
        <div class="edu-period">${e.period}</div>
        <div class="edu-desc">${e.description}</div>
      </div>
    `).join('')}
  `;

  // Contact
  document.getElementById('panel-contact').innerHTML = `
    <div class="panel-tag">Contact</div>
    <div class="panel-title">${cfg.contact.greeting}</div>
    <div class="panel-body" style="margin-bottom:1rem">${cfg.contact.message}</div>
    ${cfg.contact.links.map(l => `
      <a class="contact-link" href="${l.url}" target="_blank" rel="noopener">
        <span class="contact-icon">${l.icon}</span>
        <span class="contact-text">${l.text}</span>
      </a>
    `).join('')}
  `;
}

function buildProgressDots() {
  const container = document.getElementById('progress-dots');
  ZONES.forEach((z, i) => {
    const dot = document.createElement('div');
    dot.className = 'prog-dot';
    dot.id = `dot-${i}`;
    container.appendChild(dot);
  });
}

function updateZone(z) {
  const idx = ZONES.findIndex(zone => z >= zone.zEnd && z <= zone.zStart);
  if (idx === currentZone) return;
  currentZone = idx;

  // Update dots
  ZONES.forEach((_, i) => {
    document.getElementById(`dot-${i}`)?.classList.toggle('active', i === idx);
  });

  // Update label
  if (idx >= 0) {
    document.getElementById('zone-label').textContent = ZONES[idx].label;
  }

  // Show/hide panels
  ZONES.forEach((zone, i) => {
    const panel = document.getElementById(`panel-${zone.id}`);
    if (!panel) return;
    if (i === idx) {
      panel.style.display = 'block';
      requestAnimationFrame(() => panel.classList.add('visible'));
    } else {
      panel.classList.remove('visible');
      panel.addEventListener('transitionend', () => {
        if (!panel.classList.contains('visible')) panel.style.display = 'none';
      }, { once: true });
    }
  });

  // Progress fill
  const pct = idx >= 0 ? ((idx + 1) / ZONES.length) * 100 : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
}

// ─── Main Init ───────────────────────────────────────────────
async function init() {
  // Load config
  let cfg;
  try {
    const res = await fetch('./config.json');
    cfg = await res.json();
  } catch (e) {
    console.warn('config.json not found, using defaults');
    cfg = { personal: { name: 'Developer', title: 'Portfolio', bio: ['Hello!'], stats: [] },
            experience: [], projects: [], skills: [], education: [], certifications: [],
            contact: { greeting: 'Contact', message: '', links: [] } };
  }
  config = cfg;

  // Fake loading progress
  const bar = document.getElementById('load-bar');
  let progress = 0;
  const loadInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 95);
    bar.style.width = progress + '%';
  }, 120);

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);
  scene.background = new THREE.Color(0x0f0c29);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 6, 15);

  // Renderer
  const canvas = document.getElementById('three-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, 0.5, 0.2
  );
  composer.addPass(bloom);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.2);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x00d2ff, 0.4);
  fillLight.position.set(-10, 5, 0);
  scene.add(fillLight);
  const backLight = new THREE.DirectionalLight(0xff7675, 0.3);
  backLight.position.set(0, 5, 15);
  scene.add(backLight);

  // Build world
  buildGround();
  buildZoneIntro();
  buildZoneAbout();
  buildZoneProjects();
  buildZoneSkills();
  buildZoneEducation();
  buildZoneContact();
  buildParticles();

  // Character
  character = buildCharacter();
  const px0 = getPathX(0);
  character.position.set(px0, 50, 0); // start high for spin descent
  character.rotation.y = Math.PI;
  scene.add(character);

  // UI
  buildPanels(cfg);
  buildProgressDots();

  // Update intro name from config
  document.getElementById('intro-name').textContent = cfg.personal.name.split(' ').slice(0,3).join(' ');
  document.getElementById('intro-role').textContent = cfg.personal.title;
  document.getElementById('hud-name').textContent = cfg.personal.name.split(' ').map(n=>n[0]).join('') + ' Saddique';

  // Clock
  clock = new THREE.Clock();

  // Finish loading
  clearInterval(loadInterval);
  bar.style.width = '100%';
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    // Hide intro overlay after 4s
    setTimeout(() => {
      document.getElementById('intro-overlay').classList.add('hidden');
      introVisible = false;
    }, 4000);
  }, 500);

  // Events
  window.addEventListener('resize', onResize);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', () => isDragging = false);

  animate();
}

// ─── Input ───────────────────────────────────────────────────
let touchStartY = 0;
function onWheel(e) {
  e.preventDefault();
  targetScrollZ -= e.deltaY * 0.12;
  targetScrollZ = Math.max(-250, Math.min(0, targetScrollZ));
}
function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
function onTouchMove(e) {
  e.preventDefault();
  const dy = touchStartY - e.touches[0].clientY;
  touchStartY = e.touches[0].clientY;
  targetScrollZ -= dy * 0.2;
  targetScrollZ = Math.max(-250, Math.min(0, targetScrollZ));
}
function onMouseDown(e) { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; }
function onMouseMove(e) {
  if (!isDragging) return;
  camRotY -= (e.clientX - lastMouseX) * 0.003;
  camRotX -= (e.clientY - lastMouseY) * 0.002;
  camRotX = Math.max(-0.4, Math.min(0.4, camRotX));
  lastMouseX = e.clientX; lastMouseY = e.clientY;
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ─── Animate ─────────────────────────────────────────────────
const charDescentStart = 0, charDescentDuration = 2.5;
let elapsedTotal = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  elapsedTotal += dt;
  const t = elapsedTotal;

  // Smooth scroll
  scrollZ += (targetScrollZ - scrollZ) * 0.05;
  const pathX = getPathX(scrollZ);
  const lookAheadZ = scrollZ - 3;
  const lookAheadX = getPathX(lookAheadZ);

  // Character position & animation
  if (character) {
    charWalkTime += dt;
    animateCharacter(charWalkTime);

    // Spin descent
    if (t < charDescentDuration) {
      const prog = t / charDescentDuration;
      const eased = 1 - Math.pow(1 - prog, 3);
      character.position.y = THREE.MathUtils.lerp(50, 1.2, eased);
      character.rotation.y = Math.PI + t * 4;
    } else {
      character.position.x = pathX;
      character.position.z = scrollZ - 3;
      character.position.y = 1.2;
      const charAngle = Math.PI + Math.atan2(lookAheadX - pathX, -(lookAheadZ - scrollZ + 3));
      character.rotation.y = THREE.MathUtils.lerp(character.rotation.y, charAngle, 0.1);
    }
  }

  // Camera – third person
  const camDist = 15, camHeight = 6;
  const idealX = pathX + Math.sin(camRotY) * camDist;
  const idealZ = scrollZ + Math.cos(camRotY) * camDist;
  const idealY = camHeight + scrollZ * 0 + camRotX * 8;
  camera.position.x += (idealX - camera.position.x) * 0.05;
  camera.position.y += (idealY - camera.position.y) * 0.05;
  camera.position.z += (idealZ - camera.position.z) * 0.05;

  if (character && t >= charDescentDuration) {
    camera.lookAt(character.position.x, character.position.y + 1.5, character.position.z);
  } else {
    camera.lookAt(pathX, 2, scrollZ - 3);
  }

  // Animate world objects
  scene.traverse(obj => {
    if (obj.name === 'introRing') {
      obj.rotation.z = t * 0.6;
      obj.rotation.x = Math.sin(t * 0.4) * 0.2;
      obj.position.y = 2 + Math.sin(t * 1.2) * 0.3;
    }
    if (obj.name.startsWith('floatOrb_')) {
      obj.position.y = obj.userData.baseY + Math.sin(t * 1.5 + obj.userData.phase) * 0.4;
    }
    if (obj.name.startsWith('pillarCap_')) {
      obj.position.y = obj.userData.baseY + Math.sin(t * 2 + obj.userData.phase) * 0.4;
    }
    if (obj.name === 'skillCore') {
      obj.rotation.y = t * 0.5;
      obj.rotation.x = t * 0.3;
    }
    if (obj.name.startsWith('skillOrb_')) {
      const d = obj.userData;
      const angle = t * d.orbitSpeed + d.orbitPhase;
      obj.position.x = d.orbitCenter.x + Math.cos(angle) * d.orbitRadius;
      obj.position.z = d.orbitCenter.z + Math.sin(angle) * d.orbitRadius;
      obj.position.y = d.orbitY + Math.sin(t * 1.5 + d.orbitPhase) * 1.2;
    }
    if (obj.name === 'eduStar') {
      obj.rotation.y = t * 1.2;
      obj.position.y = 7 + Math.sin(t * 2) * 0.3;
    }
    if (obj.name === 'portal') {
      obj.rotation.z = t * 0.4;
    }
  });

  // Animate dust/streamers
  const dust = scene.getObjectByName('dust');
  if (dust) {
    const pos = dust.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) - 0.01);
      if (pos.getY(i) < 0) pos.setY(i, 10);
    }
    pos.needsUpdate = true;
  }
  const stream = scene.getObjectByName('streamers');
  if (stream) {
    const pos = stream.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) - 0.03);
      if (pos.getY(i) < 0) pos.setY(i, 28);
    }
    pos.needsUpdate = true;
  }

  // Zone detection
  updateZone(scrollZ);

  composer.render();
}

// ─── Kick off ────────────────────────────────────────────────
init().catch(console.error);
