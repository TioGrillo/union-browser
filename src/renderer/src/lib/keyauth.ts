const APP_NAME = "UNION BROSWER";
const OWNER_ID = "2ttaPgZOdq";
const SECRET = "c8784e3639ba568590d1fd0b036a95cf4591f5e0d2e2130057b1ca93fc956c3c";
const VERSION = "1.0";
const API_URL = "https://keyauth.win/api/1.2/";

let sessionId: string | null = null;
let hwid: string | null = null;

async function getHwid() {
  if (!hwid) {
    hwid = await window.electronAPI.invoke<string>("system:hwid");
  }
  return hwid;
}

export async function init(): Promise<{ success: boolean; updateAvailable?: boolean; downloadUrl?: string }> {
  try {
    const url = `${API_URL}?type=init&ver=${VERSION}&name=${encodeURIComponent(APP_NAME)}&ownerid=${OWNER_ID}`;
    const data = await window.electronAPI.invoke<any>("system:keyauth-request", url);
    if (data.success) {
      sessionId = data.sessionid;
      return { success: true };
    }

    if (data.message === "invalidver") {
      if (data.download) {
        return { success: false, updateAvailable: true, downloadUrl: data.download };
      } else {
        return { success: false, message: "Versão inválida. Verifique o painel KeyAuth." };
      }
    }

    console.error("KeyAuth Init Failed:", data.message);
    return { success: false };
    return { success: false, message: data.message };
  } catch (e) {
    console.error("KeyAuth Init Error:", e);
    return { success: false, message: "Erro ao conectar com o servidor" };
  }
}

export const login = async (username: string, pass: string) => {
  let initRes = { success: true, message: "" };
  if (!sessionId) {
    const res = await init();
    if (!res.success) initRes = res;
  }
  
  if (!sessionId) return { success: false, message: initRes.message || "Falha ao conectar com o servidor" };

  const _hwid = await getHwid();
  const url = `${API_URL}?type=login&username=${encodeURIComponent(username)}&pass=${encodeURIComponent(pass)}&hwid=${_hwid}&sessionid=${sessionId}&name=${encodeURIComponent(APP_NAME)}&ownerid=${OWNER_ID}`;
  
  try {
    const data = await window.electronAPI.invoke<any>("system:keyauth-request", url);
    if (data.success) {
      localStorage.setItem("keyauth_user", data.info.username);
      const expiryDate = data.info.subscriptions?.[0]?.expiry 
        ? new Date(parseInt(data.info.subscriptions[0].expiry) * 1000).toLocaleDateString()
        : "Vitalício";
      localStorage.setItem("keyauth_expiry", expiryDate);
      localStorage.setItem("keyauth_session", "valid");
    }
    return data;
  } catch (e) {
    return { success: false, message: "Erro de conexão" };
  }
}

export async function register(username: string, pass: string, key: string) {
  if (!sessionId) await init();
  if (!sessionId) return { success: false, message: "Falha ao conectar com o servidor" };

  const _hwid = await getHwid();
  const url = `${API_URL}?type=register&username=${encodeURIComponent(username)}&pass=${encodeURIComponent(pass)}&key=${encodeURIComponent(key)}&hwid=${_hwid}&sessionid=${sessionId}&name=${encodeURIComponent(APP_NAME)}&ownerid=${OWNER_ID}`;
  
  try {
    const data = await window.electronAPI.invoke<any>("system:keyauth-request", url);
    return data;
  } catch (e) {
    return { success: false, message: "Erro de conexão" };
  }
}

export async function upgrade(username: string, key: string) {
  if (!sessionId) await init();
  if (!sessionId) return { success: false, message: "Falha ao conectar com o servidor" };

  const url = `${API_URL}?type=upgrade&username=${encodeURIComponent(username)}&key=${encodeURIComponent(key)}&sessionid=${sessionId}&name=${encodeURIComponent(APP_NAME)}&ownerid=${OWNER_ID}`;
  
  try {
    const data = await window.electronAPI.invoke<any>("system:keyauth-request", url);
    return data;
  } catch (e) {
    return { success: false, message: "Erro de conexão" };
  }
}

export function isAuthenticated() {
  return localStorage.getItem("keyauth_session") === "valid";
}

export function logout() {
  localStorage.removeItem("keyauth_session");
  localStorage.removeItem("keyauth_user");
  localStorage.removeItem("keyauth_expiry");
  window.location.reload();
}
