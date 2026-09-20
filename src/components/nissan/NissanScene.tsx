import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { BackSide, Box3, Color, MathUtils, MeshStandardMaterial, Object3D, PerspectiveCamera, PMREMGenerator, WebGLRenderer, Vector3 } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const carAssetUrl = "/assets/nissan-gtr.glb";
const garageAssetUrl = "/assets/scifi-garage.glb";
import { useIsMobile } from "@/hooks/use-mobile";
import { DESKTOP_SHOTS, HOTSPOTS, MOBILE_SHOTS, interpolateShot, type ExperienceRefs } from "./scene-data";

type SceneProps = ExperienceRefs & { quality: "low" | "high" };

function Vehicle() {
  const { scene } = useGLTF(carAssetUrl);
  useEffect(() => {
    // Ground the car: the garage's visible floor slab top is at y = 0.101 (raycast-verified), not 0.
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene);
    scene.position.y = -bounds.min.y + 0.104;
    scene.traverse((child) => {
      if ((child as Object3D & { isMesh?: boolean }).isMesh) {
        child.receiveShadow = true;
        const mesh = child as Object3D & { material?: MeshStandardMaterial | MeshStandardMaterial[] };
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        child.castShadow = materials.some((material) => /PaintTNR|Wheel1|Carbon1/.test(material.name));
        for (const material of materials) {
          material.envMapIntensity = 0.55;
          const physical = material as MeshStandardMaterial & { clearcoat?: number; clearcoatRoughness?: number; specularIntensity?: number };
          if (typeof physical.clearcoat === "number") {
            // The GLB's clearcoat/specular layers add a silver sheen over the black paint — dial them back.
            physical.clearcoat = 0.12;
            physical.clearcoatRoughness = 0.3;
          }
          if (typeof physical.specularIntensity === "number") {
            physical.specularIntensity = 0.4;
          }
          if (/Coloured/.test(material.name)) {
            // Widebody wrap texture is silver — multiply it down to deep black, keeping the weave.
            material.color = new Color("#0a0a0b");
            material.metalness = 0.75;
            material.roughness = 0.38;
          }
          if (/PaintTNR/.test(material.name)) {
            material.color = new Color("#050607");
            material.emissive = new Color("#000000");
            material.emissiveIntensity = 0;
            material.metalness = 0.82;
            material.roughness = 0.24;
          } else if (material.color && material.color.r < 0.05 && material.color.g < 0.05 && material.color.b < 0.05 && material.metalness > 0.4) {
            // Main black body shell: rough metal reads grey under studio light — make it glossy black.
            material.roughness = 0.3;
            material.metalness = 0.85;
          }
          material.needsUpdate = true;
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} scale={100} />;
}

function SuppliedGarage() {
  const { scene } = useGLTF(garageAssetUrl);
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as Object3D & { isMesh?: boolean }).isMesh) {
        child.receiveShadow = true;
      }
    });
  }, [scene]);
  return <primitive object={scene} scale={1.5} position={[2.898, 1.848, 1.413]} />;
}

function ReflectionEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl as WebGLRenderer);
    const environmentScene = new RoomEnvironment();
    const previous = scene.environment;
    const texture = generator.fromScene(environmentScene, 0.04).texture;
    scene.environment = texture;
    return () => {
      scene.environment = previous;
      texture.dispose();
      environmentScene.dispose();
      generator.dispose();
    };
  }, [gl, scene]);
  return null;
}

function GarageShell() {
  const beams = [-6.4, -3.2, 0, 3.2, 6.4];
  return (
    <group>
      <mesh receiveShadow position={[0, 3.1, 0]}>
        <boxGeometry args={[17, 7.2, 18]} />
        <meshStandardMaterial side={BackSide} color="#17191c" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh receiveShadow position={[0, -0.09, 0]}>
        <boxGeometry args={[15.2, 0.18, 16.2]} />
        <meshStandardMaterial color="#161719" roughness={0.86} metalness={0.08} />
      </mesh>
      <mesh receiveShadow position={[0, 6.35, 0]}>
        <boxGeometry args={[15.2, 0.25, 15.4]} />
        <meshStandardMaterial color="#121315" roughness={0.8} />
      </mesh>
      {beams.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 6.08, 0]}><boxGeometry args={[14.2, 0.2, 0.32]} /><meshStandardMaterial color="#0b0c0d" metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[0, 5.86, 0]}><boxGeometry args={[5.8, 0.035, 0.11]} /><meshStandardMaterial color="#edf2f2" emissive="#dcebea" emissiveIntensity={4.2} /></mesh>
        </group>
      ))}
      <group position={[0, 0, -2.72]}>
        <mesh receiveShadow position={[-5.15, 2.75, 0]}>
          <boxGeometry args={[0.34, 5.7, 0.4]} />
          <meshStandardMaterial color="#17191b" metalness={0.62} roughness={0.42} />
        </mesh>
        <mesh receiveShadow position={[5.15, 2.75, 0]}>
          <boxGeometry args={[0.34, 5.7, 0.4]} />
          <meshStandardMaterial color="#17191b" metalness={0.62} roughness={0.42} />
        </mesh>
        <mesh receiveShadow position={[0, 5.48, 0]}>
          <boxGeometry args={[10.65, 0.32, 0.4]} />
          <meshStandardMaterial color="#17191b" metalness={0.62} roughness={0.42} />
        </mesh>
        <mesh position={[0, 5.28, 0.23]}>
          <boxGeometry args={[6.4, 0.045, 0.08]} />
          <meshStandardMaterial color="#d9eeee" emissive="#8edce3" emissiveIntensity={3.2} />
        </mesh>
      </group>
    </group>
  );
}

