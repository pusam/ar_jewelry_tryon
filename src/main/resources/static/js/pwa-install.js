(function () {
    'use strict';

    // Service Worker 등록
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // PWA 설치 프롬프트
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    function showInstallBanner() {
        // 이미 배너가 있으면 무시
        if (document.querySelector('.install-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'install-banner show';
        banner.innerHTML = `
            <p><strong>AR Jewelry</strong> 앱을 설치하면 더 빠르게 가상 착용할 수 있어요!</p>
            <button class="btn btn-primary" id="installBtn">설치하기</button>
            <button class="dismiss" id="dismissBtn">✕</button>
        `;
        document.body.appendChild(banner);

        document.getElementById('installBtn').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const result = await deferredPrompt.userChoice;
                if (result.outcome === 'accepted') {
                    banner.remove();
                }
                deferredPrompt = null;
            }
        });

        document.getElementById('dismissBtn').addEventListener('click', () => {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 300);
        });
    }

    // 딥링크 처리: 외부 사이트에서 tryon-btn 클릭 시
    // PWA가 설치되지 않은 경우 설치 유도
    document.querySelectorAll('.tryon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isPWA = window.matchMedia('(display-mode: standalone)').matches
                || window.navigator.standalone === true;

            if (!isPWA && deferredPrompt) {
                e.preventDefault();
                const targetUrl = btn.href;
                // 설치 후 해당 URL로 이동
                showInstallBanner();
                // 설치하지 않아도 바로 이동 가능하도록 타이머
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 3000);
            }
            // PWA이거나 설치 프롬프트가 없으면 그냥 이동
        });
    });
})();
