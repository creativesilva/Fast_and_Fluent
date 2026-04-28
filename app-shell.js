(function () {
  const APP_VERSION = "2026-04-28-mobile-shell-1";
  const VERSION_KEY = "rocketBookGamesVersion";
  const docEl = document.documentElement;

  function isStandaloneMode() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true;
  }

  function updateModeClass() {
    docEl.classList.toggle("standalone-app", isStandaloneMode());
    docEl.classList.toggle("browser-chrome", !isStandaloneMode());
  }

  function updateViewportSize() {
    const visualViewport = window.visualViewport;
    const height = visualViewport ? visualViewport.height : window.innerHeight;
    docEl.style.setProperty("--app-visual-height", `${height}px`);
  }

  function showCelebrationImage(img, srcPromise, fallbackSrc) {
    if (!img) return Promise.resolve();
    const fallback = fallbackSrc || "rocket_book_logo.png";

    img.classList.add("is-loading");
    img.removeAttribute("src");

    return Promise.resolve(srcPromise)
      .catch(() => fallback)
      .then((src) => {
        const finalSrc = src || fallback;

        return new Promise((resolve) => {
          let usedFallback = finalSrc === fallback;

          img.onload = function () {
            img.classList.remove("is-loading");
            resolve(img.src);
          };

          img.onerror = function () {
            if (!usedFallback) {
              usedFallback = true;
              img.src = fallback;
              return;
            }
            img.classList.remove("is-loading");
            resolve("");
          };

          img.src = finalSrc;
        });
      });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;

    navigator.serviceWorker.register("./service-worker.js").then((registration) => {
      registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  async function checkForUpdate() {
    if (!/^https?:$/.test(window.location.protocol)) return;

    try {
      const response = await fetch(`version.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const liveVersion = data && data.version;
      if (!liveVersion) return;

      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (!storedVersion) {
        localStorage.setItem(VERSION_KEY, liveVersion);
        return;
      }

      if (storedVersion !== liveVersion) {
        localStorage.setItem(VERSION_KEY, liveVersion);
        const reloadKey = `rocketBookReloaded:${liveVersion}`;
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
      }
    } catch (error) {}
  }

  window.RocketBookApp = {
    version: APP_VERSION,
    isStandaloneMode,
    showCelebrationImage,
    checkForUpdate
  };

  updateModeClass();
  updateViewportSize();
  registerServiceWorker();
  checkForUpdate();

  window.addEventListener("resize", updateViewportSize);
  window.addEventListener("orientationchange", updateViewportSize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportSize);
  }
  window.addEventListener("focus", checkForUpdate);
  document.addEventListener("visibilitychange", () => {
    updateModeClass();
    updateViewportSize();
    if (!document.hidden) checkForUpdate();
  });
  setInterval(checkForUpdate, 5 * 60 * 1000);
})();
