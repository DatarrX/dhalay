(function () {
  "use strict";

  var styleId = "dhalay-widget-style";
  var ns = "dhalay";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function addStyles() {
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      ".dhalay-widget{--dhalay-font:inherit;--dhalay-text:inherit;--dhalay-accent:#60151C;--dhalay-muted:color-mix(in srgb,var(--dhalay-text) 65%,transparent);font-family:var(--dhalay-font);color:var(--dhalay-text);line-height:1.75;max-width:100%;}" +
      ".dhalay-widget *{box-sizing:border-box}.dhalay-header{display:flex;gap:1rem;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem}.dhalay-kicker{margin:0 0 .25rem;color:var(--dhalay-muted);font-size:.82rem}.dhalay-title{margin:0;line-height:1.25}.dhalay-summary{opacity:.85}.dhalay-tags{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;padding:0}.dhalay-tags li{border:1px solid color-mix(in srgb,var(--dhalay-accent) 25%,transparent);border-radius:999px;padding:.15rem .55rem;font-size:.85rem}.dhalay-language-switch{white-space:nowrap;border:1px solid var(--dhalay-accent);background:transparent;color:var(--dhalay-accent);border-radius:.45rem;padding:.45rem .7rem;cursor:pointer}.dhalay-article-language{margin:1.25rem 0}.dhalay-article-language img{max-width:100%;height:auto}.dhalay-article-language a,.dhalay-sources a{color:var(--dhalay-accent)}.dhalay-sources{border-top:1px solid color-mix(in srgb,var(--dhalay-text) 18%,transparent);margin-top:1.5rem;padding-top:.75rem}.dhalay-sources ol{padding-inline-start:1.5rem}.dhalay-footer{text-align:center;margin-top:1.25rem}.dhalay-pill{border:0;border-radius:999px;padding:.55rem .8rem;background:color-mix(in srgb,var(--dhalay-accent) 10%,transparent);color:var(--dhalay-accent);cursor:pointer;font:inherit}.dhalay-modal{max-width:min(680px,calc(100vw - 2rem));width:680px;border:1px solid color-mix(in srgb,var(--dhalay-accent) 25%,transparent);border-radius:1rem;padding:0;color:var(--dhalay-text);background:Canvas}.dhalay-modal::backdrop{background:rgb(0 0 0 / .45)}.dhalay-modal-inner{padding:1.25rem}.dhalay-modal-top{display:flex;justify-content:space-between;gap:1rem}.dhalay-modal-close{border:0;background:transparent;color:inherit;font-size:1.25rem;cursor:pointer}.dhalay-modal-tabs{display:flex;gap:.4rem;margin:.8rem 0}.dhalay-modal-tabs button{border:1px solid var(--dhalay-accent);background:transparent;color:var(--dhalay-accent);border-radius:.35rem;padding:.35rem .65rem;cursor:pointer}.dhalay-modal-tabs button[aria-selected=true]{background:var(--dhalay-accent);color:white}.dhalay-directory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem}.dhalay-card{display:block;padding:.9rem;border:1px solid color-mix(in srgb,var(--dhalay-text) 14%,transparent);border-radius:.65rem;text-decoration:none;color:inherit}.dhalay-card:hover{border-color:var(--dhalay-accent)}.dhalay-loading{opacity:.7}";
    document.head.appendChild(style);
  }

  function scriptApiBase() {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (/dhalay-widget(?:\.min)?\.js(?:$|\?)/.test(src)) {
        return new URL("../../api/v1/", src).toString();
      }
    }
    return "/api/v1/";
  }

  function selectedApiBase(container) {
    var configured = container && container.getAttribute("data-dhalay-api");
    if (configured) return configured.replace(/\/$/, "") + "/";
    var globalConfig = window.dhalayConfig || {};
    if (globalConfig.apiBase) return String(globalConfig.apiBase).replace(/\/$/, "") + "/";
    var base = scriptApiBase();
    return String(base).replace(/\/$/, "") + "/";
  }

  function selectedSlug() {
    var pathParts = window.location.pathname.split("/").filter(Boolean);
    var last = pathParts[pathParts.length - 1];
    if (last && /-(myanmar|english)$/.test(last)) {
      return decodeURIComponent(last);
    }
    var params = new URLSearchParams(window.location.search);
    if (params.get("dhalay")) return params.get("dhalay");
    var hash = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    if (hash && /-(myanmar|english)$/.test(hash)) return decodeURIComponent(hash);
    return "";
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("dhalay: unable to load " + url + " (" + response.status + ")");
      return response.json();
    });
  }

  function ensureMeta(name, attribute) {
    var selector = 'meta[' + attribute + '="' + name + '"]';
    var meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }
    return meta;
  }

  function setLinkRel(rel, hreflang, href) {
    var selector = 'link[rel="' + rel + '"]' + (hreflang ? '[hreflang="' + hreflang + '"]' : "");
    var link = document.head.querySelector(selector);
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", rel);
      if (hreflang) link.setAttribute("hreflang", hreflang);
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }

  function injectJsonLd(page) {
    var id = "dhalay-jsonld-" + page.slug;
    var existing = document.getElementById(id);
    var script = existing || document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(page.jsonLd);
    if (!existing) document.head.appendChild(script);
  }

  function applySeo(page) {
    document.title = page.title + " | dhalay";
    ensureMeta("description", "name").setAttribute("content", page.summary);
    ensureMeta("og:title", "property").setAttribute("content", page.title);
    ensureMeta("og:description", "property").setAttribute("content", page.summary);
    ensureMeta("og:type", "property").setAttribute("content", "article");
    ensureMeta("og:locale", "property").setAttribute("content", page.lang === "my" ? "my_MM" : "en_US");
    setLinkRel("alternate", "my", window.location.href.replace(/([?#].*)$/, "").replace(/[^/]*$/, page.baseSlug + "-myanmar"));
    setLinkRel("alternate", "en", window.location.href.replace(/([?#].*)$/, "").replace(/[^/]*$/, page.baseSlug + "-english"));
  }

  function modalCard() {
    var dialog = document.createElement("dialog");
    dialog.className = "dhalay-modal";
    dialog.setAttribute("aria-label", "DatarrX open data attribution");
    dialog.innerHTML =
      '<div class="dhalay-modal-inner">' +
      '<div class="dhalay-modal-top"><strong>⚡ Open Data by DatarrX · CC BY 4.0</strong><button class="dhalay-modal-close" type="button" aria-label="Close attribution">×</button></div>' +
      '<div class="dhalay-modal-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-dhalay-tab="mm">မြန်မာ</button><button type="button" role="tab" aria-selected="false" data-dhalay-tab="en">English</button></div>' +
      '<div data-dhalay-panel="mm" lang="my"><p><strong>DatarrX (ဒေတာ-အက်စ်)</strong> — မြန်မာနိုင်ငံ၏ ပထမဦးဆုံး အကျိုးအမြတ်မဲ့ Open-Source NLP &amp; Data Research Foundation ဖြစ်ပြီး <em>Defining the Unknown through Rigorous Data Research</em> ကို မူဘောင်အဖြစ် လုပ်ဆောင်သည်။</p><p><strong>MyanmarXiv:</strong> မြန်မာစာဖြင့် လုပ်ဆောင်သော သုတေသနစာတမ်းများအတွက် Open Scholarly Archive။</p><p><strong>dhalay:</strong> မြန်မာ့ရိုးရာဝတ်စားဆင်ယင်မှုနှင့် ယဉ်ကျေးမှုသမိုင်းအတွက် Open-source AI/RAG-ready repository။</p></div>' +
      '<div data-dhalay-panel="en" lang="en" hidden><p><strong>DatarrX (ဒေတာ-အက်စ်)</strong> is Myanmar\'s first non-profit, open-source NLP and data research foundation — <em>Defining the Unknown through Rigorous Data Research</em>.</p><p><strong>MyanmarXiv:</strong> The Open Scholarly Archive for Research in Myanmar Script.</p><p><strong>dhalay:</strong> An open-source, AI/RAG-ready digital knowledge repository for Myanmar traditional attire and cultural heritage.</p></div>' +
      '</div>';
    document.body.appendChild(dialog);
    var close = dialog.querySelector(".dhalay-modal-close");
    close.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll("[data-dhalay-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var language = tab.getAttribute("data-dhalay-tab");
        dialog.querySelectorAll("[data-dhalay-tab]").forEach(function (item) {
          item.setAttribute("aria-selected", item === tab ? "true" : "false");
        });
        dialog.querySelectorAll("[data-dhalay-panel]").forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-dhalay-panel") !== language;
        });
      });
    });
    return dialog;
  }

  function openModal() {
    var dialog = document.querySelector(".dhalay-modal") || modalCard();
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function renderPage(container, page) {
    container.classList.add("dhalay-widget");
    var switchLabel = page.lang === "my" ? "Read in English" : "မြန်မာဘာသာဖြင့်ဖတ်ရန်";
    var tags = page.tags.map(function (tag) { return "<li>" + escapeHtml(tag) + "</li>"; }).join("");
    container.innerHTML =
      '<div class="dhalay-header">' +
        '<div><p class="dhalay-kicker">' + escapeHtml(page.category) + '</p><h1 class="dhalay-title">' + escapeHtml(page.title) + '</h1></div>' +
        '<button type="button" class="dhalay-language-switch" data-dhalay-switch="' + escapeHtml(page.alternateSlug) + '">' + escapeHtml(switchLabel) + '</button>' +
      '</div>' +
      '<p class="dhalay-summary">' + escapeHtml(page.summary) + '</p>' +
      '<ul class="dhalay-tags" aria-label="Tags">' + tags + '</ul>' +
      page.bodyHtml +
      '<footer class="dhalay-footer"><button type="button" class="dhalay-pill" aria-haspopup="dialog">⚡ Open Data by DatarrX · CC BY 4.0</button></footer>';

    var switchButton = container.querySelector("[data-dhalay-switch]");
    switchButton.addEventListener("click", function () {
      loadPage(container, switchButton.getAttribute("data-dhalay-switch"));
    });
    var pill = container.querySelector(".dhalay-pill");
    pill.addEventListener("click", openModal);
    pill.addEventListener("mouseenter", openModal);
    pill.addEventListener("focus", openModal);
    applySeo(page);
    injectJsonLd(page);
  }

  function loadPage(container, slug) {
    container.classList.add("dhalay-loading");
    var apiBase = selectedApiBase(container);
    fetchJson(apiBase + "pages/" + encodeURIComponent(slug) + ".json")
      .then(function (page) {
        container.classList.remove("dhalay-loading");
        renderPage(container, page);
        if (container.getAttribute("data-dhalay-update-url") !== "false") {
          var url = new URL(window.location.href);
          url.searchParams.delete("dhalay");
          url.hash = "";
          var pathEnd = url.pathname.replace(/[^/]*$/, "");
          url.pathname = pathEnd + page.slug;
          history.pushState({ dhalaySlug: page.slug }, "", url);
        }
      })
      .catch(function (error) {
        container.classList.remove("dhalay-loading");
        container.innerHTML = '<p role="alert">' + escapeHtml(error.message) + "</p>";
        console.error(error);
      });
  }

  function renderDirectory(container) {
    container.classList.add("dhalay-widget", "dhalay-loading");
    fetchJson(selectedApiBase(container) + "index.json")
      .then(function (index) {
        container.classList.remove("dhalay-loading");
        container.innerHTML =
          '<h1 class="dhalay-title">dhalay Knowledge Directory</h1>' +
          '<p class="dhalay-summary">Bilingual cultural knowledge by DatarrX.</p>' +
          '<div class="dhalay-directory-grid">' +
          index.items.map(function (item) {
            return '<a class="dhalay-card" href="?dhalay=' + encodeURIComponent(item.slug) + '"><small>' + escapeHtml(item.lang === "my" ? "မြန်မာ" : "English") + '</small><h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.summary) + '</p></a>';
          }).join("") +
          "</div>";
      })
      .catch(function (error) {
        container.classList.remove("dhalay-loading");
        container.innerHTML = '<p role="alert">' + escapeHtml(error.message) + "</p>";
      });
  }

  function init() {
    addStyles();
    var containers = document.querySelectorAll("[data-dhalay-slug]");
    containers.forEach(function (container) {
      var slug = container.getAttribute("data-dhalay-slug") || selectedSlug();
      if (slug) loadPage(container, slug);
      else renderDirectory(container);
    });
    if (!containers.length) {
      var slug = selectedSlug();
      var mount = document.querySelector("[data-dhalay]");
      if (slug) {
        if (!mount) {
          mount = document.createElement("main");
          mount.setAttribute("data-dhalay", "");
          document.body.appendChild(mount);
        }
        loadPage(mount, slug);
      } else if (mount) {
        renderDirectory(mount);
      } else {
        var autoMount = document.querySelector("body");
        if (autoMount && window.dhalayConfig && window.dhalayConfig.autoMount) {
          mount = document.createElement("main");
          mount.setAttribute("data-dhalay", "");
          document.body.appendChild(mount);
          renderDirectory(mount);
        }
      }
    }
  }

  window.dhalayWidget = { init: init, loadPage: loadPage };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
