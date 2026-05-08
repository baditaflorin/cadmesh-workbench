export type Primitive = 'box' | 'cylinder' | 'sphere';
export type BooleanOperation = 'union' | 'difference' | 'intersection';

export type Dimensions = {
  width: number;
  height: number;
  depth: number;
  radius: number;
};

export type MeshData = {
  positions: number[];
  indices: number[];
  sourceTriangles: number;
  repairedTriangles: number;
  decimatedTriangles: number;
};

export type SceneSpec =
  | {
      kind: 'cad';
      primitive: Primitive;
      operation: BooleanOperation;
      dimensions: Dimensions;
      tint: string;
      summary?: string;
    }
  | {
      kind: 'mesh';
      mesh: MeshData;
      tint: string;
      summary?: string;
    }
  | {
      kind: 'photo';
      mesh: MeshData;
      tint: string;
      summary?: string;
    };
