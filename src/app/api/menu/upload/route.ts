import { NextRequest, NextResponse } from "next/server";
import { uploadMenuImage, deleteMenuImage, MENU_FOLDERS, type MenuFolder } from "../../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const folder = formData.get('folder') as MenuFolder;
    const itemId = formData.get('itemId') as string;

    if (!file) {
      return NextResponse.json(
        { error: "No se encontró el archivo" },
        { status: 400 }
      );
    }

    if (!folder || !Object.values(MENU_FOLDERS).includes(folder)) {
      return NextResponse.json(
        { error: "Carpeta inválida" },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "ID del elemento requerido" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "Solo se permiten archivos de imagen" },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 5MB" },
        { status: 400 }
      );
    }

    // Subir imagen
    const result = await uploadMenuImage(file, folder, itemId);

    return NextResponse.json({
      success: true,
      url: result.url,
      storageKey: result.storageKey
    });

  } catch (error) {
    console.error("Error uploading menu image:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storageKey = searchParams.get('storageKey');

    if (!storageKey) {
      return NextResponse.json(
        { error: "storageKey requerido" },
        { status: 400 }
      );
    }

    await deleteMenuImage(storageKey);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error("Error deleting menu image:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}