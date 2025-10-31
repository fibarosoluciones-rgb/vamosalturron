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

## Opción D: Firebase Hosting (vamosalturron-3242c)
Si prefieres publicar el sitio en el proyecto de Firebase que ya está configurado (`vamosalturron-3242c`), sigue estos pasos:

1. Instala las herramientas de Firebase (solo es necesario la primera vez):
   ```bash
   npm install -g firebase-tools
   ```
2. Inicia sesión en tu cuenta de Google:
   ```bash
   firebase login
   ```
   > Puedes usar `firebase login --no-localhost` si trabajas en un entorno sin navegador.
3. Inicializa el proyecto seleccionando **Hosting**, **Use existing project** y eligiendo `vamosalturron-3242c` cuando lo solicite. Cuando pregunte por la carpeta pública, introduce `public`.
   ```bash
   firebase init
   ```
4. Despliega el sitio estático incluido en este repositorio:
   ```bash
   firebase deploy --only hosting
   ```

Tras el deploy, Firebase publicará el sitio automáticamente en:

- https://vamosalturron-3242c.web.app
- https://vamosalturron-3242c.firebaseapp.com
- https://www.fibaroteleco.com

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
4. Rellena los campos `apiKey`, `authDomain` y `projectId` dentro de [`public/firebase-config.js`](./public/firebase-config.js).
5. (Opcional) Cambia los valores de `collection` y `document` si quieres guardar el estado en otra ruta de Firestore.
6. Publica el sitio. La primera vez que un administrador acceda se creará el documento `app/state` con las tarifas, usuarios y leads por defecto.

A partir de ese momento, todas las modificaciones que el administrador realice desde el panel se almacenarán en Firestore y cualquier usuario conectado verá los cambios en tiempo real sin necesidad de recargar la página.

## Copias de seguridad automáticas de Firestore

Este repositorio incluye funciones de Cloud Functions v2 que crean una copia de seguridad completa de Firestore cada 60 minutos y una utilidad para restaurar la copia más reciente desde el bucket `vamosalturron-3242c-backups` en la región `europe-southwest1`.

### Probar el backup manualmente
1. Ve a [Google Cloud Console](https://console.cloud.google.com/functions/list?project=vamosalturron-3242c).
2. Selecciona la función **scheduledBackup**.
3. Pulsa **Trigger function** para lanzar una copia bajo demanda y revisa los logs para confirmar que se ha solicitado correctamente.

### Dónde se guardan las copias
- Abre [Cloud Storage](https://console.cloud.google.com/storage/browser/vamosalturron-3242c-backups?project=vamosalturron-3242c).
- Las carpetas se crean con el formato `firestore/YYYY-MM-DD/HHmm/` dentro del bucket `vamosalturron-3242c-backups`.

### Restaurar la última copia desde la interfaz web
1. Despliega el sitio y abre `/admin/restore.html` en tu hosting de Firebase.
2. Introduce el valor configurado en `ADMIN_TOKEN`.
3. Pulsa **Restaurar último backup** y espera la confirmación del inicio de la importación.

### Restaurar una copia concreta desde consola

```bash
gcloud firestore import gs://vamosalturron-3242c-backups/firestore/YYYY-MM-DD/HHmm/
```

### Configurar el deploy automático en GitHub
1. En tu repositorio, abre **Settings → Secrets and variables → Actions**.
2. Crea el secreto **FIREBASE_TOKEN** con el resultado de `firebase login:ci` en tu máquina local.
3. Crea el secreto **ADMIN_TOKEN** con el token que usarás para proteger la restauración.
4. Tras configurar los secretos, cualquier push o merge en `main` ejecutará el workflow que despliega automáticamente `functions` y `hosting`. Las copias de seguridad se ejecutarán cada 60 minutos tras el deploy.
