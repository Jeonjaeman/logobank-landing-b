/* ============================================================
   로고뱅크 — 이벤트 팝업 레이어
   - 관리자 페이지(admin/)에서 등록한 popups 테이블을 읽어 표시
   - 여러 개 동시 등록 시 계단식 배치 (top +40px, left +30px)
   - 제목/내용/이미지/링크 모두 선택. 하나라도 있으면 게시
   - 팝업별 가로폭(width), 노출기간(starts_at/ends_at), 정렬(sort_order)
   - "오늘 하루 열지 않기": localStorage 에 오늘 날짜 저장
   - 딤 배경 클릭 시 전체 닫기 / ESC 닫기
   - DB 미설정(LB_DB.ready=false)이면 아무것도 표시하지 않음
   ============================================================ */
(function () {
  "use strict";
  if (!window.LB_DB || !LB_DB.ready) return;

  var css = "" +
    "#lb-popup-root{position:fixed;inset:0;z-index:220;pointer-events:none}" +
    "#lb-popup-backdrop{position:absolute;inset:0;background:rgba(13,13,13,.55);pointer-events:auto;transition:opacity .25s}" +
    "#lb-popup-backdrop.hidden{display:none}" +
    ".lb-popup{position:absolute;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;" +
      "max-height:88vh;max-width:calc(100vw - 24px);background:#fff;border-radius:18px;" +
      "box-shadow:0 40px 100px -30px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.06)}" +
    ".lb-popup.hidden{display:none}" +
    ".lb-popup .pp-scroll{flex:1;min-height:0;overflow-y:auto}" +
    ".lb-popup img{display:block;width:100%}" +
    ".lb-popup .pp-txt{padding:22px 24px}" +
    ".lb-popup .pp-title{font-size:19px;font-weight:800;letter-spacing:-.02em;line-height:1.3;color:#0D0D0D}" +
    ".lb-popup .pp-body{white-space:pre-line;font-size:14px;line-height:1.7;color:#2B2B2B}" +
    ".lb-popup .pp-title+.pp-body{margin-top:10px}" +
    ".lb-popup .pp-link{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-size:14px;font-weight:700;color:#E0202E;text-decoration:none}" +
    ".lb-popup .pp-link:hover{text-decoration:underline}" +
    ".lb-popup .pp-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;" +
      "border-top:1px solid #E4E4DF;background:#F5F5F3;padding:11px 16px;font-size:12.5px;color:#6E6E6A}" +
    ".lb-popup .pp-bar label{display:flex;align-items:center;gap:7px;cursor:pointer;user-select:none}" +
    ".lb-popup .pp-bar input{accent-color:#E0202E;width:15px;height:15px;margin:0}" +
    ".lb-popup .pp-close{background:none;border:0;color:#0D0D0D;font:inherit;font-weight:700;cursor:pointer;font-size:12.5px;padding:4px 6px}" +
    ".lb-popup .pp-close:hover{color:#E0202E}" +
    "@media(max-width:640px){.lb-popup{top:64px!important;left:12px!important;right:12px!important;width:auto!important;transform:none!important}}";
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var todayKey = new Date().toISOString().slice(0, 10);
  function inWindow(p) {
    return (!p.starts_at || p.starts_at <= todayKey) && (!p.ends_at || p.ends_at >= todayKey);
  }

  LB_DB.get("popups?is_active=eq.true&select=*&order=sort_order.asc")
    .then(function (rows) {
      var pops = (rows || []).filter(inWindow).filter(function (p) { return p.title || p.body || p.image_url; });
      if (pops.length) render(pops);
    })
    .catch(function () { /* DB 미응답 시 조용히 넘어감 */ });

  function render(pops) {
    var root = document.createElement("div");
    root.id = "lb-popup-root";
    var backdrop = document.createElement("div");
    backdrop.id = "lb-popup-backdrop";
    backdrop.className = "hidden";
    root.appendChild(backdrop);

    var cards = [];
    pops.forEach(function (p, i) {
      var key = "lb-popup-hide-" + p.id;
      try { if (localStorage.getItem(key) === todayKey) return; } catch (e) {}

      var card = document.createElement("div");
      card.className = "lb-popup";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-label", p.title || "이벤트 안내");
      card.style.width = (p.width || 400) + "px";
      card.style.top = (84 + i * 40) + "px";
      card.style.left = "50%";
      card.style.transform = "translateX(calc(-50% + " + (i * 30) + "px))";

      var scroll = document.createElement("div");
      scroll.className = "pp-scroll";
      if (p.image_url) {
        var img = document.createElement("img");
        img.src = p.image_url;
        img.alt = p.title || "이벤트 이미지";
        if (p.link) {
          var wrap = document.createElement("a");
          wrap.href = p.link;
          if (/^https?:/i.test(p.link)) { wrap.target = "_blank"; wrap.rel = "noopener"; }
          wrap.appendChild(img);
          scroll.appendChild(wrap);
        } else {
          scroll.appendChild(img);
        }
      }
      if (p.title || p.body || (p.link && !p.image_url)) {
        var txt = document.createElement("div");
        txt.className = "pp-txt";
        if (p.title) { var t = document.createElement("p"); t.className = "pp-title"; t.textContent = p.title; txt.appendChild(t); }
        if (p.body)  { var b = document.createElement("p"); b.className = "pp-body";  b.textContent = p.body;  txt.appendChild(b); }
        if (p.link)  {
          var a = document.createElement("a"); a.className = "pp-link"; a.href = p.link; a.textContent = "자세히 보기 →";
          if (/^https?:/i.test(p.link)) { a.target = "_blank"; a.rel = "noopener"; }
          txt.appendChild(a);
        }
        scroll.appendChild(txt);
      }
      card.appendChild(scroll);

      var bar = document.createElement("div");
      bar.className = "pp-bar";
      var lbl = document.createElement("label");
      var chk = document.createElement("input");
      chk.type = "checkbox";
      lbl.appendChild(chk);
      lbl.appendChild(document.createTextNode("오늘 하루 열지 않기"));
      var close = document.createElement("button");
      close.type = "button";
      close.className = "pp-close";
      close.textContent = "닫기 ✕";
      close.addEventListener("click", function () {
        if (chk.checked) { try { localStorage.setItem(key, todayKey); } catch (e) {} }
        card.classList.add("hidden");
        sync();
      });
      bar.appendChild(lbl);
      bar.appendChild(close);
      card.appendChild(bar);

      root.appendChild(card);
      cards.push(card);
    });

    if (!cards.length) return;

    function sync() {
      var any = cards.some(function (c) { return !c.classList.contains("hidden"); });
      backdrop.classList.toggle("hidden", !any);
      if (!any) root.remove();
    }
    function closeAll() { cards.forEach(function (c) { c.classList.add("hidden"); }); sync(); }
    backdrop.addEventListener("click", closeAll);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
    document.body.appendChild(root);
    sync();
  }
})();
