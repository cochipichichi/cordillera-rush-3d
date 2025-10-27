# Cordillera Rush 3D (Three.js Runner)

Runner 3D listo para **GitHub Pages**:
- Tres carriles (izq/centro/der), **saltos** y obstáculos (rocas, **grietas**, hielo).
- **Dificultades** (fácil/normal/difícil) y **música/SFX** WebAudio.
- Controles **PC** (flechas/WSAD) y **móvil** (gestos).
- **PWA** básico (offline).

## Estructura
```
public/
  index.html
  manifest.webmanifest
  service-worker.js
  assets/favicon.png
src/
  main.js
```
**TIP:** Usa `public/` como raíz de GitHub Pages (Pages → Source: `main` + carpeta `/docs` o `public`).

## Cómo correr localmente
- Opción 1: abre `public/index.html` directamente.  
- Opción 2: servir estático (recomendado). Ejemplos:
  - `python3 -m http.server -d public 8080`
  - `npx http-server public -p 8080`

## Ideas de mejora
- Power-ups (escudo, imán, turbo) y **best score** (localStorage).
- **Skybox** y post-procesado (bloom/film).
- Pistas con **curvas** y rampas (instanced meshes).

## Licencia
MIT
