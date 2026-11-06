// Runs before the page draws, so the saved look applies without a flash of the default.
for (const name of ["tone", "size"]) {
  try {
    const saved = localStorage.getItem(`bits-${name}`);
    if (saved) {
      document.documentElement.dataset[name] = saved;
    }
  } catch (error) {
    // Some private windows block storage. The default look still works.
  }
}
