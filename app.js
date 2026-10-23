(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};
  let supabase;
  let currentUser;
  let contacts = [];
  let conversations = [];
  let rules = [];

  function setNotice(message, type = "error") {
    const el = $("global-notice");
    el.textContent = message;
    el.className = `notice ${type}`;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function clearNotice() {
    $("global-notice").textContent = "";
    $("global-notice").className = "notice hidden";
  }
  function configReady() {
    return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_URL.includes("PASTE_") &&
      !cfg.SUPABASE_ANON_KEY.includes("PASTE_");
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function dateLabel(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function failIf(error) {
    if (error) throw error;
  }
  function go(view) {
    document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
    const target = $(`view-${view}`);
    if (!target) return;
    target.classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
    $("page-title").textContent = view.charAt(0).toUpperCase() + view.slice(1);
    $("sidebar").classList.remove("sidebar-open");
    clearNotice();
    if (view === "contacts") renderContacts();
  }
  async function loadAll() {
    const [contactResult, conversationResult, ruleResult] = await Promise.all([
      supabase.from("contacts").select("id,name,email,phone,created_at").order("created_at", { ascending: false }),
      supabase.from("conversations").select("id,subject,channel,status,updated_at").order("updated_at", { ascending: false }),
      supabase.from("automation_rules").select("id,name,trigger_type,action_description,is_active,created_at").order("created_at", { ascending: false })
    ]);
    // A missing table/policy is surfaced clearly rather than replaced with fake/demo data.
    failIf(contactResult.error);
    failIf(conversationResult.error);
    failIf(ruleResult.error);
    contacts = contactResult.data || [];
    conversations = conversationResult.data || [];
    rules = ruleResult.data || [];
    renderAll();
  }
  function renderAll() {
    $("stat-contacts").textContent = contacts.length;
    $("stat-conversations").textContent = conversations.length;
    $("stat-rules").textContent = rules.length;
    renderContacts();
    renderConversations();
    renderRules();
  }
  function renderContacts() {
    const search = ($("contact-search")?.value || "").trim().toLowerCase();
    const filtered = contacts.filter((c) => [c.name, c.email, c.phone].some((v) => String(v || "").toLowerCase().includes(search)));
    $("contacts-table").innerHTML = filtered.map((c) => `<tr>
      <td><strong>${escapeHTML(c.name)}</strong></td><td>${escapeHTML(c.email || "—")}</td>
      <td>${escapeHTML(c.phone || "—")}</td><td>${dateLabel(c.created_at)}</td>
      <td><button class="table-delete" type="button" data-delete-contact="${escapeHTML(c.id)}" aria-label="Delete ${escapeHTML(c.name)}">Delete</button></td></tr>`).join("");
    $("contacts-empty").classList.toggle("hidden", filtered.length > 0);
  }
  function renderConversations() {
    $("conversations-table").innerHTML = conversations.map((c) => `<tr>
      <td><strong>${escapeHTML(c.subject || "Untitled conversation")}</strong></td>
      <td><span class="pill">${escapeHTML(c.channel || "Unspecified")}</span></td>
      <td><span class="pill">${escapeHTML(c.status || "open")}</span></td>
      <td>${dateLabel(c.updated_at)}</td></tr>`).join("");
    $("conversations-empty").classList.toggle("hidden", conversations.length > 0);
  }
  function renderRules() {
    $("rules-list").innerHTML = rules.map((r) => `<article class="rule-card">
      <div class="rule-top"><div><h3>${escapeHTML(r.name)}</h3><p class="muted">${escapeHTML(r.trigger_type.replaceAll("_", " "))}</p></div>
      <span class="pill ${r.is_active ? "pill-active" : ""}">${r.is_active ? "Active" : "Inactive"}</span></div>
      <p class="rule-description">${escapeHTML(r.action_description)}</p>
      <div class="rule-footer"><span class="muted">Saved ${dateLabel(r.created_at)}</span>
      <button type="button" class="table-delete" data-delete-rule="${escapeHTML(r.id)}">Delete</button></div></article>`).join("");
    $("rules-empty").classList.toggle("hidden", rules.length > 0);
  }
  function showForm(id, show) {
    $(id).classList.toggle("hidden", !show);
    if (show) $(id).scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function handleContactSubmit(event) {
    event.preventDefault();
    clearNotice();
    const payload = {
      user_id: currentUser.id,
      name: $("contact-name").value.trim(),
      email: $("contact-email").value.trim() || null,
      phone: $("contact-phone").value.trim() || null
    };
    if (!payload.name) return setNotice("Enter a contact name.");
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const { error } = await supabase.from("contacts").insert(payload);
      failIf(error);
      $("contact-form").reset();
      showForm("contact-form-card", false);
      await loadAll();
      setNotice("Contact saved successfully.", "success");
    } catch (error) {
      setNotice(error.message || "Could not save contact.");
    } finally {
      if (button) button.disabled = false;
    }
  }
  async function handleRuleSubmit(event) {
    event.preventDefault();
    clearNotice();
    const payload = {
      user_id: currentUser.id,
      name: $("rule-name").value.trim(),
      trigger_type: $("rule-trigger").value,
      action_description: $("rule-action").value.trim(),
      is_active: true
    };
    if (!payload.name || !payload.action_description) return setNotice("Complete all required rule fields.");
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const { error } = await supabase.from("automation_rules").insert(payload);
      failIf(error);
      $("rule-form").reset();
      showForm("rule-form-card", false);
      await loadAll();
      setNotice("Automation rule saved. It will not execute until an automation backend and channel are connected.", "success");
    } catch (error) {
      setNotice(error.message || "Could not save rule.");
    } finally {
      if (button) button.disabled = false;
    }
  }
  async function removeRecord(table, id, label) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    clearNotice();
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      failIf(error);
      await loadAll();
      setNotice(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted.`, "success");
    } catch (error) {
      setNotice(error.message || `Could not delete ${label}.`);
    }
  }
  async function signOut() {
    clearNotice();
    try {
      const { error } = await supabase.auth.signOut();
      failIf(error);
      window.location.replace("login.html");
    } catch (error) {
      setNotice(error.message || "Could not sign out.");
    }
  }
  async function init() {
    $("year").textContent = new Date().getFullYear();
    if (!configReady() || !window.supabase) {
      $("app-loading").classList.add("hidden");
      $("app").classList.remove("hidden");
      setNotice("Setup required: add your Supabase project URL and publishable/anon key in config.js.");
      return;
    }
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    try {
      const { data, error } = await supabase.auth.getSession();
      failIf(error);
      if (!data.session) {
        window.location.replace("login.html");
        return;
      }
      currentUser = data.session.user;
      $("user-email").textContent = currentUser.email || "Account";
      $("settings-email").textContent = currentUser.email || "Account";
      $("user-avatar").textContent = (currentUser.email || "K").charAt(0).toUpperCase();
      $("app-loading").classList.add("hidden");
      $("app").classList.remove("hidden");
      await loadAll();
    } catch (error) {
      $("app-loading").classList.add("hidden");
      $("app").classList.remove("hidden");
      setNotice(`${error.message || "Could not load workspace."} Check that the SQL schema has been run in Supabase.`);
    }
    document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => go(button.dataset.view)));
    document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => go(button.dataset.go)));
    $("logout-button").addEventListener("click", signOut);
    $("settings-logout").addEventListener("click", signOut);
    $("mobile-menu").addEventListener("click", () => $("sidebar").classList.toggle("sidebar-open"));
    $("add-contact-button").addEventListener("click", () => showForm("contact-form-card", true));
    $("cancel-contact").addEventListener("click", () => { $("contact-form").reset(); showForm("contact-form-card", false); });
    $("contact-form").addEventListener("submit", handleContactSubmit);
    $("contact-search").addEventListener("input", renderContacts);
    $("add-rule-button").addEventListener("click", () => showForm("rule-form-card", true));
    $("cancel-rule").addEventListener("click", () => { $("rule-form").reset(); showForm("rule-form-card", false); });
    $("rule-form").addEventListener("submit", handleRuleSubmit);
    document.addEventListener("click", (event) => {
      const contactButton = event.target.closest("[data-delete-contact]");
      const ruleButton = event.target.closest("[data-delete-rule]");
      if (contactButton) removeRecord("contacts", contactButton.dataset.deleteContact, "contact");
      if (ruleButton) removeRecord("automation_rules", ruleButton.dataset.deleteRule, "automation rule");
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) window.location.replace("login.html");
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();