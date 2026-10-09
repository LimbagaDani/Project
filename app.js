(() => {
  const TEMPLATE_NAMES = { simple: "Simple", modern: "Modern", creative: "Creative" };
  const TEMPLATE_DETAILS = [
    { id: "simple", title: "Simple", description: "Quietly confident. A clean, editorial page that lets your experience do the talking.", number: "01" },
    { id: "modern", title: "Modern", description: "A structured two-column layout with bold color and tidy project cards.", number: "02" },
    { id: "creative", title: "Creative", description: "An expressive, warm layout with an oversized name and a playful flow.", number: "03" }
  ];
  const EMPTY = { fullName: "", headline: "", email: "", phone: "", address: "", photo: "", about: "", education: [], skills: [], projects: [], experience: [], socials: [] };
  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastNode = document.getElementById("toast");
  const config = readConfig();
  function readRoute() {
    const [page, query = ""] = location.hash.slice(1).split("?");
    return { page: page || "home", id: new URLSearchParams(query).get("id") };
  }

  const initialRoute = readRoute();
  const state = { page: initialRoute.page, portfolios: [], activeId: initialRoute.id, draft: null, selectedTemplate: "simple", loading: true };
  let toastTimer;

  function readConfig() {
    const saved = JSON.parse(localStorage.getItem("folio-supabase-config") || "{}");
    const runtime = window.FOLIO_CONFIG || {};
    return { url: (runtime.supabaseUrl || saved.url || "").replace(/\/$/, ""), key: runtime.supabaseAnonKey || saved.key || "" };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function safeHref(value) {
    const url = String(value || "").trim();
    return /^(https?:\/\/|mailto:|tel:)/i.test(url) ? escapeHtml(url) : "#";
  }

  function isConnected() { return Boolean(config.url && config.key); }
  function authHeaders(extra = {}) { return { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", ...extra }; }

  async function api(path, options = {}) {
    const response = await fetch(`${config.url}/rest/v1/${path}`, { ...options, headers: authHeaders(options.headers || {}) });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Database error (${response.status}): ${details.slice(0, 220)}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function loadPortfolios() {
    if (!isConnected()) {
      state.portfolios = [];
      state.loading = false;
      render();
      return;
    }
    state.loading = true;
    render();
    try {
      state.portfolios = await api("portfolios?select=*&order=updated_at.desc");
    } catch (error) {
      state.portfolios = [];
      notify(`${error.message} Check your Supabase URL, anon key, and table setup.`);
    } finally {
      state.loading = false;
      render();
    }
  }

  function notify(message) {
    toastNode.textContent = message;
    toastNode.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove("show"), 4200);
  }

  function setConnectionUI() {
    const connected = isConnected();
    document.getElementById("connection-dot").classList.toggle("connected", connected);
    document.getElementById("connection-label").textContent = connected ? "Supabase connected" : "Database not connected";
    document.getElementById("connection-detail").textContent = connected ? "Cloud sync is on" : "Connect Supabase to save";
  }

  function go(page) {
    state.page = page;
    const route = page === "preview" && state.activeId ? `#preview?id=${encodeURIComponent(state.activeId)}` : `#${page}`;
    if (location.hash !== route) history.pushState({ page, id: state.activeId }, "", route);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openForm(record = null) {
    state.activeId = record?.id || null;
    state.draft = record ? structuredClone(record.data) : structuredClone(EMPTY);
    state.selectedTemplate = record?.template || "simple";
    go("form");
  }

  function initials(name) {
    return String(name || "Y").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }

  function avatar(data, className = "portfolio-avatar") {
    return data.photo ? `<span class="${className}"><img src="${escapeHtml(data.photo)}" alt="${escapeHtml(data.fullName || "Profile photo")}" /></span>` : `<span class="${className}">${escapeHtml(initials(data.fullName))}</span>`;
  }

  function portfolioCard(record) {
    const data = record.data || EMPTY;
    const updated = record.updated_at ? new Date(record.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Recently";
    return `<article class="portfolio-card"><div class="portfolio-card-top">${avatar(data)}<div><h3>${escapeHtml(data.fullName || "Untitled portfolio")}</h3><p>${escapeHtml(data.headline || data.email || "Add a role or headline")}</p></div></div><div class="portfolio-card-body"><div class="card-meta"><span class="template-pill">${escapeHtml(TEMPLATE_NAMES[record.template] || "Simple")}</span><span>Edited ${escapeHtml(updated)}</span></div><div class="card-actions"><button data-action="view" data-id="${escapeHtml(record.id)}">View</button><button data-action="edit" data-id="${escapeHtml(record.id)}">Edit</button><button class="delete-action" data-action="delete" data-id="${escapeHtml(record.id)}">Delete</button></div></div></article>`;
  }

  function pageHead(eyebrow, title, description, button = "") {
    return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${button}</div>`;
  }

  function renderHome() {
    const action = `<button class="button button-dark" data-action="new">Create portfolio <span aria-hidden="true">+</span></button>`;
    const list = state.loading ? `<div class="loading-state">Loading your portfolios...</div>` : state.portfolios.length ? `<div class="portfolio-list">${state.portfolios.map(portfolioCard).join("")}</div>` : `<div class="empty-state"><div><strong>Your first page starts here.</strong><p>${isConnected() ? "Create a portfolio and it will appear here." : "Connect Supabase to save your work online."}</p><button class="button button-green" data-action="new">Start a portfolio <span aria-hidden="true">+</span></button></div></div>`;
    return `${pageHead("YOUR CREATIVE WORKSPACE", "A little space to show up.", "Build a portfolio that puts your work in its best light.", action)}<section class="hero-panel"><div class="hero-copy"><div class="eyebrow">YOUR NEXT CHAPTER, WELL DESIGNED</div><h2>Make your work<br />impossible to miss.</h2><p>One place for your story, your projects, and the work you want the world to see.</p><button class="button button-dark" data-action="new">Create your portfolio <span aria-hidden="true">→</span></button></div><div class="hero-art" aria-hidden="true"><div class="art-page"><div class="art-avatar"></div><div class="art-line wide"></div><div class="art-line short"></div><div class="art-line"></div><div class="art-line"></div><div class="art-chip"></div></div></div></section><div class="section-heading"><h2>Your portfolios</h2><span>${state.portfolios.length} ${state.portfolios.length === 1 ? "portfolio" : "portfolios"}</span></div>${list}${!isConnected() ? `<div class="setup-callout"><p><strong>One quick setup before saving.</strong> Connect a Supabase project to enable cloud storage and portfolio management.</p><button class="button button-light button-small" data-action="settings">Connect database</button></div>` : ""}`;
  }

  function templateArtwork(id) {
    return `<div class="template-art ${id}"><div class="mini-page">${id === "modern" ? '<div class="mini-avatar"></div><div><div class="mini-name"></div><div class="mini-line half"></div><div class="mini-block"></div><div class="mini-block"></div></div>' : '<div class="mini-name"></div><div class="mini-line half"></div><div class="mini-line"></div><div class="mini-line"></div><div class="mini-block"></div><div class="mini-line"></div>'}</div></div>`;
  }

  function renderTemplates() {
    const items = TEMPLATE_DETAILS.map((template) => `<article class="template-card ${state.selectedTemplate === template.id ? "selected" : ""}">${templateArtwork(template.id)}<div class="template-card-content"><div class="template-card-heading"><h2>${template.title}</h2><span class="template-number">${template.number} / 03</span></div><p>${template.description}</p><button class="button ${state.selectedTemplate === template.id ? "button-green" : "button-light"} template-select" data-action="select-template" data-template="${template.id}">${state.selectedTemplate === template.id ? "Selected" : "Choose template"}</button></div></article>`).join("");
    const canContinue = state.activeId && state.portfolios.some((item) => item.id === state.activeId);
    return `${pageHead("THREE WAYS TO SHOW YOUR WORK", "Choose your point of view.", "Every template is responsive and built from the same portfolio details.")}
      <div class="template-grid">${items}</div>${canContinue ? `<div class="form-actions"><button class="button button-light" data-action="back-to-list">All portfolios</button><button class="button button-dark" data-action="continue-preview">Preview portfolio <span aria-hidden="true">→</span></button></div>` : ""}`;
  }

  function inputField(label, key, value, options = {}) {
    const type = options.type || "text";
    const full = options.full ? " full" : "";
    const placeholder = options.placeholder || "";
    const helper = options.helper ? `<small>${options.helper}</small>` : "";
    const control = type === "textarea" ? `<textarea id="field-${key}" name="${key}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>` : `<input id="field-${key}" name="${key}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />`;
    return `<div class="field${full}"><label for="field-${key}">${label}</label>${control}${helper}</div>`;
  }

  function listToLines(items, keys) {
    return (items || []).map((item) => keys.map((key) => item[key] || "").join(" | ")).join("\n");
  }

  function renderForm() {
    const data = state.draft || structuredClone(EMPTY);
    const title = state.activeId ? "Edit your story." : "Let's make it yours.";
    return `${pageHead(state.activeId ? "MAKE A FEW CHANGES" : "START WITH THE GOOD STUFF", title, "A few details are all it takes to make a page feel like you.")}<form id="portfolio-form" class="form-wrap">
      <section class="form-section"><div class="form-section-heading"><h2>Personal details</h2><span>Your first impression</span></div><div class="form-grid">
        ${inputField("Full name *", "fullName", data.fullName, { placeholder: "e.g. Alex Morgan" })}${inputField("Professional headline", "headline", data.headline, { placeholder: "e.g. Product designer & illustrator" })}
        ${inputField("Email", "email", data.email, { type: "email", placeholder: "alex@example.com" })}${inputField("Contact number", "phone", data.phone, { type: "tel", placeholder: "+1 555 0100" })}
        ${inputField("Address", "address", data.address, { placeholder: "City, Country" })}
        <div class="field"><label for="field-photo">Profile picture</label><div class="photo-row"><span class="photo-preview" id="photo-preview">${data.photo ? `<img src="${escapeHtml(data.photo)}" alt="Profile preview" />` : escapeHtml(initials(data.fullName))}</span><input id="field-photo" type="file" accept="image/*" /></div><small>Choose a small image (under 1 MB) or leave blank.</small></div>
        ${inputField("About me", "about", data.about, { type: "textarea", full: true, placeholder: "A short introduction: what you do, what you care about, and what you are looking for." })}
      </div></section>
      <section class="form-section"><div class="form-section-heading"><h2>Education & skills</h2><span>What you bring</span></div><div class="form-grid">
        ${inputField("Educational background", "education", listToLines(data.education, ["qualification", "institution", "period", "details"]), { type: "textarea", full: true, placeholder: "Degree | School | 2020-2024 | Honors or details", helper: "One entry per line. Separate fields with |." })}
        ${inputField("Skills", "skills", (data.skills || []).join(", "), { type: "textarea", full: true, placeholder: "Research, Figma, JavaScript, Facilitation", helper: "Separate skills with commas." })}
      </div></section>
      <section class="form-section"><div class="form-section-heading"><h2>Experience & projects</h2><span>Show what you've done</span></div><div class="form-grid">
        ${inputField("Work experience", "experience", listToLines(data.experience, ["role", "company", "period", "details"]), { type: "textarea", full: true, placeholder: "Product Designer | Acme Studio | 2022-2025 | Led a redesign...", helper: "One entry per line: Role | Company | Dates | Details." })}
        ${inputField("Projects", "projects", listToLines(data.projects, ["title", "description", "stack", "link"]), { type: "textarea", full: true, placeholder: "Field Notes | A community research tool | React, Supabase | https://example.com", helper: "One entry per line: Title | Description | Tools | URL." })}
        ${inputField("Social & website links", "socials", listToLines(data.socials, ["label", "url"]), { type: "textarea", full: true, placeholder: "LinkedIn | https://linkedin.com/in/you\nWebsite | https://example.com", helper: "One entry per line: Label | URL." })}
      </div></section>
      <div class="form-actions"><button class="button button-light" type="button" data-action="cancel-form">Cancel</button><button class="button button-green" type="submit">${state.activeId ? "Save changes" : "Save & choose a template"} <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  function section(title, contents) {
    return contents ? `<section class="pv-section"><h3>${title}</h3>${contents}</section>` : "";
  }

  function entries(items) {
    return (items || []).map((item) => `<div class="pv-entry"><div class="pv-entry-heading"><span>${escapeHtml(item.role || item.title || item.qualification || "")}</span><span class="pv-entry-meta">${escapeHtml(item.period || "")}</span></div><div class="pv-entry-meta">${escapeHtml(item.company || item.institution || "")}</div>${item.description || item.details ? `<p>${escapeHtml(item.description || item.details)}</p>` : ""}${item.link ? `<div class="pv-entry-meta"><a href="${safeHref(item.link)}" target="_blank" rel="noopener noreferrer">View project ↗</a></div>` : ""}</div>`).join("");
  }

  function contactItems(data) {
    return [data.email && `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>`, data.phone && `<a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a>`, data.address && `<span>${escapeHtml(data.address)}</span>`].filter(Boolean).join("");
  }

  function socialItems(data) {
    return (data.socials || []).map((social) => `<a href="${safeHref(social.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(social.label || social.url)} ↗</a>`).join("");
  }

  function renderPortfolio(data, template) {
    const contact = contactItems(data);
    const about = section("A little about me", `<p>${escapeHtml(data.about)}</p>`);
    const skills = section("Skills", `<div class="pv-tags">${(data.skills || []).map((skill) => `<span class="pv-tag">${escapeHtml(skill)}</span>`).join("")}</div>`);
    const education = section("Education", entries(data.education));
    const experience = section("Experience", entries(data.experience));
    const projects = section("Selected projects", entries(data.projects));
    const socials = socialItems(data) ? `<div class="pv-socials">${socialItems(data)}</div>` : "";
    const photo = data.photo ? `<img class="pv-photo" src="${escapeHtml(data.photo)}" alt="${escapeHtml(data.fullName)}" />` : `<span class="pv-avatar-fallback">${escapeHtml(initials(data.fullName))}</span>`;
    if (template === "modern") return `<div class="preview-modern"><aside class="preview-modern-side">${data.photo ? `<img class="pv-photo" src="${escapeHtml(data.photo)}" alt="${escapeHtml(data.fullName)}" />` : `<span class="pv-avatar-fallback">${escapeHtml(initials(data.fullName))}</span>`}<h1 class="pv-name">${escapeHtml(data.fullName || "Your Name")}</h1><p class="pv-role">${escapeHtml(data.headline || "Your professional headline")}</p><div class="pv-contact">${contact}</div>${skills}${education}${socials}</aside><div class="preview-modern-main">${about}${projects}${experience}</div></div>`;
    if (template === "creative") return `<div class="preview-creative"><header class="preview-creative-top"><div><h1 class="pv-name">${escapeHtml(data.fullName || "Your Name")}</h1><p class="pv-role">${escapeHtml(data.headline || "Your professional headline")}</p></div>${photo}</header><div class="pv-contact">${contact}</div>${socials}<div class="creative-columns"><div>${about}${skills}${education}</div><div>${projects}${experience}</div></div></div>`;
    return `<article class="preview-simple"><header class="pv-header"><h1 class="pv-name">${escapeHtml(data.fullName || "Your Name")}</h1><p class="pv-role">${escapeHtml(data.headline || "Your professional headline")}</p><div class="pv-contact">${contact}</div>${socials}</header>${about}${experience}${projects}${education}${skills}</article>`;
  }

  function renderPreview() {
    const record = state.portfolios.find((item) => item.id === state.activeId);
    if (!record) return `${pageHead("PORTFOLIO PREVIEW", "Nothing to preview yet.", "Create a portfolio first, then it will appear here.")}<button class="button button-green" data-action="new">Create portfolio</button>`;
    const template = record.template || "simple";
    return `${pageHead("YOUR PORTFOLIO, IN PREVIEW", escapeHtml(record.data.fullName || "Your portfolio"), "The public-facing page, ready for a final look.")}<div class="preview-toolbar"><div class="preview-toolbar-left"><button class="button button-light button-small" data-action="back-to-list">← All portfolios</button><label class="eyebrow" for="preview-template">TEMPLATE</label><select id="preview-template" aria-label="Choose portfolio template">${TEMPLATE_DETAILS.map((item) => `<option value="${item.id}" ${template === item.id ? "selected" : ""}>${item.title}</option>`).join("")}</select></div><div class="preview-toolbar-right"><button class="button button-light button-small" data-action="edit" data-id="${escapeHtml(record.id)}">Edit details</button><button class="button button-dark button-small" data-action="print">Print / Save PDF</button></div></div><p class="preview-notice">Previewing the ${escapeHtml(TEMPLATE_NAMES[template])} template. Use Print / Save PDF to export a copy.</p><div class="portfolio-preview">${renderPortfolio(record.data, template)}</div>`;
  }

  function renderManage() {
    const list = state.loading ? `<div class="loading-state">Loading your portfolios...</div>` : state.portfolios.length ? `<div class="portfolio-list">${state.portfolios.map(portfolioCard).join("")}</div>` : `<div class="empty-state"><div><strong>No portfolios yet.</strong><p>Make one, then manage it here.</p><button class="button button-green" data-action="new">Create portfolio</button></div></div>`;
    return `${pageHead("ALL YOUR WORK", "My portfolios.", "View, update, or remove your saved portfolio pages.", `<button class="button button-dark" data-action="new">New portfolio <span aria-hidden="true">+</span></button>`)}${!isConnected() ? `<div class="setup-callout"><p><strong>Connect your database first.</strong> Your saved work will appear here after connecting Supabase.</p><button class="button button-light button-small" data-action="settings">Connect database</button></div>` : ""}<div style="margin-top:18px">${list}</div>`;
  }

  function render() {
    const pages = { home: ["Overview", renderHome], portfolios: ["My portfolios", renderManage], templates: ["Templates", renderTemplates], form: [state.activeId ? "Edit portfolio" : "Create portfolio", renderForm], preview: ["Portfolio preview", renderPreview] };
    const [label, view] = pages[state.page] || pages.home;
    if (!pages[state.page]) state.page = "home";
    document.getElementById("breadcrumb-current").textContent = label;
    document.querySelectorAll("[data-nav]").forEach((link) => link.classList.toggle("active", link.dataset.nav === (state.page === "form" || state.page === "preview" ? "portfolios" : state.page)));
    setConnectionUI();
    app.innerHTML = `<div class="page-enter">${view()}</div>`;
  }

  function parseRecords(text, fields) {
    return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const values = line.split("|").map((part) => part.trim());
      return Object.fromEntries(fields.map((field, index) => [field, values[index] || ""]));
    });
  }

  function readForm(form) {
    const values = new FormData(form);
    return {
      fullName: values.get("fullName").trim(), headline: values.get("headline").trim(), email: values.get("email").trim(), phone: values.get("phone").trim(), address: values.get("address").trim(),
      about: values.get("about").trim(), photo: state.draft.photo || "",
      education: parseRecords(values.get("education"), ["qualification", "institution", "period", "details"]),
      skills: values.get("skills").split(",").map((skill) => skill.trim()).filter(Boolean),
      experience: parseRecords(values.get("experience"), ["role", "company", "period", "details"]),
      projects: parseRecords(values.get("projects"), ["title", "description", "stack", "link"]),
      socials: parseRecords(values.get("socials"), ["label", "url"])
    };
  }

  async function savePortfolio(form) {
    const data = readForm(form);
    if (!data.fullName) { form.elements.fullName.focus(); notify("Add your full name before saving."); return; }
    if (!isConnected()) { notify("Connect Supabase before saving. Your information has not been stored."); openSettings(); return; }
    const isNew = !state.activeId;
    const payload = { data, template: state.selectedTemplate };
    try {
      document.getElementById("saved-status").textContent = "Saving...";
      if (state.activeId) {
        await api(`portfolios?id=eq.${encodeURIComponent(state.activeId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      } else {
        const result = await api("portfolios", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
        state.activeId = result[0].id;
      }
      state.draft = data;
      document.getElementById("saved-status").textContent = "Saved to Supabase";
      await loadPortfolios();
      go(isNew ? "templates" : "preview");
      notify("Portfolio saved to your online database.");
    } catch (error) {
      document.getElementById("saved-status").textContent = "";
      notify(error.message);
    }
  }

  async function deletePortfolio(id) {
    const record = state.portfolios.find((item) => item.id === id);
    if (!record || !confirm(`Delete the portfolio for ${record.data.fullName || "this person"}? This cannot be undone.`)) return;
    try {
      await api(`portfolios?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      state.portfolios = state.portfolios.filter((item) => item.id !== id);
      if (state.activeId === id) state.activeId = null;
      notify("Portfolio deleted.");
      render();
    } catch (error) { notify(error.message); }
  }

  async function updateTemplate(template) {
    if (!TEMPLATE_NAMES[template] || !state.activeId) return;
    try {
      await api(`portfolios?id=eq.${encodeURIComponent(state.activeId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ template }) });
      const record = state.portfolios.find((item) => item.id === state.activeId);
      if (record) record.template = template;
      state.selectedTemplate = template;
      render();
      notify(`${TEMPLATE_NAMES[template]} template applied.`);
    } catch (error) { notify(error.message); }
  }

  function openSettings() {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-settings"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 id="settings-title">Connect your database.</h2><p>Use the project URL and anon key from your Supabase project settings. These public client credentials are restricted by your database's row-level security policies.</p><form id="settings-form"><div class="settings-field"><label for="supabase-url">Supabase project URL</label><input id="supabase-url" name="url" type="url" placeholder="https://your-project.supabase.co" value="${escapeHtml(config.url)}" required /></div><div class="settings-field"><label for="supabase-key">Supabase anon JWT key</label><input id="supabase-key" name="key" type="password" placeholder="eyJ..." value="${escapeHtml(config.key)}" required /></div><p class="modal-note">Never enter a service-role key here. Run the included SQL setup in Supabase first. Settings are stored in this browser; set config.js before deploying so every visitor can connect.</p><div class="modal-actions"><button class="button button-light" type="button" data-action="close-settings">Cancel</button><button class="button button-green" type="submit">Connect</button></div></form></section></div>`;
    document.getElementById("supabase-url").focus();
  }

  function closeSettings() { modalRoot.innerHTML = ""; }

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id, template } = button.dataset;
    if (action === "new") openForm();
    if (action === "edit") openForm(state.portfolios.find((item) => item.id === id));
    if (action === "view") { state.activeId = id; go("preview"); }
    if (action === "delete") deletePortfolio(id);
    if (action === "settings") openSettings();
    if (action === "select-template") {
      state.selectedTemplate = template;
      if (state.activeId && state.portfolios.some((item) => item.id === state.activeId)) updateTemplate(template);
      else render();
    }
    if (action === "continue-preview") go("preview");
    if (action === "cancel-form") go(state.activeId ? "preview" : "home");
    if (action === "back-to-list") go("portfolios");
    if (action === "print") window.print();
  });

  app.addEventListener("submit", (event) => {
    if (event.target.id !== "portfolio-form") return;
    event.preventDefault();
    savePortfolio(event.target);
  });

  app.addEventListener("change", (event) => {
    if (event.target.id === "preview-template") updateTemplate(event.target.value);
    if (event.target.id === "field-photo" && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 1024 * 1024) { notify("Choose an image smaller than 1 MB."); event.target.value = ""; return; }
      const reader = new FileReader();
      reader.onload = () => {
        state.draft.photo = reader.result;
        document.getElementById("photo-preview").innerHTML = `<img src="${escapeHtml(reader.result)}" alt="Profile preview" />`;
      };
      reader.readAsDataURL(file);
    }
  });

  modalRoot.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='close-settings']")) closeSettings();
  });
  modalRoot.addEventListener("submit", async (event) => {
    if (event.target.id !== "settings-form") return;
    event.preventDefault();
    const values = new FormData(event.target);
    config.url = values.get("url").trim().replace(/\/$/, "");
    config.key = values.get("key").trim();
    localStorage.setItem("folio-supabase-config", JSON.stringify({ url: config.url, key: config.key }));
    closeSettings();
    setConnectionUI();
    await loadPortfolios();
    notify("Database connected. Your portfolios are now loading.");
  });

  document.getElementById("settings-button").addEventListener("click", openSettings);
  document.getElementById("top-create").addEventListener("click", () => openForm());
  document.querySelectorAll("[data-nav]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); go(link.dataset.nav); }));
  document.querySelector(".brand").addEventListener("click", (event) => { event.preventDefault(); go("home"); });
  window.addEventListener("popstate", () => {
    const route = readRoute();
    state.page = route.page;
    state.activeId = route.id;
    render();
  });

  render();
  loadPortfolios();
})();
