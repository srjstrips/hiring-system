importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase config injected at build time via a meta tag approach is not possible in SW.
// The SW reads config from the URL query string set during registration.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const config = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        self.registration.showNotification(title, {
          body: body || '',
          icon: '/SRJ-FINAL-LOGO.png',
        });
      }
    });
  }
});
