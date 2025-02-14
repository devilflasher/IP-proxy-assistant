// Service Worker 基本设置
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// 直接导入主要功能
try {
    importScripts('background.js');
    console.debug('Service Worker 加载成功');
} catch (error) {
    console.debug('Service Worker 加载失败:', error);
}

// 保持 Service Worker 活跃
self.addEventListener('fetch', (event) => {
    // 保持 Service Worker 活跃
});

// 处理消息
self.addEventListener('message', (event) => {
    if (event.data === 'ping') {
        event.ports[0].postMessage({ 
            status: serviceWorkerState.isLoaded ? 'ready' : 'loading' 
        });
    }
}); 