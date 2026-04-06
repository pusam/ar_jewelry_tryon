import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), '..', 'src', 'main', 'resources', 'static', 'images');

function saveSVG(filename, svg) {
    fs.writeFileSync(path.join(OUT, filename), svg);
    console.log(`  ✓ ${filename}`);
}

// ═══ 1. 골드 트위스트 반지 ═══
saveSVG('ring1.png', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B6914"/>
      <stop offset="30%" style="stop-color:#D4A853"/>
      <stop offset="50%" style="stop-color:#FFF0B0"/>
      <stop offset="70%" style="stop-color:#D4A853"/>
      <stop offset="100%" style="stop-color:#8B6914"/>
    </linearGradient>
    <linearGradient id="gold1b" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF5CC;stop-opacity:0.6"/>
      <stop offset="100%" style="stop-color:#8B6914;stop-opacity:0"/>
    </linearGradient>
    <filter id="shadow1"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.25"/></filter>
  </defs>
  <rect width="600" height="600" fill="#F8F4EF"/>
  <g filter="url(#shadow1)">
    <ellipse cx="300" cy="280" rx="160" ry="170" fill="none" stroke="url(#gold1)" stroke-width="28"/>
    <ellipse cx="300" cy="280" rx="160" ry="170" fill="none" stroke="url(#gold1b)" stroke-width="8" stroke-dasharray="4,6"/>
    <ellipse cx="300" cy="280" rx="148" ry="158" fill="none" stroke="url(#gold1)" stroke-width="6" stroke-opacity="0.3"/>
  </g>
  <text x="300" y="520" text-anchor="middle" font-family="serif" font-size="24" fill="#8B6914" letter-spacing="3">GOLD TWIST RING</text>
  <text x="300" y="555" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999">18K Gold</text>
</svg>`);

// ═══ 2. 실버 큐빅 반지 ═══
saveSVG('ring2.png', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="silver1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#707070"/>
      <stop offset="30%" style="stop-color:#C0C0C0"/>
      <stop offset="50%" style="stop-color:#F0F0F0"/>
      <stop offset="70%" style="stop-color:#C0C0C0"/>
      <stop offset="100%" style="stop-color:#707070"/>
    </linearGradient>
    <radialGradient id="gem1" cx="50%" cy="35%" r="50%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="30%" style="stop-color:#E0F0FF"/>
      <stop offset="100%" style="stop-color:#88BBEE"/>
    </radialGradient>
    <filter id="shadow2"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.2"/></filter>
    <filter id="glow1"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="600" height="600" fill="#F8F4EF"/>
  <g filter="url(#shadow2)">
    <ellipse cx="300" cy="290" rx="150" ry="160" fill="none" stroke="url(#silver1)" stroke-width="22"/>
    <g filter="url(#glow1)">
      <polygon points="300,105 318,145 312,155 300,130 288,155 282,145" fill="url(#gem1)" stroke="#AAD" stroke-width="1"/>
      <circle cx="300" cy="140" r="18" fill="url(#gem1)" stroke="#99BBDD" stroke-width="1"/>
      <circle cx="300" cy="133" r="5" fill="rgba(255,255,255,0.8)"/>
    </g>
  </g>
  <text x="300" y="520" text-anchor="middle" font-family="serif" font-size="24" fill="#666" letter-spacing="3">SILVER CUBIC RING</text>
  <text x="300" y="555" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999">Sterling Silver &amp; CZ</text>
</svg>`);

