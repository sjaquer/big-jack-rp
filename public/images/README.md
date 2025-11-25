# Carpeta de Imágenes de Productos

Esta carpeta almacena las imágenes de los productos subidas desde el formulario de productos.

## Funcionamiento

- Las imágenes se suben mediante el formulario de "Añadir/Editar Producto"
- Se guardan automáticamente en esta carpeta con un nombre único
- El formato del nombre es: `nombre-original-timestamp.extension`
- Formatos permitidos: JPG, PNG, WebP, GIF
- Tamaño máximo: 5MB

## Acceso a las imágenes

Las imágenes se acceden mediante la ruta: `/images/nombre-archivo.ext`

Ejemplo: Si subes una imagen llamada "hamburguesa-clasica.jpg", se guardará como algo similar a `hamburguesa-clasica-1732483200000.jpg` y se accederá mediante `/images/hamburguesa-clasica-1732483200000.jpg`

## Nota para desarrollo local

Como este proyecto se ejecuta en localhost, las imágenes se guardan directamente en esta carpeta del sistema de archivos. En producción, considera usar un servicio de almacenamiento en la nube como:
- Firebase Storage
- AWS S3
- Cloudinary
- Vercel Blob Storage
