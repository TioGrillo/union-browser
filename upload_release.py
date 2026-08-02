import requests
import json
import os

TOKEN = "SEU_TOKEN_AQUI"
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

repo_name = "union-browser"
username = "TioGrillo"
repo_url = f"https://api.github.com/repos/{username}/{repo_name}"

release_name = "UNION BROWSER V1.0.7"
tag_name = "v1.0.7"

print(f"Criando release {tag_name}...")
r_rel = requests.post(f"{repo_url}/releases", headers=HEADERS, json={
    "tag_name": tag_name,
    "name": release_name,
    "body": "Nova compilação (Versão 1.0.7) - Correção de crash de WebAssembly (WASM) em jogos devido a flags agressivas de lite-mode na V8.",
    "draft": False,
    "prerelease": False
})

if r_rel.status_code == 422:
    print("Erro 422 ao criar release:", r_rel.text)
    print("Buscando release existente...")
    r_rel = requests.get(f"{repo_url}/releases/tags/{tag_name}", headers=HEADERS)
    
r_rel.raise_for_status()
release_data = r_rel.json()
upload_url = release_data["upload_url"].split("{")[0]

file_path = r"C:\Users\Damiao\Documents\IdleBrowser\release\UNION BROWSER 1.0.7.exe"
file_name = "UNION_BROWSER_1.0.7.exe"
print(f"Fazendo upload de {file_name}... Isso pode demorar um pouco dependendo do tamanho.")

upload_headers = HEADERS.copy()
upload_headers["Content-Type"] = "application/octet-stream"

with open(file_path, "rb") as f:
    r_up = requests.post(
        f"{upload_url}?name={file_name}",
        headers=upload_headers,
        data=f
    )
r_up.raise_for_status()
asset_data = r_up.json()

print("-" * 50)
print("UPLOAD CONCLUIDO COM SUCESSO!")
print("LINK DIRETO DE DOWNLOAD:")
print(asset_data.get("browser_download_url"))
print("-" * 50)
