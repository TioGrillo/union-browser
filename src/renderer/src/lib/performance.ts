import type { Settings } from "@/types";
import { invoke } from "@/lib/ipc";

export function applyPerformanceToWebview(
  webview: any,
  settings: Settings
) {
  if (!webview) return;

  const fps = settings.fpsLimit === 0 ? 60 : settings.fpsLimit;
  invoke("performance:apply-fps", fps).catch(() => {});

  const injectAll = () => {
    applyFrameRateLimit(webview, settings.fpsLimit);

    if (settings.backgroundThrottling) {
      webview.executeJavaScript(`
        (function() {
          if (window.__BG_THROTTLE_INJECT__) return;
          window.__BG_THROTTLE_INJECT__ = true;
          document.addEventListener("visibilitychange", function() {
            window.__BG_PAUSED__ = document.hidden;
          });
        })();
      `).catch(() => {});
    }
  };

  webview.addEventListener("dom-ready", injectAll);
  webview.addEventListener("did-navigate", () => setTimeout(injectAll, 300));
}

function applyFrameRateLimit(webview: any, fps: number) {
  const inject = () => {
    if (fps === 0) {
      webview.executeJavaScript(`
        if (window.__FPS_THROTTLE__) {
          cancelAnimationFrame(window.__FPS_THROTTLE__);
          window.__FPS_THROTTLE__ = null;
        }
        window.__FPS_APPLIED__ = false;
      `).catch(() => {});
      return;
    }

    const interval = 1000 / fps;
    webview.executeJavaScript(`
      (function() {
        if (window.__FPS_APPLIED__) return;
        window.__FPS_APPLIED__ = true;
        var __targetInterval = ${interval};
        var __lastTime = performance.now();
        var __origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(cb) {
          return __origRAF.call(window, function(ts) {
            var __delta = ts - __lastTime;
            if (__delta < __targetInterval) {
              var __wait = __targetInterval - __delta;
              setTimeout(function() {
                __lastTime = performance.now();
                cb(performance.now());
              }, __wait);
            } else {
              __lastTime = ts;
              cb(ts);
            }
          });
        };
      })();
    `).catch(() => {});
  };

  inject();
  webview.addEventListener("did-navigate", () => setTimeout(inject, 300));
}

export function buildLowPowerScript(): string {
  return `
(function() {
  if (window.__LOW_POWER__) return;
  window.__LOW_POWER__ = true;

  var style = document.createElement("style");
  style.textContent = "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }";
  document.head.appendChild(style);

  try { document.documentElement.style.scrollBehavior = "auto"; } catch(e) {}

  console.log("[UNION] Low power mode applied");
})();
`;
}
