(function () {
  "use strict";

  var styleId = "dhalay-widget-style";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function addStyles() {
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      ".dhalay-widget{--dhalay-font:inherit;--dhalay-text:inherit;--dhalay-accent:#60151C;--dhalay-muted:color-mix(in srgb,var(--dhalay-text) 65%,transparent);--dhalay-border:color-mix(in srgb,var(--dhalay-text) 15%,transparent);font-family:var(--dhalay-font);color:var(--dhalay-text);line-height:1.8;max-width:100%;}" +
      ".dhalay-widget *{box-sizing:border-box}" +
      ".dhalay-header{margin-bottom:1.25rem}" +
      ".dhalay-kicker{margin:0 0 .35rem;color:var(--dhalay-accent);font-size:.82rem;font-weight:600;letter-spacing:.02em;text-transform:uppercase}" +
      ".dhalay-title{margin:0 0 .6rem;line-height:1.35}" +
      ".dhalay-summary{margin:0 0 .85rem;color:var(--dhalay-muted);font-size:.96rem}" +
      ".dhalay-tags{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;padding:0;margin:0 0 1.25rem}" +
      ".dhalay-tags li{border:1px solid color-mix(in srgb,var(--dhalay-accent) 25%,transparent);border-radius:999px;padding:.15rem .6rem;font-size:.82rem}" +
      ".dhalay-article-language{margin:1.25rem 0}" +
      ".dhalay-article-language:first-of-type>h1:first-child{display:none}" +
      ".dhalay-article-language+.dhalay-article-language{border-top:1px dashed var(--dhalay-border);margin-top:2rem;padding-top:1.5rem}" +
      ".dhalay-article-language img{max-width:100%;height:auto}" +
      ".dhalay-article-language a,.dhalay-sources a,.dhalay-footer a{color:var(--dhalay-accent);text-decoration:underline;text-underline-offset:2px}" +
      ".dhalay-sources{border-top:1px solid var(--dhalay-border);margin-top:1.75rem;padding-top:1rem}" +
      ".dhalay-sources h2{font-size:1.1rem;margin:0 0 .6rem}" +
      ".dhalay-sources ol{padding-inline-start:1.35rem;margin:0;font-size:.92rem}" +
      ".dhalay-sources li{margin-bottom:.35rem}" +
      ".dhalay-footer{border-top:1px solid var(--dhalay-border);margin-top:1.5rem;padding-top:.85rem;font-size:.84rem;color:var(--dhalay-muted)}" +
      ".dhalay-footer p{margin:0}" +
      ".dhalay-directory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.85rem;margin-top:1rem}" +
      ".dhalay-card{display:block;padding:1rem;border:1px solid var(--dhalay-border);border-radius:.65rem;text-decoration:none;color:inherit;transition:border-color .15s ease}" +
      ".dhalay-card:hover{border-color:var(--dhalay-accent)}" +
      ".dhalay-card small{color:var(--dhalay-accent);font-weight:600}" +
      ".dhalay-card h2{font-size:1.08rem;margin:.3rem 0 .45rem;line-height:1.35}" +
      ".dhalay-card p{margin:0;font-size:.9rem;color:var(--dhalay-muted)}" +
      ".dhalay-loading{opacity:.65}";
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
    return "https://dhalay.datarrx.org/api/v1/";
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
    var params = new URLSearchParams(window.location.search);
    if (params.get("dhalay")) return params.get("dhalay").trim();
    var hash = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    if (hash && /-(myanmar|english)$/.test(hash)) return decodeURIComponent(hash);
    var pathParts = window.location.pathname.split("/").filter(Boolean);
    var last = pathParts[pathParts.length - 1];
    if (last && /-(myanmar|english)$/.test(last)) {
      return decodeURIComponent(last);
    }
    return "";
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) {
        throw new Error("Dhalay: unable to load " + url + " (" + response.status + ")");
      }
      return response.json();
    });
  }

  function ensureMeta(name, attribute) {
    var selector = "meta[" + attribute + '="' + name + '"]';
    var meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }
    return meta;
  }

  function injectJsonLd(page) {
    if (!page.jsonLd) return;
    var id = "dhalay-jsonld-" + page.slug;
    var existing = document.getElementById(id);
    var script = existing || document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(page.jsonLd);
    if (!existing) document.head.appendChild(script);
  }

  function applySeo(container, page) {
    if (container && container.getAttribute("data-dhalay-seo") === "false") return;
    document.title = page.title + " | Dhalay";
    ensureMeta("description", "name").setAttribute("content", page.summary);
    ensureMeta("og:title", "property").setAttribute("content", page.title);
    ensureMeta("og:description", "property").setAttribute("content", page.summary);
    ensureMeta("og:type", "property").setAttribute("content", "article");
    ensureMeta("og:locale", "property").setAttribute(
      "content",
      page.lang === "my" ? "my_MM" : "en_US"
    );
  }

  function buildShortFooter(lang) {
    if (lang === "my") {
      return (
        '<footer class="dhalay-footer" lang="my">' +
        '<p>ဤအချက်အလက်များကို <a href="https://datarrx.org/" target="_blank" rel="noopener noreferrer">DatarrX Foundation</a> ' +
        '(<a href="https://dhalay.datarrx.org" target="_blank" rel="noopener noreferrer">Dhalay</a> နှင့် ' +
        '<a href="https://myanmarxiv.datarrx.org" target="_blank" rel="noopener noreferrer">MyanmarXiv</a>) မှ ' +
        '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> လိုင်စင်ဖြင့် အခမဲ့ မျှဝေထားပါသည်။</p>' +
        "</footer>"
      );
    }
    return (
      '<footer class="dhalay-footer" lang="en">' +
      '<p>Open cultural data curated by <a href="https://datarrx.org/" target="_blank" rel="noopener noreferrer">DatarrX Foundation</a> ' +
      '(<a href="https://dhalay.datarrx.org" target="_blank" rel="noopener noreferrer">Dhalay</a> &amp; ' +
      '<a href="https://myanmarxiv.datarrx.org" target="_blank" rel="noopener noreferrer">MyanmarXiv</a>) under ' +
      '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.</p>' +
      "</footer>"
    );
  }

  function renderPage(container, page) {
    container.classList.add("dhalay-widget");
    var tags = (page.tags || [])
      .map(function (tag) {
        return "<li>" + escapeHtml(tag) + "</li>";
      })
      .join("");

    container.innerHTML =
      '<header class="dhalay-header">' +
      (page.category ? '<p class="dhalay-kicker">' + escapeHtml(page.category) + "</p>" : "") +
      '<h1 class="dhalay-title">' +
      escapeHtml(page.title) +
      "</h1>" +
      (page.summary ? '<p class="dhalay-summary">' + escapeHtml(page.summary) + "</p>" : "") +
      (tags ? '<ul class="dhalay-tags" aria-label="Tags">' + tags + "</ul>" : "") +
      "</header>" +
      page.bodyHtml +
      buildShortFooter(page.lang);

    applySeo(container, page);
    injectJsonLd(page);
  }

  function loadPage(container, slug) {
    container.classList.add("dhalay-loading");
    var apiBase = selectedApiBase(container);
    fetchJson(apiBase + "pages/" + encodeURIComponent(slug) + ".json")
      .then(function (page) {
        container.classList.remove("dhalay-loading");
        renderPage(container, page);
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
          '<header class="dhalay-header">' +
          '<p class="dhalay-kicker">DatarrX Open Knowledge</p>' +
          '<h1 class="dhalay-title">Dhalay Knowledge Directory</h1>' +
          '<p class="dhalay-summary">မြန်မာ့ရိုးရာ ဝတ်စားဆင်ယင်မှုနှင့် ယဉ်ကျေးမှု အချက်အလက်များ စုစည်းရာ အရင်းအမြစ်။</p>' +
          "</header>" +
          '<div class="dhalay-directory-grid">' +
          (index.items || [])
            .map(function (item) {
              return (
                '<a class="dhalay-card" href="?dhalay=' +
                encodeURIComponent(item.slug) +
                '" data-dhalay-card="' +
                escapeHtml(item.slug) +
                '">' +
                "<small>" +
                escapeHtml(item.lang === "my" ? "မြန်မာ" : "English") +
                "</small>" +
                "<h2>" +
                escapeHtml(item.title) +
                "</h2>" +
                "<p>" +
                escapeHtml(item.summary) +
                "</p>" +
                "</a>"
              );
            })
            .join("") +
          "</div>" +
          buildShortFooter("my");

        container.querySelectorAll("[data-dhalay-card]").forEach(function (card) {
          card.addEventListener("click", function (event) {
            event.preventDefault();
            var targetSlug = card.getAttribute("data-dhalay-card");
            var url = new URL(window.location.href);
            url.searchParams.set("dhalay", targetSlug);
            history.pushState({ dhalaySlug: targetSlug }, "", url);
            loadPage(container, targetSlug);
          });
        });
      })
      .catch(function (error) {
        container.classList.remove("dhalay-loading");
        container.innerHTML = '<p role="alert">' + escapeHtml(error.message) + "</p>";
      });
  }

  function init() {
    addStyles();
    var containers = document.querySelectorAll("[data-dhalay-slug], [data-dhalay]");
    if (containers.length) {
      containers.forEach(function (container) {
        var explicitSlug = container.getAttribute("data-dhalay-slug");
        var slug = explicitSlug || selectedSlug();
        if (slug) loadPage(container, slug);
        else renderDirectory(container);
      });
      return;
    }

    var urlSlug = selectedSlug();
    if (urlSlug || (window.dhalayConfig && window.dhalayConfig.autoMount)) {
      var mount = document.createElement("main");
      mount.setAttribute("data-dhalay", "");
      document.body.appendChild(mount);
      if (urlSlug) loadPage(mount, urlSlug);
      else renderDirectory(mount);
    }
  }

  window.dhalayWidget = { init: init, loadPage: loadPage };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();