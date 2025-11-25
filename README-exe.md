Instrucciones para generar un .exe (Windows) que ejecute la app Next.js dentro de un contenedor Electron

# Generar un `.exe` (Windows) con Electron + electron-builder

## Requisitos previos

- Node.js (>=18) instalado en la máquina
- Git (opcional)

## Preparar el proyecto

1. Clona el repositorio o copia el proyecto en la máquina destino.
2. En la raíz del proyecto instala dependencias:

```powershell
npm install
```

1. Variables de entorno: crea un archivo `.env.local` con las variables necesarias (por ejemplo, configuración de Firebase). Verifica que la app funciona en modo dev con `npm run dev`.

## Desarrollo con Electron (modo dev)

Esto abre una ventana de Electron y carga la app de Next.js en `http://localhost:9002`.

```powershell
# Levanta next en modo dev y abre ventana electron
npm run electron:dev
```

## Crear instalador `.exe` (build de producción)

1. Genera la build de producción de Next.js e inicia el empaquetado con `electron-builder`:

```powershell
npm run electron:dist
```

1. Resultado: el instalador y/o los artefactos se guardarán en la carpeta `dist/` (según la configuración de `package.json`).

## Icono e assets

- Añade un icono `.ico` para Windows en `assets/icon.ico`. Si no existe, `electron-builder` usará el icono por defecto.
- Para generar un `.ico` desde un `.png`, puedes usar ImageMagick (si lo tienes instalado):

```powershell
magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 assets/icon.ico
```

## Configuración incluida

- `package.json` contiene una sección `build` para `electron-builder` con `nsis` y `portable` como targets Windows y salida en `dist/`.
- El campo `main` apunta a `electron/main.js` que arranca el servidor Next (`npm run start`) y abre la ventana Electron.

## Consideraciones importantes

- En producción la app empaquetada usa `npm run start` internamente para servir la carpeta `.next`. Asegúrate que `.next` y `public` estén incluidos en el empaquetado (la configuración presente los incluye).
- Timeout: si el servidor Next tarda más de 30s en arrancar, el wrapper de Electron abortará. Si tu build es lento, edita `electron/main.js` y aumenta el timeout de `wait-on`.
- Tamaño: el ejecutable incluirá `node_modules` y `.next`, por lo que el artefacto será grande. Para reducir tamaño, considera externalizar APIs o producir solo assets estáticos.
- Construir en Windows: para generar instaladores Windows de forma fiable, ejecuta `electron-builder` en una máquina Windows (o usa `wine`/CI configurado).

## Opciones que puedo hacer por ti (si quieres que automatice más)

- Ajustar el `build.files` para reducir el tamaño final y excluir dependencias no necesarias.
- Agregar un `assets/icon.ico` provisto por ti o convertir automáticamente un `icon.png` si lo subes.
- Ajustar `electron/main.js` para mayor robustez (logs, tiempo de espera configurable).

Si quieres que continúe, indícame si me paso a:

- Generar un icono base (si subes un PNG lo convierto y lo añado al repo), y
- Ejecutar una build local aquí y subir el `.exe` (si das acceso). Si prefieres, te doy el comando exacto para ejecutarlo en Windows.
