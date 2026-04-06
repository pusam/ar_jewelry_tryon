import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), '..', 'uploads');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── 토러스 지오메트리 생성 ──
function createTorus(R, r, segments, tubeSegments) {
    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        for (let j = 0; j <= tubeSegments; j++) {
            const phi = (j / tubeSegments) * Math.PI * 2;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            const x = (R + r * cosPhi) * cosTheta;
            const y = (R + r * cosPhi) * sinTheta;
            const z = r * sinPhi;

            positions.push(x, y, z);

            const nx = cosPhi * cosTheta;
            const ny = cosPhi * sinTheta;
            const nz = sinPhi;
            normals.push(nx, ny, nz);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < tubeSegments; j++) {
            const a = i * (tubeSegments + 1) + j;
            const b = a + tubeSegments + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

// ── 구체 지오메트리 ──
function createSphere(radius, wSeg, hSeg) {
    const positions = [], normals = [], indices = [];
    for (let y = 0; y <= hSeg; y++) {
        const v = y / hSeg;
        const phi = v * Math.PI;
        for (let x = 0; x <= wSeg; x++) {
            const u = x / wSeg;
            const theta = u * Math.PI * 2;
            const px = radius * Math.sin(phi) * Math.cos(theta);
            const py = radius * Math.cos(phi);
            const pz = radius * Math.sin(phi) * Math.sin(theta);
            positions.push(px, py, pz);
            normals.push(px / radius, py / radius, pz / radius);
        }
    }
    for (let y = 0; y < hSeg; y++) {
        for (let x = 0; x < wSeg; x++) {
            const a = y * (wSeg + 1) + x;
            const b = a + wSeg + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

// ── 튜브(곡선) 지오메트리 ──
function createTube(curvePoints, radius, tubeSeg, radialSeg) {
    const positions = [], normals = [], indices = [];

    // 곡선 보간
    const pts = [];
    for (let i = 0; i <= tubeSeg; i++) {
        const t = i / tubeSeg;
        const idx = t * (curvePoints.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.min(lo + 1, curvePoints.length - 1);
        const frac = idx - lo;
        pts.push([
            curvePoints[lo][0] * (1 - frac) + curvePoints[hi][0] * frac,
            curvePoints[lo][1] * (1 - frac) + curvePoints[hi][1] * frac,
            curvePoints[lo][2] * (1 - frac) + curvePoints[hi][2] * frac
        ]);
    }

    for (let i = 0; i <= tubeSeg; i++) {
        const p = pts[i];
        // tangent
        const next = pts[Math.min(i + 1, tubeSeg)];
        const prev = pts[Math.max(i - 1, 0)];
        const tx = next[0] - prev[0], ty = next[1] - prev[1], tz = next[2] - prev[2];
        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        const T = [tx / tLen, ty / tLen, tz / tLen];

        // arbitrary normal
        let N;
        if (Math.abs(T[0]) < 0.9) N = [1, 0, 0];
        else N = [0, 1, 0];
        // cross T x N
        const B = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]];
        const bLen = Math.sqrt(B[0] * B[0] + B[1] * B[1] + B[2] * B[2]) || 1;
        B[0] /= bLen; B[1] /= bLen; B[2] /= bLen;
        // N = B x T
        N = [B[1] * T[2] - B[2] * T[1], B[2] * T[0] - B[0] * T[2], B[0] * T[1] - B[1] * T[0]];

        for (let j = 0; j <= radialSeg; j++) {
            const angle = (j / radialSeg) * Math.PI * 2;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const nx = cos * N[0] + sin * B[0];
            const ny = cos * N[1] + sin * B[1];
            const nz = cos * N[2] + sin * B[2];
            positions.push(p[0] + radius * nx, p[1] + radius * ny, p[2] + radius * nz);
            normals.push(nx, ny, nz);
        }
    }

    for (let i = 0; i < tubeSeg; i++) {
        for (let j = 0; j < radialSeg; j++) {
            const a = i * (radialSeg + 1) + j;
            const b = a + radialSeg + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

// ── GLB 생성 함수 ──
async function buildGLB(filename, meshes) {
    const doc = new Document();
    const buf = doc.createBuffer();
    const sceneNode = doc.createScene();

    for (const m of meshes) {
        const posAccessor = doc.createAccessor().setType('VEC3').setArray(m.geo.positions).setBuffer(buf);
        const normAccessor = doc.createAccessor().setType('VEC3').setArray(m.geo.normals).setBuffer(buf);
        const idxAccessor = doc.createAccessor().setType('SCALAR').setArray(m.geo.indices).setBuffer(buf);

        const material = doc.createMaterial()
            .setBaseColorFactor(m.color)
            .setMetallicFactor(m.metallic ?? 0.95)
            .setRoughnessFactor(m.roughness ?? 0.1);

        const prim = doc.createPrimitive()
            .setAttribute('POSITION', posAccessor)
            .setAttribute('NORMAL', normAccessor)
            .setIndices(idxAccessor)
            .setMaterial(material);

        const mesh = doc.createMesh().addPrimitive(prim);
        const node = doc.createNode().setMesh(mesh);

        if (m.position) node.setTranslation(m.position);
        if (m.rotation) node.setRotation(m.rotation);
        if (m.scale) node.setScale(m.scale);

        sceneNode.addChild(node);
    }

    const io = new NodeIO();
    const glb = await io.writeBinary(doc);
    const outPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(glb));
    console.log(`  ✓ ${filename} (${(glb.byteLength / 1024).toFixed(1)} KB)`);
}

// ══════════════════════════════════
// 1. 골드 트위스트 반지
// ══════════════════════════════════
async function makeGoldRing() {
    await buildGLB('ring_gold_twist.glb', [
        {
            geo: createTorus(0.45, 0.1, 64, 32),
            color: [0.83, 0.66, 0.33, 1], // 골드
            metallic: 0.95, roughness: 0.08
        },
        {
            geo: createTorus(0.45, 0.03, 64, 16),
            color: [0.93, 0.79, 0.49, 1], // 밝은 골드 장식
            metallic: 0.9, roughness: 0.12,
            position: [0, 0, 0.06]
        }
    ]);
}

// 2. 실버 큐빅 반지
async function makeSilverRing() {
    await buildGLB('ring_silver_cubic.glb', [
        {
            geo: createTorus(0.44, 0.08, 64, 32),
            color: [0.75, 0.75, 0.78, 1], // 실버
            metallic: 0.95, roughness: 0.06
        },
        {
            geo: createSphere(0.065, 16, 16),
            color: [0.95, 0.95, 1.0, 1], // 큐빅
            metallic: 0.1, roughness: 0.0,
            position: [0, 0.44, 0]
        }
    ]);
}

// 3. 로즈골드 체인 목걸이
async function makeRoseGoldNecklace() {
    const chainPts = [
        [-0.6, 0.2, 0], [-0.4, 0.0, 0.02], [-0.15, -0.18, 0.04],
        [0, -0.25, 0.05], [0.15, -0.18, 0.04], [0.4, 0.0, 0.02], [0.6, 0.2, 0]
    ];
    await buildGLB('necklace_rosegold_heart.glb', [
        {
            geo: createTube(chainPts, 0.015, 60, 12),
            color: [0.78, 0.48, 0.35, 1], // 로즈골드
            metallic: 0.93, roughness: 0.1
        },
        {
            geo: createSphere(0.05, 16, 16),
            color: [0.78, 0.48, 0.35, 1],
            metallic: 0.93, roughness: 0.1,
            position: [0, -0.3, 0.05]
        }
    ]);
}

// 4. 진주 드롭 목걸이
async function makePearlNecklace() {
    const chainPts = [
        [-0.55, 0.2, 0], [-0.35, 0.0, 0.02], [0, -0.2, 0.04],
        [0.35, 0.0, 0.02], [0.55, 0.2, 0]
    ];
    await buildGLB('necklace_pearl_drop.glb', [
        {
            geo: createTube(chainPts, 0.012, 60, 12),
            color: [0.75, 0.75, 0.78, 1], // 실버 체인
            metallic: 0.95, roughness: 0.06
        },
        {
            geo: createSphere(0.055, 24, 24),
            color: [1.0, 0.96, 0.93, 1], // 진주색
            metallic: 0.15, roughness: 0.2,
            position: [0, -0.26, 0.04]
        }
    ]);
}

// 5. 골드 체인 팔찌
async function makeGoldBracelet() {
    await buildGLB('bracelet_gold_chain.glb', [
        {
            geo: createTorus(0.5, 0.06, 64, 24),
            color: [0.83, 0.66, 0.33, 1],
            metallic: 0.95, roughness: 0.08
        },
        {
            geo: createTorus(0.5, 0.02, 64, 12),
            color: [0.93, 0.79, 0.49, 1],
            metallic: 0.9, roughness: 0.12,
            position: [0, 0, 0.04]
        }
    ]);
}

// 6. 실버 뱅글 팔찌
async function makeSilverBangle() {
    await buildGLB('bracelet_silver_bangle.glb', [
        {
            geo: createTorus(0.48, 0.045, 64, 24),
            color: [0.75, 0.75, 0.78, 1],
            metallic: 0.95, roughness: 0.06
        },
        {
            geo: createSphere(0.05, 16, 16),
            color: [0.75, 0.75, 0.78, 1],
            metallic: 0.95, roughness: 0.06,
            position: [0.48, 0, 0]
        },
        {
            geo: createSphere(0.05, 16, 16),
            color: [0.75, 0.75, 0.78, 1],
            metallic: 0.95, roughness: 0.06,
            position: [-0.48, 0, 0]
        }
    ]);
}

// ══════════════════════════════════
async function main() {
    console.log('3D 주얼리 GLB 파일 생성 시작\n');
    await makeGoldRing();
    await makeSilverRing();
    await makeRoseGoldNecklace();
    await makePearlNecklace();
    await makeGoldBracelet();
    await makeSilverBangle();
    console.log('\n완료! uploads/ 폴더에 6개 GLB 파일 생성됨');
}

main().catch(console.error);
