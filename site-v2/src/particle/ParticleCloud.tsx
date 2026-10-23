import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { lerp, smoothstep } from '../figure/pose'
import { buildTargets, HUMAN_COUNT, TOTAL } from './targets'

const vertexShader = /* glsl */ `
  uniform float uHuman;
  uniform float uHole;
  uniform float uMag;
  uniform float uCrowd;
  uniform float uStar;
  uniform float uFlash;
  uniform float uWarm;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTear;
  uniform float uJitter;
  uniform float uImplode;
  uniform float uRipple;
  uniform float uDiskSpeed;
  uniform float uNoise;

  attribute float aRole;
  attribute float aWarm;
  attribute float aSeed;
  attribute float aTrail;
  attribute float aArm;

  varying vec3 vColor;
  varying float vAlpha;


vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

  void main() {
    vec3 p = position;
    float crowd = step(2.5, aRole);

    // Stage 1: edge particles trail away like sand; the reaching arm dissolves.
    float trail = aTrail * uTear;
    p.z -= trail * 1.35;
    p.x -= trail * 0.28;
    p.z += trail * 0.2 * (0.5 + 0.5 * sin(uTime * 11.0 + aSeed * 4.0));
    p.y -= trail * 0.06;
    float arm = aArm * uTear;
    p += vec3(arm * 0.12, arm * 0.05, arm * 0.18) * (0.4 + 0.6 * sin(uTime * 19.0 + aSeed * 7.0));

    // Stage 1: high-frequency struggle jitter.
    vec3 jn = vec3(
      snoise(p * 8.0 + vec3(0.0, 0.0, uTime * 9.0)),
      snoise(p * 8.0 + vec3(13.0, 7.0, 5.0) + uTime * 9.0),
      snoise(p * 8.0 + vec3(4.0, 17.0, 9.0) + uTime * 9.0)
    );
    p += jn * uJitter;

    // Stage 1 -> 2: violent implosion.
    p = mix(p, vec3(0.0, 1.0, 0.0), uImplode);

    // Continuous organic stardust displacement.
    vec3 bodyNoise = vec3(
      snoise(p * 1.7 + vec3(0.0, 0.0, uTime * 0.09)),
      snoise(p * 1.7 + vec3(31.0, 7.0, 11.0) + uTime * 0.09),
      snoise(p * 1.7 + vec3(4.0, 17.0, 29.0) + uTime * 0.09)
    );
    p += bodyNoise * uNoise;

    // barely-holding-together stardust shimmer (Stage 1 human only)
    float floatN = snoise(p * 3.2 + vec3(0.0, uTime * 0.42, 0.0));
    p += vec3(floatN, floatN * 0.65, -floatN) * 0.008 * uHuman;

    // Stage 2/3: accretion disk spins faster as the black hole breaks.
    float holeSpin = uTime * 0.22 * uHole * uDiskSpeed;
    float cs = cos(holeSpin);
    float sn = sin(holeSpin);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;

    // Stage 4: crowd gravitational-wave ripples.
    float dist = length(p.xy - vec2(0.0, 1.0));
    float wave = sin(dist * 10.0 - uTime * 6.0 + aSeed * 2.0);
    p.z += wave * uRipple * crowd * (0.4 + aSeed * 0.6);
    p.xy += normalize(p.xy - vec2(0.0, 1.0) + 0.001) * wave * uRipple * 0.12 * crowd;

    // Stage 4 head sway.
    float head = smoothstep(1.4, 1.62, p.y);
    p.x += sin(uTime * 0.9 + 0.4) * 0.03 * head * uHuman;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float isCrowd = step(2.5, aRole);
    float isCore = step(0.5, aRole) * (1.0 - step(1.5, aRole));
    float isBeam = step(1.5, aRole) * (1.0 - step(2.5, aRole));

    float size = 0.0052;
    size += uMag * 0.006;
    size += uFlash * (isBeam * 0.012 + 0.0015);
    size -= isCrowd * 0.0018;
    size -= uStar * 0.0012;
    gl_PointSize = size * (620.0 / max(0.1, -mv.z)) * uPixelRatio * (0.92 + 0.1 * sin(uTime * 2.7 + aSeed * 9.0) * uHuman);

    vec3 pureWhite = vec3(0.94, 0.96, 1.0);
    vec3 paleBlue = vec3(0.72, 0.82, 0.96);
    vec3 champagne = vec3(0.98, 0.90, 0.78);
    vec3 humanColor = mix(mix(pureWhite, paleBlue, 0.35), champagne, 0.15 + aWarm * 0.1);
    float holeRadius = length(vec2(p.x, p.z));
    float diskHeat = smoothstep(1.08, 0.94, holeRadius);
    vec3 holeColor = mix(vec3(0.58, 0.24, 0.06), vec3(1.0, 0.64, 0.2), diskHeat);
    vec3 magColor = mix(vec3(0.28, 0.8, 1.0), vec3(0.84, 0.98, 1.0), uFlash);
    vec3 crowdColor = mix(vec3(0.52, 0.62, 1.0), vec3(1.0, 0.76, 0.48), aWarm);
    float starPick = fract(aSeed * 0.15915494309 + aWarm * 0.37);
    vec3 starBlue = vec3(0.6, 0.76, 1.0);
    vec3 starWhite = vec3(0.9, 0.94, 1.0);
    vec3 starGold = vec3(0.88, 0.83, 0.7);
    vec3 starColor = starPick < 0.45 ? starBlue : starPick < 0.8 ? starWhite : starGold;

    vec3 color =
      humanColor * uHuman +
      holeColor * uHole +
      magColor * uMag +
      crowdColor * uCrowd +
      starColor * uStar;
    float photon = exp(-pow((holeRadius - 0.99) / 0.05, 2.0));
    color += uHole * photon * vec3(0.95, 0.66, 0.3) * 0.42;
    color *= 0.9 + 0.1 * sin(uTime * 1.7 + aSeed);
    vColor = color;

    float alpha;
    if (isCrowd > 0.5) {
      alpha = uCrowd * 0.38 + uStar * 0.42;
    } else {
      alpha =
        uHuman * mix(0.28, 0.05, uCrowd) +
        uMag * 0.8 +
        uStar * 0.42 +
        uHole * mix(0.12, 0.0, isCore) +
        uHole * 0.08 * isBeam +
        uHole * photon * 0.12;
    }
    alpha += uFlash * (isBeam * 0.85 + 0.08);
    float edgeCut = clamp(trail * 0.8 + arm * 0.9, 0.0, 1.0);
    float visibility = 1.0 - smoothstep(0.12, 1.0, edgeCut);
    vAlpha = alpha * (0.84 + 0.16 * sin(uTime * 2.2 + aSeed * 1.7)) * visibility;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;


vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);
    float flare = pow(max(0.0, 1.0 - d * 2.0), 2.0);
    float a = vAlpha * (core * 0.9 + flare * 0.25);
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

/**
 * One single THREE.Points cloud for the whole film. Every stage is a target
 * position array; scroll interpolates the live position attribute between
 * those arrays. There are no meshes, no models and no second 3D object.
 */
export function ParticleCloud({ progress }: { progress: MotionValue<number> }) {
  const compact = useThree((state) => state.size.width < 900)
  const points = useRef<THREE.Points>(null)
  const targets = useMemo(() => buildTargets(), [])
  const position = useMemo(() => new Float32Array(TOTAL * 3), [])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(position, 3))
    g.setAttribute('aRole', new THREE.BufferAttribute(targets.role, 1))
    g.setAttribute('aWarm', new THREE.BufferAttribute(targets.warm, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(targets.seed, 1))
    g.setAttribute('aTrail', new THREE.BufferAttribute(targets.trail, 1))
    g.setAttribute('aArm', new THREE.BufferAttribute(targets.arm, 1))
    return g
  }, [position, targets])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uHuman: { value: 1 },
        uHole: { value: 0 },
        uMag: { value: 0 },
        uCrowd: { value: 0 },
        uStar: { value: 0 },
        uFlash: { value: 0 },
        uWarm: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uTear: { value: 0.65 },
        uJitter: { value: 0 },
        uImplode: { value: 0 },
        uRipple: { value: 0 },
        uDiskSpeed: { value: 1 },
        uNoise: { value: 0.018 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame((state) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const e1 = smoothstep(Math.min(1, p / 0.2))
    const e2 = smoothstep(Math.min(1, Math.max(0, (p - 0.2) / 0.2)))
    const e3 = smoothstep(Math.min(1, Math.max(0, (p - 0.4) / 0.2)))
    const e4 = smoothstep(Math.min(1, Math.max(0, (p - 0.6) / 0.08)))
    const e5 = smoothstep(Math.min(1, Math.max(0, (p - 0.95) / 0.05)))

    for (let i = 0; i < TOTAL; i++) {
      const o = i * 3
      let ax: number
      let ay: number
      let az: number
      let bx: number
      let by: number
      let bz: number
      let t: number

      if (i < HUMAN_COUNT) {
        if (p < 0.2) {
          ax = targets.stand[o]; ay = targets.stand[o + 1]; az = targets.stand[o + 2]
          bx = targets.ball[o]; by = targets.ball[o + 1]; bz = targets.ball[o + 2]
          t = e1
        } else if (p < 0.4) {
          ax = targets.ball[o]; ay = targets.ball[o + 1]; az = targets.ball[o + 2]
          bx = targets.hole[o]; by = targets.hole[o + 1]; bz = targets.hole[o + 2]
          t = e2
        } else if (p < 0.6) {
          ax = targets.hole[o]; ay = targets.hole[o + 1]; az = targets.hole[o + 2]
          bx = targets.magnetar[o]; by = targets.magnetar[o + 1]; bz = targets.magnetar[o + 2]
          t = e3
        } else if (p < 0.8) {
          ax = targets.magnetar[o]; ay = targets.magnetar[o + 1]; az = targets.magnetar[o + 2]
          bx = targets.stand[o]; by = targets.stand[o + 1]; bz = targets.stand[o + 2]
          t = e4
        } else {
          ax = targets.stand[o]; ay = targets.stand[o + 1]; az = targets.stand[o + 2]
          bx = targets.star[o]; by = targets.star[o + 1]; bz = targets.star[o + 2]
          t = e5
        }
      } else if (p < 0.6) {
        ax = targets.run[o]; ay = targets.run[o + 1]; az = targets.run[o + 2]
        bx = ax; by = ay; bz = az
        t = 0
      } else if (p < 0.8) {
        ax = targets.run[o]; ay = targets.run[o + 1]; az = targets.run[o + 2]
        bx = targets.crowd[o]; by = targets.crowd[o + 1]; bz = targets.crowd[o + 2]
        t = e4
      } else {
        ax = targets.crowd[o]; ay = targets.crowd[o + 1]; az = targets.crowd[o + 2]
        bx = targets.star[o]; by = targets.star[o + 1]; bz = targets.star[o + 2]
        t = e5
      }

      let x = lerp(ax, bx, t)
      const y = lerp(ay, by, t)
      let z = lerp(az, bz, t)
      if (i < HUMAN_COUNT && p >= 0.2 && p < 0.4) {
        const radius = Math.hypot(x, z)
        const angle = Math.atan2(z, x)
        const spiral = Math.sin(THREE.MathUtils.clamp((p - 0.2) / 0.2, 0, 1) * Math.PI)
        const swirl = spiral * 1.2 * (0.6 + targets.seed[i])
        x = Math.cos(angle + swirl) * radius
        z = Math.sin(angle + swirl) * radius
      }
      position[o] = x
      position[o + 1] = y
      position[o + 2] = z
    }

    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
    attribute.needsUpdate = true

    const humanW =
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.16) / 0.08, 0, 1))) +
      smoothstep(THREE.MathUtils.clamp((p - 0.56) / 0.05, 0, 1)) *
        (1 - smoothstep(THREE.MathUtils.clamp((p - 0.95) / 0.03, 0, 1)))
    const holeW =
      smoothstep(THREE.MathUtils.clamp((p - 0.2) / 0.04, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.4) / 0.05, 0, 1)))
    const magW =
      smoothstep(THREE.MathUtils.clamp((p - 0.38) / 0.04, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.56) / 0.04, 0, 1)))
    const crowdW =
      smoothstep(THREE.MathUtils.clamp((p - 0.7) / 0.06, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.95) / 0.03, 0, 1)))
    const starW = smoothstep(THREE.MathUtils.clamp((p - 0.95) / 0.03, 0, 1))
    const flash = Math.exp(-Math.pow((p - 0.5) / 0.008, 2))
    const warm =
      smoothstep(THREE.MathUtils.clamp((p - 0.58) / 0.08, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.82) / 0.05, 0, 1)))

    material.uniforms.uHuman.value = humanW
    material.uniforms.uHole.value = holeW
    material.uniforms.uMag.value = magW
    material.uniforms.uCrowd.value = crowdW
    material.uniforms.uStar.value = starW
    material.uniforms.uFlash.value = flash
    material.uniforms.uWarm.value = warm
    const tear = 0
    const jitter = 0
    const implode = 0
    const ripple =
      smoothstep(THREE.MathUtils.clamp((p - 0.62) / 0.06, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.78) / 0.05, 0, 1))) *
      0.32
    const diskSpeed = 1 + 3 * smoothstep(THREE.MathUtils.clamp((p - 0.28) / 0.1, 0, 1))
    const noise = 0.018 * (1 - starW) + 0.006
    material.uniforms.uTear.value = tear
    material.uniforms.uJitter.value = jitter
    material.uniforms.uImplode.value = implode
    material.uniforms.uRipple.value = ripple
    material.uniforms.uDiskSpeed.value = diskSpeed
    material.uniforms.uNoise.value = noise
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uPixelRatio.value = Math.min(2, state.gl.getPixelRatio())
  })

  return (
    <points
      ref={points}
      geometry={geometry}
      material={material}
      position={[compact ? 0 : 0.7, 0, 0]}
      frustumCulled={false}
    />
  )
}
