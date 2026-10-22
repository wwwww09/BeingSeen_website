import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import {
  lerp,
  lerpJoints,
  runPose,
  sitPose,
  smoothstep,
  type Joints,
  type Vec3,
} from './pose'

const MODEL_URL = '/models/human.glb'
const TARGET_POINTS = 120_000
const STAR_COLORS = ['#6f8dff', '#8fa7ff', '#c9d6ff', '#efe9df', '#d8c4ff', '#ffc9e0', '#ffcf9a']

const BONE_NAMES = [
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'neck_01',
  'Head',
  'clavicle_l',
  'upperarm_l',
  'lowerarm_l',
  'hand_l',
  'clavicle_r',
  'upperarm_r',
  'lowerarm_r',
  'hand_r',
  'thigh_l',
  'calf_l',
  'foot_l',
  'ball_l',
  'thigh_r',
  'calf_r',
  'foot_r',
  'ball_r',
] as const

type BoneName = (typeof BONE_NAMES)[number]

interface MeshSurface {
  mesh: THREE.SkinnedMesh
  position: THREE.BufferAttribute
  skinIndex: THREE.BufferAttribute
  skinWeight: THREE.BufferAttribute
  index: THREE.BufferAttribute | null
  triangles: number
  cumulative: Float64Array
  area: number
}

function tokenColor(): THREE.Color {
  const color = new THREE.Color(STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)])
  // A few brighter points so the bloom catches highlights.
  const boost = Math.random() < 0.08 ? 1.25 : 0.45 + Math.random() * 0.35
  return color.multiplyScalar(boost)
}

function buildSurfaceData(scene: THREE.Object3D): MeshSurface[] {
  const meshes: THREE.SkinnedMesh[] = []
  scene.traverse((object) => {
    const skinned = object as THREE.SkinnedMesh
    if (skinned.isSkinnedMesh) meshes.push(skinned)
  })

  const surfaces: MeshSurface[] = []
  meshes.forEach((mesh) => {
    const geometry = mesh.geometry as THREE.BufferGeometry
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const skinIndex = geometry.getAttribute('skinIndex') as THREE.BufferAttribute
    const skinWeight = geometry.getAttribute('skinWeight') as THREE.BufferAttribute
    if (!position || !skinIndex || !skinWeight) return

    const index = geometry.index as THREE.BufferAttribute | null
    const triangles = index ? index.count / 3 : position.count / 3
    const cumulative = new Float64Array(triangles)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const ab = new THREE.Vector3()
    const ac = new THREE.Vector3()
    let total = 0

    for (let t = 0; t < triangles; t++) {
      const ia = index ? index.getX(t * 3) : t * 3
      const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1
      const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2
      a.fromBufferAttribute(position, ia)
      b.fromBufferAttribute(position, ib)
      c.fromBufferAttribute(position, ic)
      ab.subVectors(b, a)
      ac.subVectors(c, a)
      total += ab.cross(ac).length() * 0.5
      cumulative[t] = total
    }

    if (total > 0) surfaces.push({ mesh, position, skinIndex, skinWeight, index, triangles, cumulative, area: total })
  })

  return surfaces
}

