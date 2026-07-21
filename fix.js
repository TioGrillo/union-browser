const fs = require('fs');
let c = fs.readFileSync('src/main/index.ts', 'utf8');

const startStr = 'ipcMain.handle("menu:show-downloads"';
const endStr = '  // ── Settings';

const start = c.indexOf(startStr);
const end = c.indexOf(endStr);

if (start > -1 && end > -1) {
  const replacement = `ipcMain.handle("menu:show-downloads", (event) => {
    return new Promise((resolve) => {
      const template = [
        { label: "DOWNLOADS", enabled: false },
        { type: "separator" },
        { label: "Nenhum download nesta sessão", enabled: false },
      ];
      const menu = Menu.buildFromTemplate(template);
      menu.once('menu-will-close', () => setTimeout(() => resolve(null), 100));
      menu.popup({ window: mainWindow ?? undefined });
    });
  });

  // ── Panel Management ────────────────────────
  ipcMain.handle("panels:mount", async (_, accountId, url) => {
    const acc = store.get("accounts", []).find((a) => a.id === accountId);
    if (!acc) return false;

    const partition = "persist:panel-" + accountId;
    const ses = session.fromPartition(partition, { cache: true });

    if (acc.proxy) {
      await ses.setProxy({ proxyRules: acc.proxy });
    } else {
      await ses.setProxy({ proxyRules: "" });
    }
    if (acc.userAgent) {
      ses.setUserAgent(acc.userAgent);
    }
    return true;
  });

`;
  c = c.slice(0, start) + replacement + c.slice(end);
  fs.writeFileSync('src/main/index.ts', c);
  console.log('Fixed!');
} else {
  console.log('Not found! start:', start, 'end:', end);
}
