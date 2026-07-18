import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';

const VARIANT_CONFIG = {
  hero:  { shapeCount: 4, sparkleCount: 70, spread: 9, cameraZ: 7, sparkleSize: 2 },
  auth:  { shapeCount: 3, sparkleCount: 40, spread: 6, cameraZ: 6, sparkleSize: 1.6 },
  brand: { shapeCount: 1, sparkleCount: 0,  spread: 0, cameraZ: 3, sparkleSize: 0 },
};

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Deterministic layout so shapes don't jump around on re-render. */
function seededShapes(count, spread) {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    kind: i % 2 === 0 ? 'ico' : 'octa',
    position: [
      (rand() - 0.5) * spread,
      (rand() - 0.5) * spread * 0.6,
      (rand() - 0.5) * spread * 0.5,
    ],
    scale: 0.55 + rand() * 0.7,
    speed: 0.6 + rand() * 0.8,
  }));
}

function DriftingShape({ kind, position, scale, speed }) {
  const mesh = useRef();
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * speed * 0.12;
    mesh.current.rotation.y += delta * speed * 0.18;
  });
  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1.4}>
      <mesh ref={mesh} position={position} scale={scale}>
        {kind === 'ico' ? <icosahedronGeometry args={[1, 0]} /> : <octahedronGeometry args={[1, 0]} />}
        <meshStandardMaterial
          color="#6366f1"
          emissive="#4f46e5"
          emissiveIntensity={0.4}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
    </Float>
  );
}

function Scene({ variant }) {
  const cfg = VARIANT_CONFIG[variant];
  const shapes = useMemo(() => seededShapes(cfg.shapeCount, cfg.spread), [cfg.shapeCount, cfg.spread]);
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.1} color="#8b5cf6" />
      <pointLight position={[-4, -2, -3]} intensity={0.6} color="#3b82f6" />
      {shapes.map(({ key, ...s }) => <DriftingShape key={key} {...s} />)}
      {cfg.sparkleCount > 0 && (
        <Sparkles
          count={cfg.sparkleCount}
          scale={cfg.spread * 1.4}
          size={cfg.sparkleSize}
          speed={0.25}
          color="#a5b4fc"
          opacity={0.6}
        />
      )}
    </>
  );
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? (this.props.fallback || null) : this.props.children;
  }
}

/**
 * Ambient decorative 3D background. Purely visual — no pointer interaction.
 * Renders `fallback` (or nothing) when reduced-motion is requested, WebGL is
 * unavailable, or the canvas errors, so pages never depend on it to render.
 */
export default function AmbientBackground({ variant = 'auth', className = '', fallback = null }) {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setEnabled(!prefersReducedMotion() && supportsWebGL());
  }, []);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!enabled) return fallback;

  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.auth;

  return (
    <div className={`ambient-canvas ambient-canvas--${variant} ${className}`.trim()}>
      <CanvasErrorBoundary fallback={fallback}>
        <Canvas
          dpr={[1, 1.5]}
          frameloop={visible ? 'always' : 'never'}
          camera={{ position: [0, 0, cfg.cameraZ], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Scene variant={variant} />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
