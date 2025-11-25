Coloca aquí tu icono Windows `icon.ico` para que el instalador muestre el icono personalizado.

Cómo generar `icon.ico` desde `icon.png` (requiere ImageMagick):

```powershell
magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 assets/icon.ico
```

Nombre y ubicación esperada: `assets/icon.ico`.

Si quieres, sube un `icon.png` y lo convierto y lo añado al repo.