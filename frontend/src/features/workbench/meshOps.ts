import type { MeshData } from './types';

export function createSampleMesh(): MeshData {
  const positions = [
    -0.7, -0.5, -0.7, 0.7, -0.5, -0.7, 0.7, 0.5, -0.7, -0.7, 0.5, -0.7, -0.7, -0.5, 0.7, 0.7, -0.5, 0.7, 0.7,
    0.5, 0.7, -0.7, 0.5, 0.7, -0.7, -0.5, -0.7, 0.7, -0.5, -0.7,
  ];
  const indices = [
    0, 1, 2, 2, 3, 0, 4, 6, 5, 6, 4, 7, 0, 4, 5, 5, 1, 0, 1, 5, 6, 6, 2, 1, 2, 6, 7, 7, 3, 2, 3, 7, 4, 4, 0,
    3, 8, 9, 9,
  ];
  return {
    positions,
    indices,
    sourceTriangles: indices.length / 3,
    repairedTriangles: 0,
    decimatedTriangles: 0,
  };
}

export function createPhotoPreviewMesh(fileCount: number): MeshData {
  const ring = Math.max(6, Math.min(24, fileCount * 3));
  const positions = [0, 0.8, 0];
  const indices: number[] = [];
  for (let i = 0; i < ring; i += 1) {
    const angle = (Math.PI * 2 * i) / ring;
    const radius = 0.55 + (i % 3) * 0.08;
    positions.push(Math.cos(angle) * radius, -0.35, Math.sin(angle) * radius);
  }
  for (let i = 1; i <= ring; i += 1) {
    const next = i === ring ? 1 : i + 1;
    indices.push(0, i, next);
  }
  return {
    positions,
    indices,
    sourceTriangles: indices.length / 3,
    repairedTriangles: indices.length / 3,
    decimatedTriangles: indices.length / 3,
  };
}

export function repairMesh(mesh: MeshData): MeshData {
  const vertexMap = new Map<string, number>();
  const positions: number[] = [];
  const remap: number[] = [];

  for (let i = 0; i < mesh.positions.length; i += 3) {
    const key = `${mesh.positions[i].toFixed(5)},${mesh.positions[i + 1].toFixed(5)},${mesh.positions[i + 2].toFixed(5)}`;
    let mapped = vertexMap.get(key);
    if (mapped === undefined) {
      mapped = positions.length / 3;
      vertexMap.set(key, mapped);
      positions.push(mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]);
    }
    remap[i / 3] = mapped;
  }

  const indices: number[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = remap[mesh.indices[i]];
    const b = remap[mesh.indices[i + 1]];
    const c = remap[mesh.indices[i + 2]];
    if (a !== b && b !== c && a !== c) {
      indices.push(a, b, c);
    }
  }

  return {
    positions,
    indices,
    sourceTriangles: mesh.sourceTriangles,
    repairedTriangles: indices.length / 3,
    decimatedTriangles: mesh.decimatedTriangles || indices.length / 3,
  };
}

export function decimateMesh(mesh: MeshData, ratio: number): MeshData {
  const safeRatio = Math.max(0.15, Math.min(1, ratio));
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const target = Math.max(1, Math.floor(triangleCount * safeRatio));
  const indices: number[] = [];
  for (let tri = 0; tri < triangleCount && indices.length / 3 < target; tri += Math.ceil(1 / safeRatio)) {
    const offset = tri * 3;
    indices.push(mesh.indices[offset], mesh.indices[offset + 1], mesh.indices[offset + 2]);
  }
  return {
    ...mesh,
    indices,
    decimatedTriangles: indices.length / 3,
  };
}
