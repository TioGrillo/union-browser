import { create } from "zustand";

interface MirrorState {
  masterAccountId: string | null;
  workspaceId: string | null;
  isCapturing: boolean;

  setMaster: (accountId: string | null, workspaceId: string | null) => void;
  clearMaster: () => void;
  setCapturing: (v: boolean) => void;
}

export const useMirrorStore = create<MirrorState>((set, get) => ({
  masterAccountId: null,
  workspaceId: null,
  isCapturing: false,

  setMaster: (accountId, workspaceId) => {
    set({ masterAccountId: accountId, workspaceId, isCapturing: true });
  },

  clearMaster: () => {
    set({ masterAccountId: null, workspaceId: null, isCapturing: false });
  },

  setCapturing: (v) => {
    set({ isCapturing: v });
  },
}));

export const MIRROR_CAPTURE_SCRIPT = `
(function() {
  if (window.__MIRROR_CAPTURE__) return;
  window.__MIRROR_CAPTURE__ = true;
  window.__mirrorEvents = [];
  window.__mirrorEventIndex = 0;

  function push(type, data) {
    window.__mirrorEvents.push({ type, data, idx: window.__mirrorEventIndex++ });
    if (window.__mirrorEvents.length > 500) window.__mirrorEvents.shift();
  }

  document.addEventListener('click', function(e) {
    if (!e.isTrusted) return;
    push('click', {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      button: e.button,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    });
  }, true);

  let lastMM = 0;
  document.addEventListener('mousemove', function(e) {
    if (!e.isTrusted) return;
    var now = Date.now();
    if (now - lastMM < 25) return;
    lastMM = now;
    push('mousemove', {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, true);

  document.addEventListener('mousedown', function(e) {
    if (!e.isTrusted) return;
    push('mousedown', {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      button: e.button,
    });
  }, true);

  document.addEventListener('mouseup', function(e) {
    if (!e.isTrusted) return;
    push('mouseup', {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      button: e.button,
    });
  }, true);

  document.addEventListener('wheel', function(e) {
    if (!e.isTrusted) return;
    push('scroll', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, { capture: true, passive: true });

  document.addEventListener('keydown', function(e) {
    if (!e.isTrusted) return;
    push('keydown', {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, true);

  document.addEventListener('keyup', function(e) {
    if (!e.isTrusted) return;
    push('keyup', {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, true);

  document.addEventListener('input', function(e) {
    if (!e.isTrusted) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      push('input', {
        value: t.value || t.textContent
      });
    }
  }, true);

  document.addEventListener('focusin', function(e) {
    if (!e.isTrusted) return;
    push('focus', {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, true);

  console.log('[UNION Mirror] Captura ativada');
})();
`;

export function buildReplayScript(eventJson: string): string {
  const escaped = eventJson.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `
(function() {
  var __evt = JSON.parse('${escaped}');
  var type = __evt.type;
  var data = __evt.data;
  var w = window.innerWidth;
  var h = window.innerHeight;

  try {
    switch(type) {
      case 'click': {
        var el = document.elementFromPoint(data.x * w, data.y * h);
        if (el) {
          if (typeof el.focus === 'function') el.focus();
          el.dispatchEvent(new MouseEvent('click', {
            clientX: data.x * w, clientY: data.y * h,
            button: data.button || 0,
            ctrlKey: data.ctrlKey || false, shiftKey: data.shiftKey || false,
            altKey: data.altKey || false, bubbles: true, cancelable: true
          }));
        }
        break;
      }
      case 'mousemove': {
        document.elementFromPoint(data.x * w, data.y * h)?.dispatchEvent(new MouseEvent('mousemove', {
          clientX: data.x * w, clientY: data.y * h, bubbles: true
        }));
        break;
      }
      case 'mousedown': {
        var el2 = document.elementFromPoint(data.x * w, data.y * h);
        if (el2) {
          if (typeof el2.focus === 'function') el2.focus();
          el2.dispatchEvent(new MouseEvent('mousedown', {
            clientX: data.x * w, clientY: data.y * h, button: data.button || 0, bubbles: true
          }));
        }
        break;
      }
      case 'mouseup': {
        var el3 = document.elementFromPoint(data.x * w, data.y * h);
        if (el3) el3.dispatchEvent(new MouseEvent('mouseup', {
          clientX: data.x * w, clientY: data.y * h, button: data.button || 0, bubbles: true
        }));
        break;
      }
      case 'scroll': {
        window.scrollBy(data.deltaX, data.deltaY);
        break;
      }
      case 'keydown': {
        var el_k = document.activeElement;
        if (el_k) {
          var evt = new KeyboardEvent('keydown', {
            key: data.key, code: data.code,
            ctrlKey: data.ctrlKey || false, shiftKey: data.shiftKey || false,
            altKey: data.altKey || false, metaKey: data.metaKey || false, bubbles: true, cancelable: true
          });
          el_k.dispatchEvent(evt);
          
          if (data.key === 'Enter' && !evt.defaultPrevented) {
            if (el_k.tagName === 'BUTTON' || (el_k.tagName === 'INPUT' && (el_k.type === 'submit' || el_k.type === 'button'))) {
              el_k.click();
            } else if (el_k.tagName === 'INPUT') {
              var form = el_k.closest('form');
              if (form) {
                if (typeof form.requestSubmit === 'function') {
                  form.requestSubmit();
                } else {
                  form.submit();
                }
              }
            }
          }
        }
        break;
      }
      case 'keyup': {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keyup', {
          key: data.key, code: data.code,
          ctrlKey: data.ctrlKey || false, shiftKey: data.shiftKey || false,
          altKey: data.altKey || false, metaKey: data.metaKey || false, bubbles: true
        }));
        break;
      }
      case 'input': {
        var el4 = document.activeElement;
        if (el4 && (el4.tagName === 'INPUT' || el4.tagName === 'TEXTAREA')) {
          el4.value = data.value;
          el4.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (el4 && el4.isContentEditable) {
          el4.textContent = data.value;
          el4.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      }
      case 'focus': {
        var el5 = document.elementFromPoint(data.x * w, data.y * h);
        if (el5 && typeof el5.focus === 'function') el5.focus();
        break;
      }
    }
  } catch(err) {}
})();
`;
}
