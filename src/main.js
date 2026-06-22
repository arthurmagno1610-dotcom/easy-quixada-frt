const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "lojas", label: "Lojas", icon: "store" },
  { id: "categorias", label: "Categorias", icon: "grid" },
  { id: "destaques", label: "Destaques", icon: "spark" },
  { id: "avaliacoes", label: "Avaliações", icon: "star" },
  { id: "notificacoes", label: "Notificações", icon: "bell" },
  { id: "relatorios", label: "Relatórios", icon: "chart" },
  { id: "configuracoes", label: "Configurações", icon: "settings" },
];

const actionCards = [
  {
    id: "lojas",
    title: "Gerenciar Lojas",
    text: "Cadastre, edite e gerencie todas as suas lojas da plataforma.",
    action: "Ir para Lojas",
    tone: "blue",
    icon: "store",
  },
  {
    id: "categorias",
    title: "Categorias",
    text: "Organize os tipos de negócios e serviços disponíveis.",
    action: "Gerenciar Categorias",
    tone: "cyan",
    icon: "grid",
  },
  {
    id: "relatorios",
    title: "Relatórios",
    text: "Acompanhe o desempenho da plataforma em tempo real.",
    action: "Ver Relatórios",
    tone: "green",
    icon: "chart",
  },
  {
    id: "avaliacoes",
    title: "Avaliações",
    text: "Veja e gerencie as avaliações de usuários e lojas.",
    action: "Ver Avaliações",
    tone: "orange",
    icon: "star",
  },
];

const API_URL = window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:3000";

let stores = [];
let categories = [];
let activeView = "dashboard";
let showStoreForm = false;
let loadingStores = true;
let loadingCategories = true;
let loadError = "";
let selectedStoreCategory = "";
let storeFormDraft = {};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function storeFromApi(store) {
  return {
    id: `EST-${String(store.id_estabelecimento).padStart(3, "0")}`,
    apiId: store.id_estabelecimento,
    name: store.nome || "",
    description: store.descricao || "",
    address: store.endereco || "",
    phone: store.telefone || "",
    site: store.site || "",
    instagram: store.instagram || "",
    facebook: store.facebook || "",
    whatsapp: store.whatsapp || "",
    category: store.nome_categoria || "Sem categoria",
    categoryId: store.id_categoria,
    status: "Ativa",
    rating: "Novo",
    cover: store.imagem || "",
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.erro || data?.mensagem || "Erro ao conectar com a API");
  }

  return data;
}

function normalizeCategoryName(name) {
  return String(name || "").trim().toLowerCase();
}

function findCategoryByName(name) {
  const normalizedName = normalizeCategoryName(name);
  return categories.find((category) => normalizeCategoryName(category.nome_categoria) === normalizedName);
}

async function createCategoryIfNeeded(categoryName) {
  const name = String(categoryName || "").trim();

  if (!name) {
    return null;
  }

  const existingCategory = findCategoryByName(name);

  if (existingCategory) {
    return existingCategory;
  }

  const newCategory = await apiRequest("/categorias", {
    method: "POST",
    body: JSON.stringify({ nome_categoria: name }),
  });

  categories.push(newCategory);
  return newCategory;
}

function fieldValue(name) {
  return escapeHtml(storeFormDraft[name] || "");
}

