# Status Atual do Projeto: IdleBrowser

Este documento detalha a arquitetura atual, as tecnologias empregadas, as recentes mudanças e o que temos planejado para as próximas iterações do nosso navegador multi-sessão.

## 🏗️ Arquitetura e Tecnologias

O **IdleBrowser** é um aplicativo desktop construído utilizando as seguintes tecnologias principais:
- **Electron**: Responsável pelo motor principal (backend/main process) e criação das janelas. Gerencia sessões isoladas (cache, cookies, proxies) para cada painel.
- **React + Vite**: Motor de renderização do front-end (UI). Interface altamente reativa e modular.
- **TailwindCSS**: Para a estilização. Usamos um esquema de cores escuro, com micro-animações, efeitos "glassmorphism" e bordas bem definidas, seguindo o padrão que combina com o nosso design focado no `accent` (laranja).
- **Zustand**: Gerenciamento de estados globais (appStore, dialogStore) no React. Permite que qualquer componente controle a abertura de menus, painéis, modais, e contas ativas sem complexidade.
- **Electron-store**: Armazenamento em disco das configurações, workspaces e contas.
- **<webview> tag**: Substituímos o uso do antigo `WebContentsView` pelo `<webview>` tag nativo do Chromium direto no frontend. Isso permitiu integrar as janelas de navegação perfeitamente à interface em HTML.

## 🧩 Componentes Principais

### Workspaces e Contas
- **Workspaces**: Grupos lógicos de contas. (Ex: "Contas de Fazenda", "Bots").
- **Contas (Accounts)**: Instâncias individuais. Cada conta tem sua própria sessão isolada (definida no Electron via `session.fromPartition`), permitindo logar com múltiplos usuários simultaneamente no mesmo site.
- **Painéis**: A representação visual das contas. Cada painel ativo renderiza um `<webview>` isolado.
- **Multi-Seleção**: Novo recurso que permite selecionar múltiplas contas segurando `CTRL` ou `SHIFT`. Janelas selecionadas ganham destaque visual (borda laranja/brilho) e ações em lote podem ser disparadas apenas para elas.

### Menus e Renderização HTML (A "Saga" dos Menus)
Tivemos um grande desafio recente com os menus (Layout, Downloads, Clique Direito):
- **O Problema Inicial**: Menus HTML ficavam escondidos embaixo dos navegadores quando utilizávamos `WebContentsView` ou caíam no problema de Z-index, sendo engolidos por outras telas.
- **A Tentativa Nativa**: Tentamos usar o motor de menu nativo do Windows/Mac (`Menu.buildFromTemplate`). Embora resolvesse o sobreposição, o visual nativo era cinza, feio e não correspondia ao nosso padrão de interface customizada.
- **A Solução Definitiva (Portal + Webview)**: 
  1. Adotamos as tags `<webview>`, que coexistem na mesma árvore DOM do frontend.
  2. Voltamos nossos menus ao formato HTML, mantendo os designs perfeitos (bordas escuras, destaques laranja de hover, formato do `<Select>`).
  3. Utilizamos `createPortal` (React) para fazer com que menus de contexto abram "voando" por cima de toda a barra lateral, evitando que regras de corte (`overflow-hidden`) "fatiassem" o menu pela metade.

## ✅ O que já temos funcionando?
- [x] Criação/Exclusão/Edição de Workspaces.
- [x] Criação/Exclusão/Edição de Contas (com configurações de Proxy e User-Agent).
- [x] Abas persistentes com sessões separadas para cada conta (cada aba é como um navegador anônimo totalmente independente).
- [x] Sistema de grade customizável (Auto, Colunas, Linhas, Janela Única, Grade Livre).
- [x] Múltiplos menus contextuais nativos no visual, mas construídos com HTML customizado para ficar aderente ao design da interface.
- [x] Múltipla seleção de contas (com teclas de atalho CTRL e SHIFT) e reflexo visual (highlight) em todas as telas selecionadas.
- [x] A Barra de URL agora navega apenas as abas/contas que estiverem selecionadas ao pressionar Enter.
- [x] Cabeçalho dos painéis de contas maiores (mais altos) e com ícone de arrasto (grip de 6 pontos) para melhor usabilidade e visual premium.
- [x] Menu de Configurações bem estruturado com abas de Geral, Navegação, Downloads, etc.
- [x] Atributos das configurações salvos no Electron-Store.

## 🔜 Próximos Passos (Pendentes)
De acordo com nosso registro de solicitações que foram pausadas para focarmos nos bugs visuais, os próximos passos do projeto são:

1. **Unificação do Tamanho das Janelas de Configurações**
   - Garantir que não haja saltos de tamanho ao navegar pelas abas (Geral, Navegação, Downloads, etc).
   
2. **Botões de Minimizar/Maximizar**
   - Restaurar onde necessário ou garantir que existam comportamentos padrão intuitivos de Maximizar e Minimizar nos menus em que sumiram.
   
3. **Login - Checkbox "Remember Me"**
   - Adicionar o marcador (checkbox) na tela inicial de login com a engine KeyAuth.

4. **Mensagem de Workspace Vazio**
   - Sempre que o primeiro workspace for carregado ou qualquer workspace não possuir abas, mostrar no painel direito uma mensagem indicando para criar ou abrir abas (conforme a "diretriz" citada em conversas antigas).

5. **Ajuste de Comportamento de Clique (Resize Handle)**
   - Ao dar *duplo-clique* na barra divisória das abas (resize adjustor), resetar o tamanho dela para o "padrão" (50/50).

## Conclusão
O código está estável, as sessões isoladas fluem perfeitamente através de partições (`persist:panel-<accountId>`) e os menus de overlay em HTML finalmente convivem em paz sem se misturarem ou ficarem cortados pelos `<webviews>`. Adicionamos também o suporte a multi-seleção poderosa, melhorando muito a administração em massa dos bots.

Com a infraestrutura firme agora, estamos prontos para lapidar a experiência do usuário com os próximos recursos pendentes!
