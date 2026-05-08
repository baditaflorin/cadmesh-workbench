import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { MeshData, SceneSpec } from '../workbench/types';

type ThreeViewportProps = {
  scene: SceneSpec;
  exportNonce: number;
  onToast: (message: string) => void;
};

export default function ThreeViewport({ scene, exportNonce, onToast }: ThreeViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color('#f6f7f9');

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(3.3, 2.2, 3.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const hemi = new THREE.HemisphereLight('#ffffff', '#9aa5b1', 1.9);
    const key = new THREE.DirectionalLight('#ffffff', 2.3);
    key.position.set(3, 4, 3);
    const fill = new THREE.DirectionalLight('#dfe8ee', 0.8);
    fill.position.set(-3, 1.5, -2);
    const grid = new THREE.GridHelper(5, 16, '#8ca0a3', '#d2dad7');
    grid.position.y = -0.72;
    threeScene.add(hemi, key, fill, grid, groupRef.current);

    const resize = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resize.observe(mount);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      groupRef.current.rotation.y += 0.002;
      controls.update();
      renderer.render(threeScene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    drawScene(groupRef.current, scene);
  }, [scene]);

  useEffect(() => {
    if (exportNonce === 0) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      groupRef.current,
      (result) => {
        const blob =
          result instanceof ArrayBuffer
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'cadmesh-workbench.glb';
        anchor.click();
        URL.revokeObjectURL(url);
        onToast('GLB export prepared');
      },
      (error) => onToast(error instanceof Error ? error.message : 'GLB export failed'),
      { binary: true },
    );
  }, [exportNonce, onToast]);

  return <div ref={mountRef} className="three-mount" />;
}

function drawScene(group: THREE.Group, scene: SceneSpec) {
  group.clear();
  if (scene.kind === 'cad') {
    drawCAD(group, scene);
    return;
  }
  drawMesh(group, scene.mesh, scene.tint);
}

function drawCAD(group: THREE.Group, scene: Extract<SceneSpec, { kind: 'cad' }>) {
  const material = new THREE.MeshStandardMaterial({
    color: scene.tint,
    roughness: 0.54,
    metalness: 0.16,
  });
  const ghost = new THREE.MeshStandardMaterial({
    color: '#e4572e',
    transparent: true,
    opacity: scene.operation === 'difference' ? 0.28 : 0.55,
    roughness: 0.7,
  });

  const { width, height, depth, radius } = scene.dimensions;
  let geometry: THREE.BufferGeometry;
  if (scene.primitive === 'sphere') {
    geometry = new THREE.SphereGeometry(radius, 48, 24);
  } else if (scene.primitive === 'cylinder') {
    geometry = new THREE.CylinderGeometry(radius, radius, height, 48);
  } else {
    geometry = new THREE.BoxGeometry(width, height, depth, 10, 10, 10);
  }
  const primary = new THREE.Mesh(geometry, material);
  primary.castShadow = true;
  group.add(primary);

  const cutterGeometry = new THREE.CylinderGeometry(0.42, 0.42, Math.max(width, depth) * 1.6, 48);
  cutterGeometry.rotateZ(Math.PI / 2);
  const cutter = new THREE.Mesh(cutterGeometry, ghost);
  cutter.position.set(0.12, 0.03, 0);
  if (scene.operation !== 'union') {
    group.add(cutter);
  } else {
    const union = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.82, 32, 16), ghost);
    union.position.set(width * 0.32, 0.08, 0);
    group.add(union);
  }
}

function drawMesh(group: THREE.Group, mesh: MeshData, tint: string) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geometry.setIndex(mesh.indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: tint,
    roughness: 0.62,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const object = new THREE.Mesh(geometry, material);
  group.add(object);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: '#17202a', transparent: true, opacity: 0.22 }),
  );
  group.add(wire);
}
