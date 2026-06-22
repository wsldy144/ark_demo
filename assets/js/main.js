const releaseLinks = document.querySelectorAll("[data-release-asset]");

function buildReleaseUrl(assetName) {
  const host = window.location.hostname;
  const pathParts = window.location.pathname.split("/").filter(Boolean);

  if (!host.endsWith(".github.io")) {
    return null;
  }

  const owner = host.replace(".github.io", "");
  const rootSiteDirs = new Set(["projects", "assets", "downloads"]);
  const repo =
    pathParts.length > 0 && !rootSiteDirs.has(pathParts[0])
      ? pathParts[0]
      : `${owner}.github.io`;
  return `https://github.com/${owner}/${repo}/releases/latest/download/${encodeURIComponent(assetName)}`;
}

releaseLinks.forEach((link) => {
  const assetName = link.dataset.releaseAsset;
  const releaseUrl = buildReleaseUrl(assetName);

  if (releaseUrl) {
    link.href = releaseUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
  }
});
