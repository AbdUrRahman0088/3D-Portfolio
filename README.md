# 🌐 Abd Ur Rahman Saddique — 3D Portfolio

A cinematic, anime-style **interactive 3D portfolio** built with [Three.js](https://threejs.org/). Walk your character through a scroll-driven 3D world, with each zone revealing a different section of the portfolio.

---

## ✨ Features

- **3D Anime World** — scroll to walk a voxel-style character through six themed zones
- **Cinematic Intro** — spin-descent entrance animation on load
- **Bloom Post-Processing** — Unreal Bloom pass for a glowing, stylized look
- **Zone-Based Content Panels** — glassmorphism panels reveal content as you explore
- **Drag to Rotate Camera** — mouse drag adjusts the third-person camera angle
- **Touch Support** — swipe to scroll on mobile
- **Responsive Layout** — panels reposition on narrow screens
- **Config-Driven** — all personal data lives in `config.json`; no JS edits needed

---

## 🗂️ Project Structure

```
portfolio/
├── index.html       # Entry point & HTML structure
├── styles.css       # All styles (loading, HUD, panels, responsive)
├── script.js        # Three.js scene, character, zones, animations
└── config.json      # Personal data (bio, projects, skills, contact)
```

---

## 🗺️ World Zones

| Zone | Scroll Range | Content |
|------|-------------|---------|
| Intro | `0 → -25` | Name, title, animated ring platform |
| About | `-25 → -65` | Bio, stats, floating orbs & trees |
| Projects | `-65 → -125` | Project cards, holographic floor |
| Skills | `-125 → -175` | Skill bars, orbiting skill orbs |
| Education | `-175 → -215` | Education cards, star monument |
| Contact | `-215 → -250` | Links, contact portal |

---

## 🛠️ Tech Stack

- **Three.js r158** (ES modules via importmap)
- **MeshToonMaterial** for the anime/cel-shaded look
- **EffectComposer + UnrealBloomPass** for glow effects
- Vanilla **HTML / CSS / JavaScript** — zero build tools required

---

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for full local development instructions.

**Shortest path:**

```bash
# Any static file server works, e.g.:
npx serve .
# then open http://localhost:3000
```

> ⚠️ Must be served over HTTP/HTTPS — `file://` won't work because of ES module imports.

---

## ⚙️ Customising Your Data

Edit **`config.json`** to update all portfolio content — no JavaScript knowledge needed.

```jsonc
{
  "personal": { "name": "Your Name", "title": "Your Title", ... },
  "projects": [ { "name": "Project", "emoji": "🚀", "tags": [...], ... } ],
  "skills":   [ { "category": "Languages", "items": [...] } ],
  "education":[ { "degree": "BSc CS", "institution": "...", ... } ],
  "contact":  { "links": [ { "icon": "📧", "text": "...", "url": "..." } ] }
}
```

---

## 📬 Contact

| | |
|---|---|
| **Email** | abdurrahmanarain088@gmail.com |
| **LinkedIn** | [linkedin.com/in/abdurrahmansaddique009](https://www.linkedin.com/in/abdurrahmansaddique009) |

---

## 📄 License

This project is open for personal portfolio use. Feel free to fork and adapt it — a credit back is appreciated!
