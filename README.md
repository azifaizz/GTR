# Nissan GT-R R35 Cinematic Experience

A highly immersive, interactive 3D web experience showcasing the Nissan GT-R R35. Built with React, Three.js, and GSAP, this project creates a cinematic, scroll-driven journey through the vehicle's design, aerodynamics, and performance specifications.

## ✨ Features

- **Cinematic 3D Rendering**: High-fidelity 3D models of the GT-R R35 and a sci-fi garage environment.
- **Scroll-Driven Animation**: Seamless camera choreography and waypoint navigation powered by GSAP ScrollTrigger and Lenis smooth scrolling.
- **Dynamic Audio Engine**: A Web Audio API-driven sound system featuring responsive engine rumble, UI interactions, and spatial whoosh effects.
- **Optimized Loading**: Pre-fetches and compiles shaders, geometries, and audio buffers before the experience begins to ensure a jank-free, 60fps experience.
- **Responsive Quality**: Automatically scales rendering quality (shadows, antialiasing, DPR) down on mobile devices or lower-end hardware to maintain smooth framerates.
- **Client-Side Routing**: Handled seamlessly by TanStack Router for an SPA architecture.

## 🛠️ Technology Stack

- **Framework**: React 19 + Vite
- **Routing**: [TanStack Router](https://tanstack.com/router/latest)
- **3D Engine**: [Three.js](https://threejs.org/) & [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- **Animation**: [GSAP](https://gsap.com/) (ScrollTrigger) & [Lenis](https://lenis.studiofreight.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 📂 Project Structure

```text
├── public/
│   ├── assets/        # Local GLB files (nissan-gtr.glb, scifi-garage.glb)
│   └── audio/         # Sound effects (engine, whoosh, UI blips)
├── src/
│   ├── components/
│   │   ├── nissan/    # Core 3D scene, camera rig, and HUD logic
│   │   └── ui/        # Reusable interface components (Tailwind/Radix based)
│   ├── hooks/         # Custom React hooks (e.g., useMobile)
│   ├── lib/           # Utility functions
│   ├── routes/        # TanStack Router page components
│   ├── index.html     # Application entry point
│   ├── main.tsx       # Client-side render logic
│   └── router.tsx     # Router configuration
└── vite.config.ts     # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and npm installed.

### Installation

Clone the repository and install the dependencies. Due to peer dependency version overlaps between React 19 and React Three Fiber, use the `--legacy-peer-deps` flag:

```sh
npm install --legacy-peer-deps
```

### Development Server

Start the local Vite development server:

```sh
npm run dev
```

The application will be available at `http://localhost:8080/`.

### Production Build

To build the application for production deployment:

```sh
npm run build
```

The compiled assets will be placed in the `dist/` directory, optimized and chunked. You can preview the production build locally by running:

```sh
npm run preview
```

## 🎮 Interactivity

- **Scroll**: Move the mouse wheel or swipe down to advance the cinematic camera along the predefined path.
- **Click**: Interact with the "Explore Specifications" button at the final waypoint.
- **Sound**: Toggle the top right audio button to mute/unmute the interactive sound engine.

## 📄 License

This project is intended for demonstration purposes. 3D assets and audio files may be subject to their respective creators' copyrights.
