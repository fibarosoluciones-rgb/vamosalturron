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

## Sincronización en tiempo real con Firebase

Si quieres que el panel funcione completamente online y que los cambios del administrador se propaguen a todos los usuarios en tiempo real, sigue estos pasos:

1. **Crea un proyecto en Firebase** (https://firebase.google.com/) y habilita _Firestore Database_.
2. En la pestaña de reglas de Firestore establece, como mínimo, algo similar a:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.token.admin == true;
       }
     }
   }
   ```
   Ajusta las reglas a tus necesidades de seguridad.
3. Copia las credenciales web de tu proyecto (menú _Project settings → General → Your apps → Web app_).
4. Rellena los campos `apiKey`, `authDomain` y `projectId` dentro de [`firebase-config.js`](./firebase-config.js).
5. (Opcional) Cambia los valores de `collection` y `document` si quieres guardar el estado en otra ruta de Firestore.
6. Publica el sitio. La primera vez que un administrador acceda se creará el documento `app/state` con las tarifas, usuarios y leads por defecto.

A partir de ese momento, todas las modificaciones que el administrador realice desde el panel se almacenarán en Firestore y cualquier usuario conectado verá los cambios en tiempo real sin necesidad de recargar la página.