function updateStoreFormDraft(form) {
  if (!form) {
    return;
  }

  const data = new FormData(form);
  storeFormDraft = {
    nome: data.get("nome") || "",
    descricao: data.get("descricao") || "",
    endereco: data.get("endereco") || "",
    telefone: data.get("telefone") || "",
    whatsapp: data.get("whatsapp") || "",
    site: data.get("site") || "",
    instagram: data.get("instagram") || "",
    facebook: data.get("facebook") || "",
    categoria: data.get("categoria") || "",
    imagemDataUrl: storeFormDraft.imagemDataUrl || "",
  };
  selectedStoreCategory = storeFormDraft.categoria;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.size === 0) {
      resolve("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Escolha uma imagem com ate 5MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nao foi possivel carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

function icon(name) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons = {
    home: `<svg ${common}><path d="m3 10.8 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    store: `<svg ${common}><path d="M4 10h16"/><path d="M5 10l1-6h12l1 6"/><path d="M6 10v10h12V10"/><path d="M9 20v-6h6v6"/></svg>`,
    grid: `<svg ${common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    spark: `<svg ${common}><path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>`,
    star: `<svg ${common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>`,
    bell: `<svg ${common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
    chart: `<svg ${common}><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/></svg>`,
    settings: `<svg ${common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9.3 1.7 1.7 0 0 0-.6 1.8V22H9v-.2a1.7 1.7 0 0 0-.6-1.8 1.7 1.7 0 0 0-1.9-.3l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3V9h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9-.3A1.7 1.7 0 0 0 9 1h6a1.7 1.7 0 0 0 .6 1.4 1.7 1.7 0 0 0 1.9.3l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1Z"/></svg>`,
    logout: `<svg ${common}><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 3v18"/></svg>`,
    arrow: `<svg ${common}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
    info: `<svg ${common}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    plus: `<svg ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  };
  return icons[name] || icons.info;
}

function setView(view) {
  activeView = view;
  showStoreForm = false;
  selectedStoreCategory = "";
  render();
}

function toggleStoreForm(force) {
  showStoreForm = typeof force === "boolean" ? force : !showStoreForm;
  if (!showStoreForm) {
    selectedStoreCategory = "";
    storeFormDraft = {};
  }
  render();
}

function sidebar() {
  return `
    <aside class="sidebar">
      <button class="brand" data-view="dashboard" aria-label="Ir para o painel inicial">
        <span class="brand-mark"><img src="./assets/logo-icon.png" alt=""></span>
        <span>
          <strong class="brand-logo-text"><img src="./assets/logo-wordmark.png" alt="EasyQuixadá"></strong>
          <small>Painel do Administrador</small>
        </span>
      </button>
      <nav class="nav" aria-label="Navegação principal">
        ${navItems.map((item) => `
          <button class="nav-item ${activeView === item.id ? "active" : ""}" data-view="${item.id}">
            <span class="nav-icon">${icon(item.icon)}</span>
            <span>${item.label}</span>
          </button>
        `).join("")}
      </nav>
      <button class="logout">
        <span class="nav-icon">${icon("logout")}</span>
        <span>Sair</span>
      </button>
    </aside>
  `;
}

function dashboard() {
  return `
    <section class="hero-panel">
      <div class="hero-copy">
        <h1>Bem-vindo ao Painel de Administrador do EasyQuixadá</h1>
        <p>Aqui você tem o controle total da plataforma. Gerencie lojas, acompanhe métricas, visualize avaliações e mantenha o EasyQuixadá sempre atualizado.</p>
        <div class="hero-actions">
          <button class="primary-action" data-view="dashboard">${icon("home")} Ir para o Dashboard</button>
          <button class="secondary-action" data-view="lojas">${icon("store")} Ir para Lojas</button>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="screen-card">
          <span></span><span></span><span></span>
          <div class="screen-grid"><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="monitor-stand"></div>
      </div>
    </section>
    <section class="section-heading"><h2>O que você pode fazer aqui?</h2></section>
    <section class="action-grid">
      ${actionCards.map((card) => `
        <article class="action-card tone-${card.tone}">
          <div class="card-head">
            <span class="card-icon">${icon(card.icon)}</span>
            <div><h3>${card.title}</h3><p>${card.text}</p></div>
          </div>
          <button class="card-link" data-view="${card.id}">${card.action}${icon("arrow")}</button>
        </article>
      `).join("")}
    </section>
    <section class="tip-panel">
      <span class="tip-badge">${icon("info")}</span>
      <div class="tip-copy">
        <h3>Dica Rápida</h3>
        <p>Mantenha as informações das lojas sempre atualizadas para garantir a melhor experiência para os usuários.</p>
      </div>
      <div class="tip-extra">
        <strong>Comece cadastrando sua primeira loja!</strong>
        <span>É rápido, simples e leva menos de 10 minutos.</span>
      </div>
      <button class="primary-action" data-view="lojas">${icon("store")} Cadastrar Loja</button>
    </section>
  `;
}

function storesView() {
  const activeStores = stores.filter((store) => store.status === "Ativa").length;
  const pendingStores = stores.filter((store) => store.status === "Pendente").length;

  return `
    <section class="page-header">
      <div><p>Lojas</p><h1>Gerenciamento de lojas</h1></div>
      <button class="primary-action" data-store-form="open">${icon("plus")} Nova Loja</button>
    </section>
    ${showStoreForm ? storeForm() : ""}
    <section class="metrics">
      <article><strong>${stores.length}</strong><span>Lojas cadastradas</span></article>
      <article><strong>${activeStores}</strong><span>Ativas</span></article>
      <article><strong>${pendingStores}</strong><span>Pendentes</span></article>
      <article><strong>4.7</strong><span>Média geral</span></article>
    </section>
    <section class="table-panel">
      <div class="table-toolbar">
        <h2>Lojas recentes</h2>
        <input type="search" placeholder="Buscar loja" aria-label="Buscar loja" />
      </div>
      <div class="store-list">
        ${stores.map((store) => `
          <article class="store-row">
            <span class="store-cover">${store.cover ? `<img src="${escapeHtml(store.cover)}" alt="">` : icon("store")}</span>
            <div>
              <strong>${escapeHtml(store.name)}</strong>
              <span>${escapeHtml(store.id)} · ${escapeHtml(store.category)}</span>
              <small>${escapeHtml(store.address)}</small>
            </div>
            <span class="status ${store.status === "Ativa" ? "on" : "wait"}">${escapeHtml(store.status)}</span>
            <span class="rating">${icon("star")} ${escapeHtml(store.rating)}</span>
            <button class="icon-button" aria-label="Abrir ${escapeHtml(store.name)}">${icon("arrow")}</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
function storeForm() {
  return `
    <section class="store-form-panel" aria-label="Cadastro de loja">
      <div class="form-heading">
        <div>
          <p>Novo cadastro</p>
          <h2>Cadastrar loja</h2>
        </div>
        <button class="icon-button" data-store-form="close" aria-label="Fechar cadastro">×</button>
      </div>
      <form id="store-form" class="store-form">
        <label>
          <span>Nome do estabelecimento</span>
          <input name="nome" required placeholder="Nome da loja" value="${fieldValue("nome")}" />
        </label>
        <label class="wide">
          <span>Descrição</span>
          <textarea name="descricao" required rows="3" placeholder="Resumo do estabelecimento">${fieldValue("descricao")}</textarea>
        </label>
        <label class="wide">
          <span>Endereço</span>
          <input name="endereco" required placeholder="Rua, número, bairro" value="${fieldValue("endereco")}" />
        </label>
        <label>
          <span>Telefone</span>
          <input name="telefone" required placeholder="(88) 99999-9999" value="${fieldValue("telefone")}" />
        </label>
        <label>
          <span>WhatsApp</span>
          <input name="whatsapp" required placeholder="(88) 99999-9999" value="${fieldValue("whatsapp")}" />
        </label>
        <label>
          <span>Site</span>
          <input name="site" type="url" placeholder="https://..." value="${fieldValue("site")}" />
        </label>
        <label>
          <span>Instagram</span>
          <input name="instagram" placeholder="@perfil" value="${fieldValue("instagram")}" />
        </label>
        <label>
          <span>Facebook</span>
          <input name="facebook" placeholder="facebook.com/perfil" value="${fieldValue("facebook")}" />
        </label>
        <label>
          <span>Categoria</span>
          <select name="categoria" required>
            <option value="">Selecione</option>
            <option ${selectedStoreCategory === "Alimentação" ? "selected" : ""}>Alimentação</option>
            <option ${selectedStoreCategory === "Saúde" ? "selected" : ""}>Saúde</option>
            <option ${selectedStoreCategory === "Bem estar" ? "selected" : ""}>Bem estar</option>
            <option ${selectedStoreCategory === "Manutenção" ? "selected" : ""}>Manutenção</option>
            <option ${selectedStoreCategory === "Acadêmico" ? "selected" : ""}>Acadêmico</option>
            <option ${selectedStoreCategory === "Lazer" ? "selected" : ""}>Lazer</option>
          </select>
        </label>
        <label class="wide">
          <span>Imagem de capa</span>
          <input name="imagem" type="file" accept="image/*" />
        </label>
        <div class="form-actions wide">
          <button type="button" class="secondary-action" data-store-form="close">Cancelar</button>
          <button type="submit" class="primary-action">${icon("plus")} Cadastrar loja</button>
        </div>
      </form>
    </section>
  `;
}
async function handleStoreSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  updateStoreFormDraft(form);
  const data = new FormData(form);
  const categoryName = data.get("categoria");
  selectedStoreCategory = categoryName;

  try {
    const category = await createCategoryIfNeeded(categoryName);

    if (!category) {
      alert("Selecione uma categoria.");
      return;
    }

    const imageFile = data.get("imagem");
    const imageDataUrl = (await fileToDataUrl(imageFile)) || storeFormDraft.imagemDataUrl || "";

    const payload = {
      nome: data.get("nome").trim(),
      descricao: data.get("descricao").trim(),
      endereco: data.get("endereco").trim(),
      telefone: data.get("telefone").trim(),
      site: data.get("site").trim(),
      imagem: imageDataUrl,
      instagram: data.get("instagram").trim(),
      facebook: data.get("facebook").trim(),
      whatsapp: data.get("whatsapp").trim(),
      id_categoria: category.id_categoria,
    };

    const savedStore = await apiRequest("/estabelecimentos", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    stores.unshift(storeFromApi({ ...savedStore, nome_categoria: category?.nome_categoria }));
    showStoreForm = false;
    selectedStoreCategory = "";
    storeFormDraft = {};
    loadError = "";
    render();
  } catch (error) {
    loadError = error.message;
    render();
  }
}

async function handleCategoryChange(event) {
  updateStoreFormDraft(event.target.form);
  selectedStoreCategory = event.target.value;

  if (!selectedStoreCategory) {
    return;
  }

  try {
    await createCategoryIfNeeded(event.target.value);
  } catch (error) {
    loadError = error.message;
    render();
  }
}

async function handleStoreFormInput(event) {
  updateStoreFormDraft(event.currentTarget);

  if (event.target.name === "imagem") {
    try {
      storeFormDraft.imagemDataUrl = await fileToDataUrl(event.target.files[0]);
    } catch (error) {
      alert(error.message);
      event.target.value = "";
      storeFormDraft.imagemDataUrl = "";
    }
  }
}

async function loadStores() {
  loadingStores = true;
  render();

  try {
    const data = await apiRequest("/estabelecimentos");
    stores = data.map(storeFromApi);
    loadError = "";
  } catch (error) {
    stores = [];
    loadError = error.message;
  } finally {
    loadingStores = false;
    render();
  }
}

async function loadCategories() {
  loadingCategories = true;

  try {
    categories = await apiRequest("/categorias");
    loadError = "";
  } catch (error) {
    categories = [];
    loadError = error.message;
  } finally {
    loadingCategories = false;
    render();
  }
}

async function loadInitialData() {
  await Promise.all([loadStores(), loadCategories()]);
}
function placeholderView() {
  const item = navItems.find((nav) => nav.id === activeView);
  return `
    <section class="page-header">
      <div><p>${item.label}</p><h1>${item.label}</h1></div>
      <button class="secondary-action">${icon(item.icon)} Abrir módulo</button>
    </section>
    <section class="empty-state">
      <span>${icon(item.icon)}</span>
      <h2>Módulo ${item.label}</h2>
      <p>Área preparada para receber os dados e fluxos de ${item.label.toLowerCase()} do EasyQuixadá.</p>
    </section>
  `;
}

function mainContent() {
  if (activeView === "dashboard") return dashboard();
  if (activeView === "lojas") return storesView();
  return placeholderView();
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="admin-shell">
      ${sidebar()}
      <main class="content">${mainContent()}</main>
    </div>
  `;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.querySelectorAll("[data-store-form]").forEach((button) => {
    button.addEventListener("click", () => toggleStoreForm(button.dataset.storeForm === "open"));
  });
  const storeFormElement = document.querySelector("#store-form");
  if (storeFormElement) {
    storeFormElement.addEventListener("submit", handleStoreSubmit);
    storeFormElement.addEventListener("input", handleStoreFormInput);
  }
  const categorySelect = document.querySelector('select[name="categoria"]');
  if (categorySelect) {
    categorySelect.addEventListener("change", handleCategoryChange);
  }
}

render();
loadInitialData();

