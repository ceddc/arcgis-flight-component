interface ColorLike {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface PbrMaterialLike {
  color?: ColorLike | null;
  metallic: number;
  roughness: number;
}

interface MeshComponentLike {
  material?: unknown;
  shading?: string;
  trustSourceNormals?: boolean;
}

function isPbrMaterial(material: unknown): material is PbrMaterialLike {
  return typeof material === "object" && material !== null
    && "metallic" in material && typeof material.metallic === "number"
    && "roughness" in material && typeof material.roughness === "number";
}

function luminance(color: ColorLike | null | undefined): number {
  if (!color) return 1;
  return (color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722) / 255;
}

function productionRoughness(material: PbrMaterialLike): number {
  if (material.metallic >= 0.2) return Math.min(material.roughness, 0.34);
  if (material.roughness > 0.5) return Math.max(0.36, material.roughness * 0.58);
  return material.roughness;
}

export function applyProductionAircraftFinish(
  components: readonly MeshComponentLike[],
): void {
  const materials = new Set<PbrMaterialLike>();

  for (const component of components) {
    component.shading = "source";
    component.trustSourceNormals = true;
    if (isPbrMaterial(component.material)) materials.add(component.material);
  }

  for (const material of materials) {
    // Keep authored glazing roughness instead of polishing translucent windows.
    if (typeof material.color?.a === "number" && material.color.a < 1) continue;
    if (luminance(material.color) < 0.15) continue;
    material.roughness = productionRoughness(material);
  }
}