function buildPointGeometry(scene: THREE.Object3D): THREE.BufferGeometry {
  const surfaces = buildSurfaceData(scene)
  const totalArea = surfaces.reduce((sum, surface) => sum + surface.area, 0)
  const counts = surfaces.map((surface) =>
    Math.max(1_500, Math.round((TARGET_POINTS * surface.area) / Math.max(totalArea, 0.0001))),
  )
  const total = counts.reduce((sum, count) => sum + count, 0)

  const positions = new Float32Array(total * 3)
  const skins = new Float32Array(total * 4)
  const weights = new Float32Array(total * 4)
  const colors = new Float32Array(total * 3)
  const sizes = new Float32Array(total)
  const phases = new Float32Array(total)

  let cursor = 0
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const point = new THREE.Vector3()

  surfaces.forEach((surface, surfaceIndex) => {
    const count = counts[surfaceIndex]
    const { position, skinIndex, skinWeight, index, triangles, cumulative, area, mesh } = surface

    for (let i = 0; i < count; i++) {
      const target = Math.random() * area
      let lo = 0
      let hi = triangles - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cumulative[mid] < target) lo = mid + 1
        else hi = mid
      }

      const ia = index ? index.getX(lo * 3) : lo * 3
      const ib = index ? index.getX(lo * 3 + 1) : lo * 3 + 1
      const ic = index ? index.getX(lo * 3 + 2) : lo * 3 + 2
      a.fromBufferAttribute(position, ia)
      b.fromBufferAttribute(position, ib)
      c.fromBufferAttribute(position, ic)

      let u = Math.random()
      let v = Math.random()
      if (u + v > 1) {
        u = 1 - u
        v = 1 - v
      }
      const w0 = 1 - u - v
      const w1 = u
      const w2 = v

      point.set(
        a.x * w0 + b.x * w1 + c.x * w2,
        a.y * w0 + b.y * w1 + c.y * w2,
        a.z * w0 + b.z * w1 + c.z * w2,
      )
      point.applyMatrix4(mesh.bindMatrix)

      const dominant = w0 >= w1 && w0 >= w2 ? ia : w1 >= w2 ? ib : ic
      let sum = 0
      const w = [0, 0, 0, 0]
      for (let k = 0; k < 4; k++) {
        const weight = skinWeight.getComponent(dominant, k)
        w[k] = weight
        sum += weight
      }
      if (sum < 0.0001) {
        w[0] = 1
        sum = 1
      }

      const p = cursor * 3
      const s = cursor * 4
      positions[p] = point.x
      positions[p + 1] = point.y
      positions[p + 2] = point.z
      for (let k = 0; k < 4; k++) {
        skins[s + k] = skinIndex.getComponent(dominant, k)
        weights[s + k] = w[k] / sum
      }

      const color = tokenColor()
      colors[p] = color.r
      colors[p + 1] = color.g
      colors[p + 2] = color.b

      const halo = Math.random() < 0.06
      sizes[cursor] = halo ? 0.018 + Math.random() * 0.012 : 0.005 + Math.random() * 0.005
      phases[cursor] = Math.random() * Math.PI * 2
      cursor++
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skins, 4))
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3)

  return geometry
}

const vertexShader = /* glsl */ `
  uniform sampler2D boneTexture;
  uniform vec2 boneTextureSize;
  uniform float uTime;
  uniform float uPixelRatio;

  attribute vec4 skinIndex;
  attribute vec4 skinWeight;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vAlpha;

  mat4 getBoneMatrix(const in float i) {
    float j = i * 4.0;
    float x = mod(j, boneTextureSize.x);
    float y = floor(j / boneTextureSize.x);
    vec4 v1 = texelFetch(boneTexture, ivec2(x, y), 0);
    vec4 v2 = texelFetch(boneTexture, ivec2(x + 1.0, y), 0);
    vec4 v3 = texelFetch(boneTexture, ivec2(x + 2.0, y), 0);
    vec4 v4 = texelFetch(boneTexture, ivec2(x + 3.0, y), 0);
    return mat4(v1, v2, v3, v4);
  }

  void main() {
    mat4 boneMatX = getBoneMatrix(skinIndex.x);
    mat4 boneMatY = getBoneMatrix(skinIndex.y);
    mat4 boneMatZ = getBoneMatrix(skinIndex.z);
    mat4 boneMatW = getBoneMatrix(skinIndex.w);

    vec4 skinned = boneMatX * vec4(position, 1.0) * skinWeight.x;
    skinned += boneMatY * vec4(position, 1.0) * skinWeight.y;
    skinned += boneMatZ * vec4(position, 1.0) * skinWeight.z;
    skinned += boneMatW * vec4(position, 1.0) * skinWeight.w;

    vec4 mvPosition = modelViewMatrix * skinned;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (760.0 / max(1.0, -mvPosition.z)) * uPixelRatio;

    vColor = aColor;
    vAlpha = 0.7 + 0.3 * sin(uTime * 1.5 + aPhase);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, r);
    alpha *= alpha;
    gl_FragColor = vec4(vColor, alpha * vAlpha);
  }
`

