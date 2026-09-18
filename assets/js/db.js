/* ============================================================
   로고뱅크 — Supabase 연결 (설정값은 이 파일 한 곳만 수정)
   - URL / KEY 가 비어 있으면 LB_DB.ready === false 가 되고,
     문의 폼은 데모 동작, 팝업은 미표시, 실적 갤러리는 정적 카드 유지.
   - KEY 는 공개용(anon / publishable) 키만 넣을 것. service_role 금지.
   ============================================================ */
window.LB_DB = (function () {
  "use strict";
  var URL = "";   /* 예: https://xxxxxxxxxxxx.supabase.co */
  var KEY = "";   /* 예: sb_publishable_... 또는 eyJ... (anon) */

  var ready = !!(URL && KEY);

  function headers(extra) {
    var h = { "apikey": KEY, "Authorization": "Bearer " + KEY };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  return {
    ready: ready,
    url: URL,
    key: KEY,

    /* 공개 읽기: 예) get("works?published=eq.true&order=sort_order.asc") */
    get: function (query) {
      if (!ready) return Promise.reject(new Error("db-not-configured"));
      return fetch(URL + "/rest/v1/" + query, { headers: headers() })
        .then(function (r) { if (!r.ok) throw new Error("db " + r.status); return r.json(); });
    },

    /* 익명 등록: 문의 접수 전용 (RLS 로 insert 만 허용) */
    insert: function (table, row) {
      if (!ready) return Promise.reject(new Error("db-not-configured"));
      return fetch(URL + "/rest/v1/" + table, {
        method: "POST",
        headers: headers({ "Content-Type": "application/json", "Prefer": "return=minimal" }),
        body: JSON.stringify(row)
      }).then(function (r) { if (!r.ok) throw new Error("db " + r.status); });
    },

    /* 익명 파일 업로드: 문의 시 첨부 로고 (images 버킷 inquiries/ 경로만 허용) */
    uploadPublic: function (path, file) {
      if (!ready) return Promise.reject(new Error("db-not-configured"));
      return fetch(URL + "/storage/v1/object/images/" + path, {
        method: "POST",
        headers: headers({ "Content-Type": file.type || "application/octet-stream" }),
        body: file
      }).then(function (r) {
        if (!r.ok) throw new Error("upload " + r.status);
        return URL + "/storage/v1/object/public/images/" + path;
      });
    },

    safeName: function (name) {
      return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    }
  };
})();
