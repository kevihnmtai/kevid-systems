(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};
  const notice = $("auth-notice");
  let isSignup = false;
  let supabase = null;

  function showNotice(message, type = "error") {
    notice.textContent = message;
    notice.className = `notice ${type}`;
  }
  function hideNotice() {
    notice.textContent = "";
    notice.className = "notice hidden";
  }
  function configReady() {
    return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_URL.includes("PASTE_") &&
      !cfg.SUPABASE_ANON_KEY.includes("PASTE_");
  }
  function setMode(signup) {
    isSignup = signup;
    hideNotice();
    $("auth-heading").textContent = signup ? "Create your account" : "Welcome back";
    $("auth-subheading").textContent = signup
      ? "Create an account to start your workspace."
      : "Sign in to manage your customer conversations.";
    $("submit-button").textContent = signup ? "Create account" : "Sign in";
    $("switch-copy").textContent = signup ? "Already have an account?" : "New to Kevid Systems?";
    $("switch-mode").textContent = signup ? "Sign in" : "Create account";
    $("confirm-label").classList.toggle("hidden", !signup);
    $("confirm-password").classList.toggle("hidden", !signup);
    $("confirm-password").required = signup;
    $("password").autocomplete = signup ? "new-password" : "current-password";
  }
  async function init() {
    $("year").textContent = new Date().getFullYear();
    if (!configReady() || !window.supabase) {
      showNotice("Setup required: add your Supabase project URL and publishable/anon key in config.js, then reload.");
      $("submit-button").disabled = true;
      return;
    }
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) window.location.replace("index.html");
    } catch (error) {
      showNotice(error.message || "Could not check your session. Please reload.");
    }
    $("switch-mode").addEventListener("click", () => setMode(!isSignup));
    $("auth-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      hideNotice();
      const email = $("email").value.trim().toLowerCase();
      const password = $("password").value;
      const confirm = $("confirm-password").value;
      if (isSignup && password !== confirm) {
        showNotice("The passwords do not match.");
        return;
      }
      const button = $("submit-button");
      button.disabled = true;
      button.textContent = isSignup ? "Creating account…" : "Signing in…";
      try {
        if (isSignup) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          if (data.session) {
            window.location.replace("index.html");
            return;
          }
          showNotice("Account request received. Check your email to confirm the account, then sign in.", "success");
          setMode(false);
          $("email").value = email;
          $("password").value = "";
          $("confirm-password").value = "";
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          window.location.replace("index.html");
          return;
        }
      } catch (error) {
        showNotice(error.message || "Authentication failed. Please try again.");
      } finally {
        button.disabled = false;
        button.textContent = isSignup ? "Create account" : "Sign in";
      }
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();