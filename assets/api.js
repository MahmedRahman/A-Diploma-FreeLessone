(function () {
  function apiBase() {
    const p = window.location.pathname;
    const i = p.lastIndexOf("/");
    return i > 0 ? p.slice(0, i) : "";
  }

  async function apiFetch(path, options) {
    const res = await fetch(apiBase() + path, options);
    const text = await res.text();
    const trimmed = text.trim();

    if (trimmed.startsWith("<")) {
      throw new Error(
        "السيرفر رجّع صفحة HTML بدل JSON. تأكد من: ١) تشغيل npm start أو pm2  ٢) git pull لآخر تحديث  ٣) إعداد nginx يوجّه /api إلى Node"
      );
    }

    let data;
    try {
      data = trimmed ? JSON.parse(text) : {};
    } catch {
      throw new Error("رد السيرفر غير صالح — جرّب إعادة تشغيل السيرفر (npm start)");
    }

    if (!res.ok) {
      throw new Error(data.error || "فشل الطلب (" + res.status + ")");
    }

    return data;
  }

  window.AppApi = { base: apiBase, fetch: apiFetch };
})();
