# Panel de Tarifas – Deploy Online

Este paquete contiene tu página **index.html** lista para ser publicada como sitio estático.

## Opción A: GitHub Pages
1. Crea un repositorio nuevo en GitHub (p. ej. `tarifas-panel`).
2. Sube **estos archivos** a la rama `main`.
3. En _Settings → Pages_, selecciona **Source: Deploy from a branch** y **Branch: main / root**.
4. Guarda. En ~1–2 minutos tendrás una URL pública (`https://TU_USUARIO.github.io/tarifas-panel/`).

## Opción B: Netlify (arrastrar y soltar)
1. Entra en https://app.netlify.com/drop
2. Arrastra esta carpeta (o el ZIP) y suéltala. Netlify te dará una URL pública al instante.

## Opción C: Vercel
1. `vercel deploy` apuntando a esta carpeta, o sube el proyecto desde el dashboard.
2. Vercel detectará que es un sitio estático y lo publicará.

## Estructura del proyecto
- `index.html` — tu panel, 100% estático (sin dependencias externas).
- `netlify.toml` — configuración mínima.
- `vercel.json` — configuración mínima.

> Nota: No necesitas build, servidor ni base de datos. Con subir estos archivos, basta.