function toVector3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2])
}

function between(a: Vec3, b: Vec3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  )
}

/**
 * A real, skinned 3D human surface sampled into star points.
 *
 * The Superhero mesh is CC0 and is only used for its geometry and skin
 * weights. The visible object is a Points cloud; the original mesh is hidden.
 * The GPU samples the skeleton's bone texture, so the point cloud deforms with
 * the real human rig rather than with a capsule approximation.
 *
 * The pose is authored by aiming the real bones at target joints: a frontal
 * run toward the camera, then a seated slump as the camera pulls back.
 */
export function HumanFigure({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  const blackHole = useRef<THREE.Group>(null)
  const bones = useRef<Partial<Record<BoneName, THREE.Object3D>>>({})
  const restQuaternions = useRef(new Map<THREE.Object3D, THREE.Quaternion>())
  const skeleton = useRef<THREE.Skeleton | null>(null)
  const headRestInGroup = useRef<THREE.Quaternion | null>(null)
  const gl = useThree((state) => state.gl)
  const rootScene = useThree((state) => state.scene)

  const { scene } = useGLTF(MODEL_URL)

  const geometry = useMemo(() => buildPointGeometry(scene), [scene])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          boneTexture: { value: null },
          boneTextureSize: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const points = useMemo(() => new THREE.Points(geometry, material), [geometry, material])

  useEffect(() => {
    let skinned: THREE.SkinnedMesh | null = null
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) mesh.visible = false
      if (!skinned && (object as THREE.SkinnedMesh).isSkinnedMesh) {
        skinned = object as THREE.SkinnedMesh
      }
    })

    if (!skinned) return

    const body = skinned as THREE.SkinnedMesh
    body.skeleton.computeBoneTexture()
    skeleton.current = body.skeleton
    material.uniforms.boneTexture.value = body.skeleton.boneTexture
    if (body.skeleton.boneTexture) {
      const image = body.skeleton.boneTexture.image as { width: number; height: number }
      material.uniforms.boneTextureSize.value.set(image.width, image.height)
    }

    const found: Partial<Record<BoneName, THREE.Object3D>> = {}
    const rest = new Map<THREE.Object3D, THREE.Quaternion>()
    BONE_NAMES.forEach((name) => {
      const bone = scene.getObjectByName(name)
      if (bone) {
        found[name] = bone
        rest.set(bone, bone.quaternion.clone())
      }
    })
    bones.current = found
    restQuaternions.current = rest

    if (found.Head && group.current) {
      group.current.updateMatrixWorld(true)
      const headWorld = found.Head.getWorldQuaternion(new THREE.Quaternion())
      const groupWorld = group.current.getWorldQuaternion(new THREE.Quaternion())
      headRestInGroup.current = groupWorld.invert().multiply(headWorld)
    }

    rootScene.add(points)
    return () => {
      rootScene.remove(points)
    }
  }, [scene, material, points, rootScene])

  useFrame((state) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const figure = group.current
    if (!figure) return

    const runIn = smoothstep(Math.min(1, p / 0.45))
    figure.position.z = lerp(-1.8, 0.2, runIn)
    figure.rotation.y = -0.08
    figure.updateMatrixWorld(true)

    const sit = smoothstep((p - 0.55) / 0.35)
    const runPhase = 0.9 + Math.min(p, 0.5) * 30
    const pose: Joints = lerpJoints(runPose(runPhase), sitPose, sit)

    const b = bones.current
    const rest = restQuaternions.current
    if (!b.pelvis || !b.spine_01 || !b.spine_02 || !b.spine_03 || !b.neck_01 || !b.Head) return

    // Reset the authored bones to the bind pose before re-aiming.
    rest.forEach((quaternion, bone) => {
      bone.quaternion.copy(quaternion)
    })

    const pelvis = b.pelvis
    const parent = pelvis.parent
    if (!parent) return
    const targetHips = figure.localToWorld(toVector3(pose.hips))
    pelvis.position.copy(parent.worldToLocal(targetHips.clone()))
    figure.updateMatrixWorld(true)

    const inverseGroup = new THREE.Matrix4().copy(figure.matrixWorld).invert()

    const aim = (bone: THREE.Object3D | undefined, child: THREE.Object3D | undefined, target: THREE.Vector3) => {
      if (!bone || !child) return
      const bonePos = bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseGroup)
      const childPos = child.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseGroup)
      const current = childPos.sub(bonePos)
      if (current.lengthSq() < 0.0000001) return
      const desired = target.clone().sub(bonePos)
      if (desired.lengthSq() < 0.0000001) return
      current.normalize()
      desired.normalize()
      const rotation = new THREE.Quaternion().setFromUnitVectors(current, desired)
      const world = bone.getWorldQuaternion(new THREE.Quaternion())
      const parentWorld = bone.parent?.getWorldQuaternion(new THREE.Quaternion())
      if (!parentWorld) return
      world.premultiply(rotation)
      bone.quaternion.copy(parentWorld.invert().multiply(world))
      bone.updateMatrixWorld(true)
    }

    // Spine: three segments between hips and chest, then the neck. The pelvis
    // keeps its rest orientation; aiming it as well twists the whole torso.
    aim(b.spine_01, b.spine_02, between(pose.hips, pose.chest, 0.35))
    aim(b.spine_02, b.spine_03, between(pose.hips, pose.chest, 0.68))
    aim(b.spine_03, b.neck_01, toVector3(pose.neck))
    aim(b.neck_01, b.Head, toVector3(pose.head))

    // Keep the head upright and facing the camera relative to the figure,
    // independent of the neck aim's roll.
    if (b.Head && headRestInGroup.current) {
      const groupWorld = figure.getWorldQuaternion(new THREE.Quaternion())
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -sit * 0.22)
      const desiredHead = groupWorld.multiply(headRestInGroup.current.clone()).multiply(tilt)
      const neckWorld = b.Head.parent?.getWorldQuaternion(new THREE.Quaternion())
      if (neckWorld) {
        b.Head.quaternion.copy(neckWorld.invert().multiply(desiredHead))
        b.Head.updateMatrixWorld(true)
      }
    }

    // Arms.
    aim(b.clavicle_l, b.upperarm_l, toVector3(pose.shoulderL))
    aim(b.upperarm_l, b.lowerarm_l, toVector3(pose.elbowL))
    aim(b.lowerarm_l, b.hand_l, toVector3(pose.handL))
    aim(b.clavicle_r, b.upperarm_r, toVector3(pose.shoulderR))
    aim(b.upperarm_r, b.lowerarm_r, toVector3(pose.elbowR))
    aim(b.lowerarm_r, b.hand_r, toVector3(pose.handR))

    // Legs.
    aim(b.thigh_l, b.calf_l, toVector3(pose.kneeL))
    aim(b.calf_l, b.foot_l, toVector3(pose.footL))
    aim(b.foot_l, b.ball_l, new THREE.Vector3(pose.footL[0], pose.footL[1] - 0.01, pose.footL[2] + 0.12))
    aim(b.thigh_r, b.calf_r, toVector3(pose.kneeR))
    aim(b.calf_r, b.foot_r, toVector3(pose.footR))
    aim(b.foot_r, b.ball_r, new THREE.Vector3(pose.footR[0], pose.footR[1] - 0.01, pose.footR[2] + 0.12))

    figure.updateMatrixWorld(true)
    skeleton.current?.update()
    if (skeleton.current?.boneTexture) skeleton.current.boneTexture.needsUpdate = true

    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()

    if (blackHole.current) {
      const scale = smoothstep((p - 0.72) / 0.24) * 0.11
      blackHole.current.position.set(pose.chest[0], pose.chest[1] - 0.01, pose.chest[2] + 0.1)
      blackHole.current.scale.setScalar(Math.max(0.0001, scale))
      blackHole.current.visible = scale > 0.004
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
      <group ref={blackHole} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#010103" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.01, 0.0035, 6, 128]} />
          <meshBasicMaterial color="#3c5578" toneMapped={false} transparent opacity={0.22} />
        </mesh>
      </group>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
