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

  attribute float aRole;
  attribute float aWarm;
  attribute float aSeed;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float holeSpin = uTime * 0.35 * uHole;
    float cs = cos(holeSpin);
    float sn = sin(holeSpin);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;
    float head = smoothstep(1.4, 1.62, p.y);
    p.x += sin(uTime * 0.9 + 0.4) * 0.03 * head * uHuman;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float isCrowd = step(2.5, aRole);
    float isCore = step(0.5, aRole) * (1.0 - step(1.5, aRole));
    float isBeam = step(1.5, aRole) * (1.0 - step(2.5, aRole));

    float size = 0.0115;
    size += uMag * 0.006;
    size += uFlash * (isBeam * 0.012 + 0.0015);
    size -= isCrowd * 0.0018;
    size -= uStar * 0.0012;
    gl_PointSize = size * (620.0 / max(0.1, -mv.z)) * uPixelRatio;

    vec3 humanColor = mix(vec3(0.42, 0.45, 0.5), vec3(0.68, 0.57, 0.44), uWarm);
    vec3 holeColor = vec3(1.0, 0.55, 0.28);
    vec3 magColor = mix(vec3(0.5, 0.68, 1.0), vec3(1.0), uFlash * 0.85);
    vec3 crowdColor = mix(vec3(0.52, 0.62, 1.0), vec3(1.0, 0.76, 0.48), aWarm);
    vec3 starColor = mix(vec3(0.5, 0.68, 1.0), vec3(0.84, 0.93, 1.0), aWarm * 0.55);

    vec3 color =
      humanColor * uHuman +
      holeColor * uHole +
      magColor * uMag +
      crowdColor * uCrowd +
      starColor * uStar;
    float holeRadius = length(vec2(p.x, p.z));
    float photon = exp(-pow((holeRadius - 0.99) / 0.05, 2.0));
    color += uHole * photon * vec3(1.0, 0.82, 0.58) * 0.9;
    color *= 0.9 + 0.1 * sin(uTime * 1.7 + aSeed);
    vColor = color;

    float alpha;
    if (isCrowd > 0.5) {
      alpha = uCrowd * 0.55 + uStar * 0.75;
    } else {
      alpha =
        uHuman * mix(0.46, 0.015, uCrowd) +
        uMag * 0.9 +
        uStar * 0.72 +
        uHole * mix(0.34, 0.0, isCore) +
        uHole * 0.16 * isBeam +
        uHole * photon * 0.5;
    }
    alpha += uFlash * (isBeam * 0.9 + 0.12);
    vAlpha = alpha * (0.8 + 0.2 * sin(uTime * 2.0 + aSeed * 1.7));
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

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
    const e5 = smoothstep(Math.min(1, Math.max(0, (p - 0.8) / 0.2)))

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
          ax = targets.run[o]; ay = targets.run[o + 1]; az = targets.run[o + 2]
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
        const swirl = Math.sin(e2 * Math.PI) * 1.15 * (0.6 + targets.seed[i])
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
        (1 - smoothstep(THREE.MathUtils.clamp((p - 0.8) / 0.05, 0, 1)))
    const holeW =
      smoothstep(THREE.MathUtils.clamp((p - 0.2) / 0.04, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.4) / 0.05, 0, 1)))
    const magW =
      smoothstep(THREE.MathUtils.clamp((p - 0.38) / 0.04, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.56) / 0.04, 0, 1)))
    const crowdW =
      smoothstep(THREE.MathUtils.clamp((p - 0.7) / 0.06, 0, 1)) *
      (1 - smoothstep(THREE.MathUtils.clamp((p - 0.8) / 0.05, 0, 1)))
    const starW = smoothstep(THREE.MathUtils.clamp((p - 0.8) / 0.06, 0, 1))
    const flash = Math.exp(-Math.pow((p - 0.5) / 0.019, 2))
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
