// ============================================================================
// Brew POS — Clean auth guard
// ============================================================================
// The real loop source was a combination of:
//   1) stale localStorage session data
//   2) duplicate redirect pages in the repo root and /brew-pos
//   3) redirect listeners firing multiple times while the app was still changing routes
// We guard against every one of those here.
// ============================================================================

import { auth } from "./backend.js";

const REDIRECT_GUARD_KEY = "brewpos_redirect_guard";

export function clearRedirectGuard() {
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  } catch {
    // Ignore storage access issues in restricted contexts.
  }
}

function currentPage() {
  try {
    return window.location.pathname.split("/").pop() || "index.html";
  } catch {
    return "index.html";
  }
}

function redirect(target) {
  if (!target) return;

  const page = currentPage();
  if (page === target) {
    clearRedirectGuard();
    return;
  }

  const lastTarget = sessionStorage.getItem(REDIRECT_GUARD_KEY);
  if (lastTarget === target) return;

  sessionStorage.setItem(REDIRECT_GUARD_KEY, target);
  window.location.replace(target);
}

export function requireAuth(onReady) {
  const user = auth?.getCurrentUser?.();
  console.log("requireAuth: current user =", user);
  if (user) {
    clearRedirectGuard();
    onReady(user);
    return () => {};
  }

  let resolved = false;
  return auth?.onAuthChange?.((nextUser) => {
    console.log("requireAuth: auth change, nextUser =", nextUser, "resolved =", resolved);
    if (resolved) return;
    if (!nextUser) {
      clearRedirectGuard();
      redirect("login.html");
      return;
    }
    resolved = true;
    clearRedirectGuard();
    onReady(nextUser);
  }) || (() => {});
}

export function requireAdmin(onReady) {
  const user = auth?.getCurrentUser?.();
  console.log("requireAdmin: current user =", user, "role =", user?.role);
  if (user && user.role === "admin") {
    clearRedirectGuard();
    onReady(user);
    return () => {};
  }
  if (user && user.role !== "admin") {
    clearRedirectGuard();
    redirect("app.html");
    return () => {};
  }

  let resolved = false;
  return auth?.onAuthChange?.((nextUser) => {
    console.log("requireAdmin: auth change, nextUser =", nextUser, "role =", nextUser?.role, "resolved =", resolved);
    if (resolved) return;
    if (!nextUser) {
      clearRedirectGuard();
      redirect("login.html");
      return;
    }
    if (nextUser.role !== "admin") {
      clearRedirectGuard();
      redirect("app.html");
      return;
    }
    resolved = true;
    clearRedirectGuard();
    onReady(nextUser);
  }) || (() => {});
}

export function redirectIfAuthed(targetRole = null) {
  const user = auth?.getCurrentUser?.();
  if (!user) return;

  clearRedirectGuard();
  const target = targetRole === "admin" || user.role === "admin"
    ? "admin.html"
    : "app.html";

  redirect(target);
}
