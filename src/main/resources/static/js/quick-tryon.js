(function () {
    'use strict';

    const modal = document.getElementById('arModal');
    const modalTitle = document.getElementById('arModalTitle');
    const video = document.getElementById('modalCamera');
    const canvas = document.getElementById('modalCanvas');
    const ctx = canvas.getContext('2d');
    const loadingEl = document.getElementById('modalLoading');
    const statusEl = document.getElementById('modalStatus');
    const sizeSlider = document.getElementById('modalSizeSlider');

    let stream = null, facingMode = 'user', animFrameId = null;
    let handLandmarker = null, poseLandmarker = null;
    let overlayImage = null, hasValidImage = false;
    let currentType = null, userScale = 1.0, isMediaPipeLoaded = false;

    const SMOOTH = 0.25;
    const smoothed = {};
    function smooth(id, vals) {
        if (!smoothed[id]) { smoothed[id] = {...vals}; return smoothed[id]; }
        const s = smoothed[id];
        for (const k of Object.keys(vals)) {
            if (k === 'angle') { let da = vals[k]-s[k]; if(da>Math.PI)da-=Math.PI*2; if(da<-Math.PI)da+=Math.PI*2; s[k]+=da*SMOOTH; }
            else { s[k]+=(vals[k]-s[k])*SMOOTH; }
        }
        return s;
    }
    function resetSmoothed() { Object.keys(smoothed).forEach(k => delete smoothed[k]); }

    async function ensureMediaPipe() {
        if (isMediaPipeLoaded) return;
        const mp = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest');
        const v = await mp.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
        handLandmarker = await mp.HandLandmarker.createFromOptions(v, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 });
        poseLandmarker = await mp.PoseLandmarker.createFromOptions(v, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task', delegate: 'GPU' }, runningMode: 'VIDEO' });
        isMediaPipeLoaded = true;
    }

    async function startCamera() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 720 }, height: { ideal: 960 } }, audio: false });
        video.srcObject = stream; await video.play();
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'none';
    }
    function stopCamera() { if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; } if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }

    function lmX(lm) { return (facingMode==='user'?(1-lm.x):lm.x)*canvas.width; }
    function lmY(lm) { return lm.y*canvas.height; }

    // ── 메탈릭 밴드 (ar-tryon.js와 동일) ──
    function drawMetallicBand(cx,cy,width,thickness,angle,c1,c2,c3,skipCenter) {
        ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
        const hw=width/2,ht=thickness/2;
        ctx.globalCompositeOperation='multiply';
        const mg=ctx.createLinearGradient(0,-ht,0,ht);mg.addColorStop(0,c1);mg.addColorStop(0.15,c2);mg.addColorStop(0.35,c3);mg.addColorStop(0.55,c2);mg.addColorStop(0.85,c1);mg.addColorStop(1,'rgba(60,40,10,0.25)');
        if(skipCenter){
            ctx.beginPath();ctx.ellipse(0,0,hw,ht*0.8,0,Math.PI+0.1,Math.PI+1.2);ctx.strokeStyle=mg;ctx.lineWidth=thickness;ctx.lineCap='round';ctx.stroke();
            ctx.beginPath();ctx.ellipse(0,0,hw,ht*0.8,0,-1.2,-0.1);ctx.strokeStyle=mg;ctx.lineWidth=thickness;ctx.lineCap='round';ctx.stroke();
            ctx.globalCompositeOperation='screen';
            ctx.beginPath();ctx.ellipse(0,-ht*0.3,hw*0.88,ht*0.6,0,Math.PI+0.2,Math.PI+1.0);ctx.strokeStyle='rgba(255,255,200,0.4)';ctx.lineWidth=thickness*0.12;ctx.stroke();
            ctx.beginPath();ctx.ellipse(0,-ht*0.3,hw*0.88,ht*0.6,0,-1.0,-0.2);ctx.strokeStyle='rgba(255,255,200,0.4)';ctx.lineWidth=thickness*0.12;ctx.stroke();
            ctx.globalCompositeOperation='multiply';
            ctx.globalAlpha=0.1;ctx.beginPath();ctx.ellipse(0,0,hw,ht*0.8,0,0.3,Math.PI-0.3);ctx.strokeStyle=c2;ctx.lineWidth=thickness*0.4;ctx.stroke();ctx.globalAlpha=1;
        } else {
            ctx.globalAlpha=0.1;ctx.beginPath();ctx.ellipse(0,0,hw,ht*0.8,0,0.2,Math.PI-0.2);ctx.strokeStyle=c2;ctx.lineWidth=thickness*0.4;ctx.stroke();ctx.globalAlpha=1;
            ctx.beginPath();ctx.ellipse(0,0,hw,ht*0.8,0,Math.PI+0.15,-0.15);ctx.strokeStyle=mg;ctx.lineWidth=thickness;ctx.stroke();
            ctx.globalCompositeOperation='screen';
            ctx.beginPath();ctx.ellipse(0,-ht*0.35,hw*0.85,ht*0.6,0,Math.PI+0.3,-0.3);
            const hl=ctx.createLinearGradient(-hw*0.3,0,hw*0.2,0);hl.addColorStop(0,'rgba(255,255,200,0)');hl.addColorStop(0.4,'rgba(255,255,200,0.45)');hl.addColorStop(1,'rgba(255,255,200,0)');
            ctx.strokeStyle=hl;ctx.lineWidth=thickness*0.12;ctx.stroke();
        }
        ctx.restore();
    }

    function drawNecklaceChain(cx, cy, w, h, angle) {
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
        ctx.shadowColor='rgba(0,0,0,0.25)'; ctx.shadowBlur=4; ctx.shadowOffsetY=2;
        const cg=ctx.createLinearGradient(-w/2,0,w/2,0); cg.addColorStop(0,'#8B6914'); cg.addColorStop(0.3,'#D4A853'); cg.addColorStop(0.5,'#FFF5CC'); cg.addColorStop(0.7,'#D4A853'); cg.addColorStop(1,'#8B6914');
        ctx.strokeStyle=cg; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.quadraticCurveTo(0,h*0.8,w/2,0); ctx.stroke();
        const px=0,py=h*0.7,ps=Math.max(w*0.06,8);
        ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=6;
        const pg=ctx.createRadialGradient(px-ps*0.3,py-ps*0.3,0,px,py,ps); pg.addColorStop(0,'#FFF5CC'); pg.addColorStop(0.3,'#D4A853'); pg.addColorStop(1,'#8B6914');
        ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,ps,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawJewelry(type, cx, cy, w, h, angle) {
        if (hasValidImage) { ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle); ctx.drawImage(overlayImage,-w/2,-h/2,w,h); ctx.restore(); return; }
        if (type==='NECKLACE') drawNecklaceChain(cx,cy,w,h,angle);
        else drawMetallicBand(cx,cy,w,h,angle,'#7A5A0E','#C9A33E','#FFF0B0',true);
    }

    function processRing(lm, i) {
        const mcp=lm[13],pip=lm[14];
        const cx=(lmX(mcp)+lmX(pip))/2, cy=(lmY(mcp)+lmY(pip))/2;
        const fa=Math.atan2(lmY(pip)-lmY(mcp),lmX(pip)-lmX(mcp));
        const fl=Math.hypot(lmX(mcp)-lmX(pip),lmY(mcp)-lmY(pip));
        const s=smooth('ring'+i,{x:cx,y:cy,w:fl*1.0*userScale,h:fl*0.3*userScale,angle:fa+Math.PI/2});
        drawJewelry('RING',s.x,s.y,s.w,s.h,s.angle);
    }
    function processBracelet(lm, i) {
        const wr=lm[0],pm=lm[9],imcp=lm[5],pmcp=lm[17];
        const ha=Math.atan2(lmY(pm)-lmY(wr),lmX(pm)-lmX(wr));
        const ww=Math.hypot(lmX(imcp)-lmX(pmcp),lmY(imcp)-lmY(pmcp));
        const s=smooth('brace'+i,{x:lmX(wr),y:lmY(wr),w:ww*1.15*userScale,h:ww*0.22*userScale,angle:ha+Math.PI/2});
        drawJewelry('BRACELET',s.x,s.y,s.w,s.h,s.angle);
    }
    function processNecklace(poseLm, i) {
        const ls=poseLm[11],rs=poseLm[12];
        if(ls.visibility<0.5||rs.visibility<0.5) return;
        const cx=(lmX(ls)+lmX(rs))/2,cy=(lmY(ls)+lmY(rs))/2;
        const a=Math.atan2(lmY(rs)-lmY(ls),lmX(rs)-lmX(ls));
        const sw=Math.hypot(lmX(ls)-lmX(rs),lmY(ls)-lmY(rs));
        const s=smooth('neck'+i,{x:cx,y:cy,w:sw*1.1*userScale,h:sw*0.7*userScale,angle:a});
        drawJewelry('NECKLACE',s.x,s.y,s.w,s.h,s.angle);
    }

    function renderLoop() {
        if(video.readyState<2){animFrameId=requestAnimationFrame(renderLoop);return;}
        canvas.width=video.videoWidth;canvas.height=video.videoHeight;
        ctx.save();
        if(facingMode==='user'){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
        ctx.drawImage(video,0,0);
        ctx.restore();
        const now=performance.now(); let detected=false;
        if((currentType==='RING'||currentType==='BRACELET')&&handLandmarker){const r=handLandmarker.detectForVideo(video,now);if(r.landmarks&&r.landmarks.length>0){detected=true;r.landmarks.forEach((lm,i)=>currentType==='RING'?processRing(lm,i):processBracelet(lm,i));}}
        if(currentType==='NECKLACE'&&poseLandmarker){const r=poseLandmarker.detectForVideo(video,now);if(r.landmarks&&r.landmarks.length>0){detected=true;r.landmarks.forEach((lm,i)=>processNecklace(lm,i));}}
        statusEl.textContent=detected?'✓ 인식됨':(currentType==='NECKLACE'?'상체를 보여주세요':'손을 보여주세요');
        statusEl.style.opacity='1';statusEl.style.background=detected?'rgba(0,100,0,0.6)':'rgba(0,0,0,0.6)';
        animFrameId=requestAnimationFrame(renderLoop);
    }

    async function openModal(type,url,name) {
        currentType=type;userScale=1.0;sizeSlider.value='1.0';hasValidImage=false;overlayImage=null;resetSmoothed();
        // 반지/팔찌는 후면카메라, 목걸이는 전면카메라
        facingMode = (type === 'NECKLACE') ? 'user' : 'environment';
        modalTitle.textContent=name+' 착용해보기'; modal.classList.add('open'); loadingEl.style.display='flex';
        await new Promise(r=>{if(!url||url===''){r();return;} const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{if(img.naturalWidth>1){overlayImage=img;hasValidImage=true;}r();};img.onerror=()=>r();img.src=url;});
        try{await startCamera();await ensureMediaPipe();loadingEl.style.display='none';renderLoop();}
        catch(e){loadingEl.querySelector('p').textContent='카메라 권한을 허용해주세요';loadingEl.querySelector('.spinner').style.display='none';}
    }
    function closeModal(){modal.classList.remove('open');stopCamera();statusEl.style.opacity='0';}
    function capture(){canvas.toBlob(async b=>{const fd=new FormData();fd.append('image',b,'ar-jewelry-'+Date.now()+'.png');try{const r=await fetch('/api/capture',{method:'POST',body:fd});const d=await r.json();if(d.url){const a=document.createElement('a');a.href=d.url;a.download=d.filename;document.body.appendChild(a);a.click();document.body.removeChild(a);}}catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ar-jewelry-'+Date.now()+'.png';a.click();}},'image/png');}

    document.querySelectorAll('.quick-tryon-trigger').forEach(el=>{el.addEventListener('click',()=>openModal(el.dataset.type,el.dataset.overlay,el.dataset.name));});
    document.getElementById('arModalClose').addEventListener('click',closeModal);
    modal.addEventListener('click',(e)=>{if(e.target===modal)closeModal();});
    document.getElementById('modalCaptureBtn').addEventListener('click',capture);
    sizeSlider.addEventListener('input',()=>{userScale=parseFloat(sizeSlider.value);});
})();
