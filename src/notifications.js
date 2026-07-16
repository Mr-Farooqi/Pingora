// notifications.js — Notification helper functions
// Save this as src/notifications.js

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("❌ Browser notifications support nahi karta");
    return false;
  }
  if (Notification.permission === "granted") {
    console.log("✅ Permission already granted");
    return true;
  }
  if (Notification.permission === "denied") {
    console.log("❌ Permission denied hai - browser settings se enable karo");
    return false;
  }

  const permission = await Notification.requestPermission();
  console.log("Permission result:", permission);
  return permission === "granted";
};

export const showNotification = (title, body, icon, onClick) => {
  console.log("🔔 showNotification called:", title, body);

  if (!("Notification" in window)) {
    console.log("❌ Notification API not available");
    return;
  }
  if (Notification.permission !== "granted") {
    console.log("❌ Permission not granted:", Notification.permission);
    return;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: "chat-message-" + Date.now(), // unique tag - har baar nayi notification
      renotify: true,
      silent: false,
    });

    console.log("✅ Notification created successfully");

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (onClick) onClick();
    };

    notif.onerror = (err) => {
      console.log("❌ Notification error:", err);
    };

    setTimeout(() => notif.close(), 6000);
  } catch (err) {
    console.log("❌ Notification creation failed:", err);
  }
};

export const playNotificationSound = () => {
  try {
    const audio = new Audio(
      "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC7k8sWXR5O3FRkYEhDgrCMSyZIRTpwwAZkmpWy2D5xnNqkA9P3GMVwhg+1jdwI2qX4ZAhBcCXC9JlrjPdR+EwvJ/Pp/7eFGE4MTKlmQRyP4cgFFkfGfGLN9JZTmAOyQYwTpDvFlMfQGCKpJWyXgFRJpBxCQkJSU"
    );
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};