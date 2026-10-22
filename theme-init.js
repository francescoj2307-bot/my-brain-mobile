(function initializeTheme() {
  let theme = "dark";
  const appPreference = "__MY_BRAIN_THEME__";
  try {
    const saved = localStorage.getItem("my-brain-theme");
    if (appPreference === "light" || appPreference === "dark") theme = appPreference;
    else if (saved === "light" || saved === "dark") theme = saved;
  } catch {
    // The preference is optional; My Brain still works without storage access.
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();