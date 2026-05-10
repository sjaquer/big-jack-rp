import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const resolveAllowedTypes = (): string[] => {
  const raw = process.env.UPLOAD_ALLOWED_TYPES;
  if (!raw) return DEFAULT_ALLOWED_TYPES;
  const parsed = raw.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_TYPES;
};

const resolveMaxSizeBytes = (): number => {
  const raw = Number(process.env.UPLOAD_MAX_IMAGE_MB ?? '5');
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 1024 * 1024;
  const clampedMb = Math.min(Math.max(raw, 1), 20);
  return Math.floor(clampedMb * 1024 * 1024);
};

const resolveUploadSubdir = (): string => {
  const input = (process.env.UPLOAD_IMAGE_SUBDIR ?? 'images').trim();
  // Normalize and block absolute/path traversal values for safer filesystem writes.
  const normalized = input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    return 'images';
  }
  return normalized;
};

const buildJsonResponse = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return buildJsonResponse(
        { error: 'No se proporcionó ningún archivo' },
        400
      );
    }

    // Validar tipo de archivo
    const validTypes = resolveAllowedTypes();
    if (!validTypes.includes(file.type)) {
      return buildJsonResponse(
        { error: `Tipo de archivo no válido. Tipos permitidos: ${validTypes.join(', ')}` },
        400
      );
    }

    // Validar tamaño (máximo 5MB)
    const maxSizeBytes = resolveMaxSizeBytes();
    if (file.size > maxSizeBytes) {
      const maxSizeMb = Math.floor(maxSizeBytes / (1024 * 1024));
      return buildJsonResponse(
        { error: `El archivo es demasiado grande. Máximo ${maxSizeMb}MB.` },
        400
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear nombre único para el archivo con extensión controlada.
    const originalName = file.name.toLowerCase().replace(/\s+/g, '-');
    const extension = path.extname(originalName);
    const expectedExtension = MIME_EXTENSION_MAP[file.type];
    const safeBaseName = path
      .basename(originalName, extension)
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40) || 'image';

    if (!expectedExtension) {
      return buildJsonResponse({ error: 'Tipo MIME no soportado.' }, 400);
    }

    const safeExtension = extension && extension.length <= 8 ? extension : expectedExtension;
    const fileName = `${safeBaseName}-${randomUUID()}${safeExtension}`;

    // Ruta donde se guardará la imagen
    const uploadSubdir = resolveUploadSubdir();
    const publicPath = path.join(process.cwd(), 'public', uploadSubdir);
    const filePath = path.join(publicPath, fileName);

    // Crear directorio si no existe
    if (!existsSync(publicPath)) {
      await mkdir(publicPath, { recursive: true });
    }

    // Guardar archivo
    await writeFile(filePath, buffer);

    // Retornar la URL relativa de la imagen
    const imageUrl = `/${uploadSubdir}/${fileName}`;

    return buildJsonResponse({
      success: true,
      imageUrl,
      fileName,
    });
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    return buildJsonResponse(
      { error: 'Error al procesar la imagen' },
      500
    );
  }
}
