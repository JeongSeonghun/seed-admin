// 백그라운드(탭이 닫혀 있거나 포커스가 없을 때) 푸시 수신용 서비스워커.
// public/ 밑의 정적 파일이라 Vite의 import.meta.env를 못 읽으므로,
// 아래 값은 .env.development / .env.production의 VITE_FIREBASE_* 값과 동일하게 직접 채워야 한다.
// (Firebase 콘솔 > 프로젝트 설정 > 일반 탭의 웹 앱 설정값 — 공개돼도 안전한 값들)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCjqP2FT0_yeL-xgppqfmhrTo18wZFO7Ac',
  authDomain: 'gundsh-faff3.firebaseapp.com',
  projectId: 'gundsh-faff3',
  messagingSenderId: '223910099187',
  appId: '1:223910099187:web:1893fc3d6287b8c0941f86',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? '알림';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: payload.data,
  });
});
