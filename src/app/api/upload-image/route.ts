import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WebP, GIF).' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 5MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, '-').toLowerCase();
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const fileName = `${nameWithoutExt}-${timestamp}${extension}`;

    // Ruta donde se guardará la imagen
    const publicPath = path.join(process.cwd(), 'public', 'images');
    const filePath = path.join(publicPath, fileName);

    // Crear directorio si no existe
    if (!existsSync(publicPath)) {
      await mkdir(publicPath, { recursive: true });
    }

    // Guardar archivo
    await writeFile(filePath, buffer);

    // Retornar la URL relativa de la imagen
    const imageUrl = `/images/${fileName}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
    });
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
