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

    // Three.js 오프스크린
    let offRenderer, offScene, offCamera, jewelryMesh;
    const OFF = 300;
    let threeReady = false;

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
    // Three.js 오프스크린 3D 렌더러
    // ═══════════════════════════════════════
    function initThreeJS() {
        const c = document.createElement('canvas');
        c.width = OFF; c.height = OFF;

        offRenderer = new THREE.WebGLRenderer({
            canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true
        });
        offRenderer.setSize(OFF, OFF);
        offRenderer.outputColorSpace = THREE.SRGBColorSpace;
        offRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        offRenderer.toneMappingExposure = 1.5;

        offScene = new THREE.Scene();

        // 카메라: 살짝 위에서 비스듬히 내려다봄 → 밴드 형태로 보임
        offCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        offCamera.position.set(0, 1.2, 2.2);
        offCamera.lookAt(0, 0, 0);

        // ── 조명: 환경맵 없이 메탈릭 반사를 만드는 다중 조명 ──
        // 키라이트 (우상단, 따뜻한 흰색)
        const key = new THREE.DirectionalLight(0xfff8e0, 2.5);
        key.position.set(2, 3, 3);
        offScene.add(key);

        // 필라이트 (좌측, 차가운 흰색)
        const fill = new THREE.DirectionalLight(0xe0e8ff, 1.2);
        fill.position.set(-3, 1, 2);
        offScene.add(fill);

        // 림라이트 (뒤쪽, 강한 하이라이트)
        const rim = new THREE.DirectionalLight(0xffffff, 1.8);
        rim.position.set(0, -1, -3);
        offScene.add(rim);

        // 상단 포인트 라이트 (보석 반짝임)
        const point1 = new THREE.PointLight(0xfff0cc, 1.5, 8);
        point1.position.set(0.5, 2, 2);
        offScene.add(point1);

        // 하단 반사 (바닥 반사광)
        const point2 = new THREE.PointLight(0xffe0c0, 0.5, 8);
        point2.position.set(0, -2, 1);
        offScene.add(point2);

        // 앰비언트 (전체 밝기)
        offScene.add(new THREE.AmbientLight(0xffffff, 0.3));

        // ── 주얼리 메시 생성 ──
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xd4a853,
            metalness: 0.97,
            roughness: 0.05,
        });

        const silverMat = new THREE.MeshStandardMaterial({
            color: 0xd0d0d0,
            metalness: 0.97,
            roughness: 0.04,
        });

        if (jewelryType === 'RING') {
            // 토러스 반지 (눕힌 상태 → 카메라가 위에서 보면 밴드처럼)
            jewelryMesh = new THREE.Mesh(
                new THREE.TorusGeometry(0.5, 0.13, 48, 100),
                goldMat
            );
            // 눕힘 → 카메라에서 보면 앞뒤로 감싸는 밴드
            jewelryMesh.rotation.x = 0;
        } else if (jewelryType === 'BRACELET') {
            jewelryMesh = new THREE.Mesh(
                new THREE.TorusGeometry(0.55, 0.08, 48, 100),
                goldMat
            );
            jewelryMesh.rotation.x = 0;
        } else {
            // 목걸이
            const group = new THREE.Group();
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.6, 0.15, 0),
                new THREE.Vector3(-0.3, -0.1, 0.03),
                new THREE.Vector3(0, -0.25, 0.05),
                new THREE.Vector3(0.3, -0.1, 0.03),
                new THREE.Vector3(0.6, 0.15, 0)
            ]);
            group.add(new THREE.Mesh(
                new THREE.TubeGeometry(curve, 64, 0.018, 16, false),
                goldMat
            ));
            const pendantMat = new THREE.MeshStandardMaterial({
                color: 0xd4a853, metalness: 0.95, roughness: 0.06
            });
            const pendant = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.07, 2), pendantMat
            );
            pendant.position.set(0, -0.29, 0.05);
            group.add(pendant);
            jewelryMesh = group;
            // 목걸이는 정면에서 봄
            offCamera.position.set(0, 0, 2.5);
            offCamera.lookAt(0, 0, 0);
        }

        offScene.add(jewelryMesh);
        threeReady = true;
    }

    // 3D 렌더 → 손의 3D 기울기에 따라 카메라 각도 변경
    // pitch: 손이 앞뒤로 기울어진 정도 (-1~1, 양수=손등이 보임, 음수=손바닥이 보임)
    // roll: 손이 좌우로 기울어진 정도 (-1~1)
    // twist: 2D 화면상 밴드 회전각
    function render3D(twist, pitch, roll) {
        if (!threeReady || !jewelryMesh) return null;

        if (jewelryType === 'RING' || jewelryType === 'BRACELET') {
            // 메시 자체를 손 기울기에 따라 3축 회전
            // x축: pitch (앞뒤 기울기) → 위에서/아래에서 본 모습
            // y축: roll (좌우 기울기) → 옆에서 본 모습
            // z축: twist (2D 화면 회전)
            jewelryMesh.rotation.x = pitch * 1.2;
            jewelryMesh.rotation.y = roll * 1.0;
            jewelryMesh.rotation.z = twist;

            // 카메라도 살짝 따라감 (입체감 강화)
            offCamera.position.set(
                roll * 0.6,
                1.0 + pitch * 0.8,
                2.3
            );
            offCamera.lookAt(0, 0, 0);
        } else {
            jewelryMesh.rotation.y = roll * 0.5 + twist * 0.2;
            jewelryMesh.rotation.x = pitch * 0.3;
            offCamera.position.set(0, pitch * 0.3, 2.5);
            offCamera.lookAt(0, 0, 0);
        }

        offRenderer.render(offScene, offCamera);
        return offRenderer.domElement;
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
        const source = hasValidImage ? overlayImage : render3D(angle, pitch || 0, roll || 0);
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

        // z좌표로 손의 3D 기울기 추정 (z값이 매우 작으므로 20배 증폭)
        const pitch = Math.max(-1, Math.min(1, (wrist.z - mcp.z) * 20));
        const roll = Math.max(-1, Math.min(1, (index_mcp.z - pinky_mcp.z) * 20));

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

        // z좌표로 손목 기울기 (20배 증폭)
        const pitch = Math.max(-1, Math.min(1, (wrist.z - palm.z) * 20));
        const roll = Math.max(-1, Math.min(1, (index_mcp.z - pinky_mcp.z) * 20));

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

        statusEl.textContent = detected ? '✓ 인식됨' :
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
            const file = new File([blob], 'ar-jewelry-' + Date.now() + '.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ files: [file], title: 'AR Jewelry' }); return; }
                catch (e) { if (e.name === 'AbortError') return; }
            }
            window.open(URL.createObjectURL(blob), '_blank');
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
            initThreeJS();
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