function StudioLighting({ quality }: { quality: "low" | "high" }) {
  return (
    <>
      <ambientLight intensity={0.12} color="#b9c7c9" />
      <hemisphereLight intensity={0.4} color="#e7f3f2" groundColor="#101316" />
      <directionalLight castShadow={quality === "high"} position={[-4, 7, 5]} intensity={1.4} color="#eaf4f3" shadow-mapSize={[1024, 1024]} />
      <spotLight castShadow={quality === "high"} position={[4, 5, 3]} angle={0.48} penumbra={0.8} intensity={70} distance={14} color="#91d9e7" />
      <spotLight position={[-4, 3.5, -4]} angle={0.6} penumbra={0.85} intensity={52} distance={12} color="#d8f5f1" />
      <pointLight position={[-3.2, 1.35, 0.5]} intensity={18} distance={6.5} color="#58c8dc" />
      <pointLight position={[0, 1.1, -4.5]} intensity={24} distance={7} color="#d51f2d" />
    </>
  );
}

function CameraRig({ progress, projected }: ExperienceRefs) {
  const { camera, size } = useThree();
  const isMobile = useIsMobile();
  const smoothProgress = useRef(0);
  const lookAt = useRef(new Vector3());
  const anchor = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    smoothProgress.current = MathUtils.damp(smoothProgress.current, progress.current, 5.5, delta);
    const shot = interpolateShot(smoothProgress.current, isMobile ? MOBILE_SHOTS : DESKTOP_SHOTS);
    camera.position.lerp(shot.position, 1 - Math.exp(-6.5 * delta));
    lookAt.current.lerp(shot.target, 1 - Math.exp(-7.2 * delta));
    camera.lookAt(lookAt.current);
    camera.rotateZ(shot.bank);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = MathUtils.damp(perspective.fov, shot.fov, 6, delta);
    perspective.updateProjectionMatrix();

    anchor.set(...HOTSPOTS[shot.id]).project(camera);
    projected.current.x = (anchor.x * 0.5 + 0.5) * size.width;
    projected.current.y = (-anchor.y * 0.5 + 0.5) * size.height;
    projected.current.visible = anchor.z > -1 && anchor.z < 1;
  });
  return null;
}

function World(props: SceneProps) {
  return (
    <>
      <color attach="background" args={["#08090a"]} />
      <fog attach="fog" args={["#08090a", 10, 19]} />
      <GarageShell />
      <Suspense fallback={null}><SuppliedGarage /></Suspense>
      <Suspense fallback={null}><Vehicle /></Suspense>
      <ReflectionEnvironment />
      <StudioLighting quality={props.quality} />
      <ContactShadows position={[0, 0.115, 0]} opacity={0.65} scale={7} blur={2.8} far={4} resolution={props.quality === "high" ? 512 : 256} frames={1} />
      <CameraRig progress={props.progress} projected={props.projected} />
    </>
  );
}

export default function NissanScene(props: SceneProps) {
  return (
    <Canvas
      shadows={props.quality === "high"}
      dpr={props.quality === "high" ? [1, 1.4] : 1}
      camera={{ position: [-4.4, 1.7, 5.15], fov: 40, near: 0.08, far: 40 }}
      gl={{ antialias: props.quality === "high", powerPreference: "high-performance", preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 1; }}
    >
      <World {...props} />
    </Canvas>
  );
}

useGLTF.preload(carAssetUrl);
useGLTF.preload(garageAssetUrl);