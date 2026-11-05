/**
 * Web Push Bildirim Yöneticisi (PWA Push API & Kilit Ekranı)
 */

export const VAPID_PUBLIC_KEY = 'BDnRuh7ebajipe5pRdbsIMAKqf5iEUmThXPOXuYlcXX_5-G0pbOTm4-7axfxz5dJvloVZyNnUHlef0BmU79jMnM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function subscribeToPush(
  roomCode: string,
  profileId: string,
  apiBase: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Bu tarayıcı kilit ekranı bildirimlerini desteklemiyor.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Bildirim izni verilmedi.' };
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey.buffer as ArrayBuffer,
      });
    }

    const subJson = sub.toJSON();

    const response = await fetch(`${apiBase}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: profileId,
        subscription: subJson,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Sunucuya bildirim aboneliği kaydedilemedi.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Push subscription failed:', err);
    return { success: false, error: err?.message || 'Bildirim kaydedilirken bir hata oluştu.' };
  }
}

export async function sendTestPush(
  roomCode: string,
  profileId: string,
  apiBase: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${apiBase}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/test-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId }),
    });
    if (!res.ok) {
      return { success: false, message: 'Test bildirimi gönderilemedi.' };
    }
    return { success: true, message: 'Test bildirimi gönderildi! Telefonunun kilit ekranını kontrol et.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'İstek başarısız oldu.' };
  }
}
