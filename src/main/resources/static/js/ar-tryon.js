(function () {
    'use strict';

    const jewelryType = document.getElementById('jewelryType').value;
    const overlayUrl = document.getElementById('overlayUrl').value;
    const modelUrl = document.getElementById('modelUrl') ? document.getElementById('modelUrl').value : '';

    const video = document.getElementById('camera');
    const canvas = document.getElementById('arCanvas');
    const ctx = canvas.getContext('2d');
    const loadingEl = document.getElementById('loading');
    const statusEl = document.getElementById('status');
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');

    let userScale = 1.0;
    let facingMode = (jewelryType === 'NECKLACE') ? 'user' : 'environment';
    let stream = null;
    let handLandmarker = null;
    let poseLandmarker = null;
    let animFrameId = null;

    // 이미지 오버레이
    let overlayImage = null;
    let hasValidImage = false;

    // 사전 렌더된 3D 스프라이트 (각도별 이미지)
    const spriteImages = []; // [{pitch, roll, canvas}]
    let spritesReady = false;

    // ── 스무딩 ──
    const SMOOTH = 0.25;
    const smoothed = {};
    function smooth(id, vals) {
        if (!smoothed[id]) { smoothed[id] = { ...vals }; return smoothed[id]; }
        const s = smoothed[id];
        for (const k of Object.keys(vals)) {
            if (k === 'angle') {
                let da = vals[k] - s[k];
                if (da > Math.PI) da -= Math.PI * 2;
                if (da < -Math.PI) da += Math.PI * 2;
                s[k] += da * SMOOTH;
            } else {
                s[k] += (vals[k] - s[k]) * SMOOTH;
            }
        }
        return s;
    }
    function resetSmoothed() { Object.keys(smoothed).forEach(k => delete smoothed[k]); }

    // ── 이미지 로드 ──
    function loadOverlay() {
        return new Promise((resolve) => {
            if (!overlayUrl || overlayUrl === '') { resolve(); return; }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (img.naturalWidth > 1 && img.naturalHeight > 1) {
                    overlayImage = img; hasValidImage = true;
                }
                resolve();
            };
            img.onerror = () => resolve();
            img.src = overlayUrl;
        });
    }

    // ═══════════════════════════════════════
    // 3D 사전 렌더: 시작 시 여러 각도에서 렌더 → 배열에 저장
    // 런타임에는 손 기울기에 맞는 이미지를 골라서 그림
    // ═══════════════════════════════════════
    function preRenderSprites() {
        const SIZE = 256;
        const c = document.createElement('canvas');
        c.width = SIZE; c.height = SIZE;

        const renderer = new THREE.WebGLRenderer({
            canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true
        });
        renderer.setSize(SIZE, SIZE);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

        // 조명
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const key = new THREE.DirectionalLight(0xfff8e0, 2.5);
        key.position.set(2, 3, 3); scene.add(key);
        const fill = new THREE.DirectionalLight(0xe0e8ff, 1.2);
        fill.position.set(-3, 1, 2); scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 1.8);
        rim.position.set(0, -1, -3); scene.add(rim);
        const p1 = new THREE.PointLight(0xfff0cc, 1.5, 8);
        p1.position.set(0.5, 2, 2); scene.add(p1);

        // 메시
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xd4a853, metalness: 0.97, roughness: 0.05
        });

        let mesh;
        if (jewelryType === 'RING') {
            mesh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.13, 48, 100), goldMat);
        } else if (jewelryType === 'BRACELET') {
            mesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 48, 100), goldMat);
        } else {
            const group = new THREE.Group();
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.6, 0.15, 0), new THREE.Vector3(-0.3, -0.1, 0.03),
                new THREE.Vector3(0, -0.25, 0.05), new THREE.Vector3(0.3, -0.1, 0.03),
                new THREE.Vector3(0.6, 0.15, 0)
            ]);
            group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.018, 16, false), goldMat));
            const pendant = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.07, 2),
                new THREE.MeshStandardMaterial({ color: 0xd4a853, metalness: 0.95, roughness: 0.06 })
            );
            pendant.position.set(0, -0.29, 0.05);
            group.add(pendant);
            mesh = group;
        }
        scene.add(mesh);

        // ── 여러 각도에서 사전 렌더 ──
        // pitch: -1(아래서 봄) ~ 0(정면) ~ 1(위에서 봄)
        // roll: -1(왼쪽에서 봄) ~ 0(정면) ~ 1(오른쪽에서 봄)
        const steps = 7; // 7x7 = 49개 각도
        for (let pi = 0; pi < steps; pi++) {
            for (let ri = 0; ri < steps; ri++) {
                const pitch = (pi / (steps - 1)) * 2 - 1; // -1 ~ 1
                const roll = (ri / (steps - 1)) * 2 - 1;  // -1 ~ 1

                if (jewelryType === 'NECKLACE') {
                    camera.position.set(roll * 0.5, pitch * 0.3, 2.5);
                    mesh.rotation.set(0, roll * 0.3, 0);
                } else {
                    // 반지/팔찌: 카메라 위치로 시점 변경
                    const camY = 0.3 + pitch * 1.8;  // -1.5 ~ 2.1 (아래 ~ 위)
                    const camX = roll * 1.5;          // -1.5 ~ 1.5 (왼 ~ 오른)
                    camera.position.set(camX, camY, 2.2);
                }
                camera.lookAt(0, 0, 0);

                renderer.render(scene, camera);

                // 렌더 결과를 새 캔버스에 복사해서 저장
                const img = document.createElement('canvas');
                img.width = SIZE; img.height = SIZE;
                img.getContext('2d').drawImage(c, 0, 0);

                spriteImages.push({ pitch, roll, canvas: img });
            }
        }

        renderer.dispose();
        spritesReady = true;
        console.log(`3D 스프라이트 ${spriteImages.length}개 사전 렌더 완료`);
    }

    // pitch/roll에 가장 가까운 사전 렌더 이미지 찾기
    function getSprite(pitch, roll) {
        if (!spritesReady || spriteImages.length === 0) return null;

        let best = null;
        let bestDist = Infinity;
        for (const s of spriteImages) {
            const d = (s.pitch - pitch) ** 2 + (s.roll - roll) ** 2;
            if (d < bestDist) { bestDist = d; best = s; }
        }
        return best ? best.canvas : null;
    }

    // ═══════════════════════════════════════
    // 카메라
    // ═══════════════════════════════════════
    async function startCamera() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    // ═══════════════════════════════════════
    // MediaPipe
    // ═══════════════════════════════════════
    async function loadMediaPipe() {
        const { FilesetResolver, HandLandmarker, PoseLandmarker } = await import(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
        );
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (jewelryType === 'RING' || jewelryType === 'BRACELET') {
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO', numHands: 2
            });
        }
        if (jewelryType === 'NECKLACE') {
            poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO'
            });
        }
    }

    // ═══════════════════════════════════════
    // 좌표
    // ═══════════════════════════════════════
    function lmX(lm) { return (facingMode === 'user' ? (1 - lm.x) : lm.x) * canvas.width; }
    function lmY(lm) { return lm.y * canvas.height; }

    // ═══════════════════════════════════════
    // 오버레이 그리기 (3D 렌더 or 이미지)
    // ═══════════════════════════════════════
    function drawOverlay(cx, cy, w, h, angle, pitch, roll) {
        const source = hasValidImage ? overlayImage : getSprite(pitch || 0, roll || 0);
        if (!source) return;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // multiply로 피부에 녹아듦
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.85;
        ctx.drawImage(source, -w / 2, -h / 2, w, h);

        // screen으로 하이라이트 (빛 반사)
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5;
        ctx.drawImage(source, -w / 2, -h / 2, w, h);

        // source-over로 원본도 살짝 (선명도)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.4;
        ctx.drawImage(source, -w / 2, -h / 2, w, h);

        ctx.restore();
    }

    // ═══════════════════════════════════════
    // 반지
    // ═══════════════════════════════════════
    function processRing(landmarks, i) {
        const mcp = landmarks[13];
        const pip = landmarks[14];
        const wrist = landmarks[0];
        const index_mcp = landmarks[5];
        const pinky_mcp = landmarks[17];

        const cx = (lmX(mcp) + lmX(pip)) / 2;
        const cy = (lmY(mcp) + lmY(pip)) / 2;
        const fingerAngle = Math.atan2(lmY(pip) - lmY(mcp), lmX(pip) - lmX(mcp));
        const bandAngle = fingerAngle + Math.PI / 2;
        const fingerLen = Math.hypot(lmX(mcp) - lmX(pip), lmY(mcp) - lmY(pip));

        // ── 2D 랜드마크로 손 기울기 추정 ──
        const mid_mcp = landmarks[9]; // 중지 MCP
        const mid_tip = landmarks[12]; // 중지 TIP

        // 손 전체 길이 (손목→중지끝)
        const handLen = Math.hypot(lmX(wrist) - lmX(mid_tip), lmY(wrist) - lmY(mid_tip));
        // 손 너비 (검지MCP→소지MCP)
        const handWidth = Math.hypot(lmX(index_mcp) - lmX(pinky_mcp), lmY(index_mcp) - lmY(pinky_mcp));

        // pitch: 손이 얼마나 펼쳐져 있나 (비율로 추정)
        // 손바닥이 카메라를 향하면 handLen이 길고, 옆면이면 짧음
        const expectedLen = handWidth * 2.5;
        const pitch = Math.max(-1, Math.min(1, (handLen / expectedLen - 0.7) * 3));

        // roll: 검지쪽이 높은지 소지쪽이 높은지
        const idxY = lmY(index_mcp);
        const pinkyY = lmY(pinky_mcp);
        const roll = Math.max(-1, Math.min(1, (pinkyY - idxY) / (handWidth * 0.5)));

        const bandWidth = fingerLen * 1.1 * userScale;
        const bandHeight = fingerLen * 0.7 * userScale;

        const s = smooth('ring' + i, {
            x: cx, y: cy, w: bandWidth, h: bandHeight, angle: bandAngle,
            pitch, roll
        });
        drawOverlay(s.x, s.y, s.w, s.h, s.angle, s.pitch, s.roll);
    }

    // ═══════════════════════════════════════
    // 팔찌
    // ═══════════════════════════════════════
    function processBracelet(landmarks, i) {
        const wrist = landmarks[0];
        const palm = landmarks[9];
        const index_mcp = landmarks[5];
        const pinky_mcp = landmarks[17];

        const x = lmX(wrist), y = lmY(wrist);
        const handAngle = Math.atan2(lmY(palm) - lmY(wrist), lmX(palm) - lmX(wrist));
        const bandAngle = handAngle + Math.PI / 2;
        const wristWidth = Math.hypot(lmX(index_mcp) - lmX(pinky_mcp), lmY(index_mcp) - lmY(pinky_mcp));

        // 2D 랜드마크로 손목 기울기 추정
        const mid_tip = landmarks[12];
        const handLen = Math.hypot(lmX(wrist) - lmX(mid_tip), lmY(wrist) - lmY(mid_tip));
        const expectedLen = wristWidth * 2.5;
        const pitch = Math.max(-1, Math.min(1, (handLen / expectedLen - 0.7) * 3));

        const idxY = lmY(index_mcp);
        const pinkyY = lmY(pinky_mcp);
        const roll = Math.max(-1, Math.min(1, (pinkyY - idxY) / (wristWidth * 0.5)));

        const bandW = wristWidth * 1.3 * userScale;
        const bandH = wristWidth * 0.8 * userScale;

        const s = smooth('brace' + i, {
            x, y, w: bandW, h: bandH, angle: bandAngle, pitch, roll
        });
        drawOverlay(s.x, s.y, s.w, s.h, s.angle, s.pitch, s.roll);
    }

    // ═══════════════════════════════════════
    // 목걸이
    // ═══════════════════════════════════════
    function processNecklace(poseLandmarks, i) {
        const lS = poseLandmarks[11], rS = poseLandmarks[12];
        if (lS.visibility < 0.5 || rS.visibility < 0.5) return;

        const cx = (lmX(lS) + lmX(rS)) / 2;
        const cy = (lmY(lS) + lmY(rS)) / 2;
        const angle = Math.atan2(lmY(rS) - lmY(lS), lmX(rS) - lmX(lS));
        const sw = Math.hypot(lmX(lS) - lmX(rS), lmY(lS) - lmY(rS));

        const w = sw * 1.2 * userScale;
        const h = sw * 0.85 * userScale;

        const s = smooth('neck' + i, { x: cx, y: cy, w, h, angle });
        drawOverlay(s.x, s.y, s.w, s.h, s.angle);
    }

    // ═══════════════════════════════════════
    // 렌더 루프
    // ═══════════════════════════════════════
    function renderLoop() {
        if (video.readyState < 2) { animFrameId = requestAnimationFrame(renderLoop); return; }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 비디오를 캔버스에 그림
        ctx.save();
        if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        const now = performance.now();
        let detected = false;

        if ((jewelryType === 'RING' || jewelryType === 'BRACELET') && handLandmarker) {
            const r = handLandmarker.detectForVideo(video, now);
            if (r.landmarks && r.landmarks.length > 0) {
                detected = true;
                r.landmarks.forEach((lm, i) => {
                    jewelryType === 'RING' ? processRing(lm, i) : processBracelet(lm, i);
                });
            }
        }
        if (jewelryType === 'NECKLACE' && poseLandmarker) {
            const r = poseLandmarker.detectForVideo(video, now);
            if (r.landmarks && r.landmarks.length > 0) {
                detected = true;
                r.landmarks.forEach((lm, i) => processNecklace(lm, i));
            }
        }

        // 디버그: pitch/roll 값 표시
        const lastSmooth = smoothed['ring0'] || smoothed['brace0'] || {};
        const dbgP = (lastSmooth.pitch || 0).toFixed(2);
        const dbgR = (lastSmooth.roll || 0).toFixed(2);
        statusEl.textContent = detected ?
            '✓ P:' + dbgP + ' R:' + dbgR :
            (jewelryType === 'NECKLACE' ? '상체를 보여주세요' : '손을 보여주세요');
        statusEl.style.opacity = '1';
        statusEl.style.background = detected ? 'rgba(0,100,0,0.6)' : 'rgba(0,0,0,0.6)';

        animFrameId = requestAnimationFrame(renderLoop);
    }

    // ═══════════════════════════════════════
    // 촬영
    // ═══════════════════════════════════════
    function capturePhoto() {
        const flash = document.createElement('div');
        flash.className = 'capture-flash';
        document.getElementById('arViewport').appendChild(flash);
        setTimeout(() => flash.remove(), 300);

        canvas.toBlob(async (blob) => {
            // 서버에 업로드 → 다운로드 URL 받기
            const formData = new FormData();
            formData.append('image', blob, 'ar-jewelry-' + Date.now() + '.png');

            try {
                const res = await fetch('/api/capture', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.url) {
                    // 다운로드 링크로 이동 (갤러리 저장됨)
                    const a = document.createElement('a');
                    a.href = data.url;
                    a.download = data.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            } catch (e) {
                // 서버 업로드 실패 시 fallback: 새 탭에서 이미지 열기
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ar-jewelry-' + Date.now() + '.png';
                a.click();
            }
        }, 'image/png');
    }

    // ═══════════════════════════════════════
    // 이벤트 + 초기화
    // ═══════════════════════════════════════
    sizeSlider.addEventListener('input', () => {
        userScale = parseFloat(sizeSlider.value);
        sizeValue.textContent = Math.round(userScale * 100) + '%';
    });
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);

    async function init() {
        try {
            preRenderSprites();
            await startCamera();
            await Promise.all([loadOverlay(), loadMediaPipe()]);
            loadingEl.style.display = 'none';
            renderLoop();
        } catch (err) {
            console.error('AR 초기화 실패:', err);
            loadingEl.querySelector('p').textContent = '초기화 실패: ' + err.message;
            loadingEl.querySelector('.spinner').style.display = 'none';
        }
    }

    init();
})();
