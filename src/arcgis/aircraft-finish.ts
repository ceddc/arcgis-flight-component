/**
 * Tune loaded aircraft mesh materials for the flight scene's lighting.
 * The helper caps overly polished PBR surfaces and adjusts source shading
 * while retaining authored dark materials, normals and translucent glazing.
 */
interface ColorLike {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/** Narrow runtime shape of a physically based material accepted by this helper. */
interface PbrMaterialLike {
  color?: ColorLike | null;
  metallic: number;
  roughness: number;
}

/** Read only the material fields needed to set model finish and source shading. */
interface MeshComponentLike {
  material?: unknown;
  shading?: string;
  trustSourceNormals?: boolean;
}

/** Identify material-like objects without depending on a specific ArcGIS SDK class. */
function isPbrMaterial(material: unknown): material is PbrMaterialLike {
  return typeof material === "object" && material !== null
    && "metallic" in material && typeof material.metallic === "number"
    && "roughness" in material && typeof material.roughness === "number";
}

/** Convert the model's 0-255 RGB channels to a perceptual brightness estimate. */
function luminance(color: ColorLike | null | undefined): number {
  if (!color) return 1;
  return (color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722) / 255;
}

/** Cap polished reflections while retaining existing roughness on already-matte materials. */
function productionRoughness(material: PbrMaterialLike): number {
  if (material.metallic >= 0.2) return Math.min(material.roughness, 0.34);
  if (material.roughness > 0.5) return Math.max(0.36, material.roughness * 0.58);
  return material.roughness;
}

/**
 * Preserve each aircraft mesh's authored normals and add restrained highlights.
 *
 * Material instances are deduplicated because imported glTF meshes can share
 * one material object; translucent glazing and very dark finishes are left as-authored.
 *
 * @param components Mesh components returned by the ArcGIS glTF mesh loader.
 */
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