// ═══ 3. 로즈골드 체인 목걸이 ═══
saveSVG('necklace1.png', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="rose1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5A3C"/>
      <stop offset="30%" style="stop-color:#C77B5A"/>
      <stop offset="50%" style="stop-color:#F0C0A0"/>
      <stop offset="70%" style="stop-color:#C77B5A"/>
      <stop offset="100%" style="stop-color:#8B5A3C"/>
    </linearGradient>
    <radialGradient id="rosePendant" cx="40%" cy="35%" r="55%">
      <stop offset="0%" style="stop-color:#F0C0A0"/>
      <stop offset="60%" style="stop-color:#C77B5A"/>
      <stop offset="100%" style="stop-color:#8B5A3C"/>
    </radialGradient>
    <filter id="shadow3"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.2"/></filter>
  </defs>
  <rect width="600" height="600" fill="#F8F4EF"/>
  <g filter="url(#shadow3)">
    <path d="M 120,180 Q 200,120 300,100 Q 400,120 480,180" fill="none" stroke="url(#rose1)" stroke-width="5" stroke-linecap="round"/>
    <path d="M 120,180 Q 180,280 300,380 Q 420,280 480,180" fill="none" stroke="url(#rose1)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="300" cy="390" r="22" fill="url(#rosePendant)" stroke="#B06840" stroke-width="2"/>
    <path d="M 300,370 L 310,385 L 300,410 L 290,385 Z" fill="url(#rosePendant)" stroke="#B06840" stroke-width="1" opacity="0.5"/>
    <circle cx="294" cy="382" r="4" fill="rgba(255,255,255,0.5)"/>
  </g>
  <text x="300" y="500" text-anchor="middle" font-family="serif" font-size="22" fill="#8B5A3C" letter-spacing="3">ROSE GOLD NECKLACE</text>
  <text x="300" y="535" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999">14K Rose Gold</text>
</svg>`);

// ═══ 4. 진주 드롭 목걸이 ═══
saveSVG('necklace2.png', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="chain4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#888"/>
      <stop offset="50%" style="stop-color:#DDD"/>
      <stop offset="100%" style="stop-color:#888"/>
    </linearGradient>
    <radialGradient id="pearl" cx="38%" cy="32%" r="55%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="40%" style="stop-color:#FFF5EE"/>
      <stop offset="100%" style="stop-color:#DDD0C8"/>
    </radialGradient>
    <filter id="shadow4"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.2"/></filter>
    <filter id="pearlGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="600" height="600" fill="#F8F4EF"/>
  <g filter="url(#shadow4)">
    <path d="M 140,160 Q 220,100 300,90 Q 380,100 460,160" fill="none" stroke="url(#chain4)" stroke-width="4" stroke-linecap="round"/>
    <path d="M 140,160 Q 200,260 300,340 Q 400,260 460,160" fill="none" stroke="url(#chain4)" stroke-width="4" stroke-linecap="round"/>
    <g filter="url(#pearlGlow)">
      <circle cx="300" cy="355" r="28" fill="url(#pearl)" stroke="#C8C0B8" stroke-width="1"/>
      <ellipse cx="290" cy="342" rx="8" ry="10" fill="rgba(255,255,255,0.6)"/>
      <circle cx="286" cy="338" r="3" fill="rgba(255,255,255,0.9)"/>
    </g>
    <path d="M 295,326 L 305,326 L 302,332 L 298,332 Z" fill="#C0C0C0" opacity="0.6"/>
  </g>
  <text x="300" y="480" text-anchor="middle" font-family="serif" font-size="22" fill="#666" letter-spacing="3">PEARL DROP NECKLACE</text>
  <text x="300" y="515" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999">Sterling Silver &amp; Pearl</text>
</svg>`);

// ═══ 5. 골드 체인 팔찌 ═══
saveSVG('bracelet1.png', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="gold5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B6914"/>
      <stop offset="25%" style="stop-color:#D4A853"/>
      <stop offset="50%" style="stop-color:#FFF0B0"/>
      <stop offset="75%" style="stop-color:#D4A853"/>
      <stop offset="100%" style="stop-color:#8B6914"/>
    </linearGradient>
    <filter id="shadow5"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.2"/></filter>
  </defs>
  <rect width="600" height="600" fill="#F8F4EF"/>
  <g filter="url(#shadow5)" transform="rotate(-15,300,300)">
    <ellipse cx="300" cy="280" rx="200" ry="140" fill="none" stroke="url(#gold5)" stroke-width="14"/>
    <ellipse cx="300" cy="280" rx="200" ry="140" fill="none" stroke="rgba(255,245,200,0.3)" stroke-width="4" stroke-dasharray="8,12"/>
    <ellipse cx="300" cy="280" rx="188" ry="128" fill="none" stroke="url(#gold5)" stroke-width="4" stroke-opacity="0.3"/>
    <circle cx="102" cy="296" r="8" fill="url(#gold5)" stroke="#8B6914" stroke-width="1"/>
    <circle cx="498" cy="264" r="8" fill="url(#gold5)" stroke="#8B6914" stroke-width="1"/>
  </g>
  <text x="300" y="500" text-anchor="middle" font-family="serif" font-size="22" fill="#8B6914" letter-spacing="3">GOLD CHAIN BRACELET</text>
  <text x="300" y="535" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999">18K Gold</text>
</svg>`);

// ═══ 6. 실버 뱅글 팔찌 ═══
saveSVG('bracelet2.png', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="silver6" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#666"/>
      <stop offset="25%" style="stop-color:#B0B0B0"/>
      <stop offset="50%" style="stop-color:#F0F0F0"/>
      <stop offset="75%" style="stop-color:#B0B0B0"/>
      <stop offset="100%" style="stop-color:#666"/>
    </linearGradient>
    <radialGradient id="ball6" cx="35%" cy="30%">
      <stop offset="0%" style="stop-color:#F0F0F0"/>
      <stop offset="100%" style="stop-color:#888"/>
    </radialGradient>
    <filter id="shadow6"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.2"/></filter>
  </defs>
  <rect width="600" height="600" fill="#F8F4EF"/>
  <g filter="url(#shadow6)" transform="rotate(-10,300,280)">
    <path d="M 130,380 Q 100,280 130,180 Q 180,80 300,80 Q 420,80 470,180 Q 500,280 470,380" fill="none" stroke="url(#silver6)" stroke-width="18" stroke-linecap="round"/>
    <circle cx="130" cy="380" r="14" fill="url(#ball6)" stroke="#999" stroke-width="1"/>
    <circle cx="124" cy="374" r="3" fill="rgba(255,255,255,0.7)"/>
    <circle cx="470" cy="380" r="14" fill="url(#ball6)" stroke="#999" stroke-width="1"/>
    <circle cx="464" cy="374" r="3" fill="rgba(255,255,255,0.7)"/>
  </g>
  <text x="300" y="500" text-anchor="middle" font-family="serif" font-size="22" fill="#666" letter-spacing="3">SILVER BANGLE</text>
  <text x="300" y="535" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#999">Sterling Silver</text>
</svg>`);

console.log('\n✅ 제품 이미지 6개 생성 완료!');
