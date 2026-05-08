import { describe, expect, it } from 'vitest';
import { createSampleMesh, decimateMesh, repairMesh } from './meshOps';

describe('mesh operations', () => {
  it('removes degenerate triangles during repair', () => {
    const source = createSampleMesh();
    const repaired = repairMesh(source);
    expect(repaired.repairedTriangles).toBeLessThan(source.sourceTriangles);
    expect(repaired.indices.length % 3).toBe(0);
  });

  it('decimates repaired triangles', () => {
    const repaired = repairMesh(createSampleMesh());
    const decimated = decimateMesh(repaired, 0.5);
    expect(decimated.decimatedTriangles).toBeLessThanOrEqual(repaired.repairedTriangles);
    expect(decimated.indices.length).toBeGreaterThan(0);
  });
});
