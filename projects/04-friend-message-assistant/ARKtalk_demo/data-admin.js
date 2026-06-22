(function () {
  const root = document.getElementById("inventoryRoot");
  const statusOrder = ["complete", "demo", "imported-skeleton", "incomplete"];
  const statusText = {
    complete: "完整可用",
    demo: "演示数据",
    "imported-skeleton": "导入骨架",
    incomplete: "待补充",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSummary(summary) {
    const statusCards = statusOrder
      .map((status) => {
        const count = summary.byStatus?.[status] || 0;
        return `
          <article class="inventory-metric status-${status}">
            <span>${statusText[status]}</span>
            <strong>${count}</strong>
          </article>
        `;
      })
      .join("");

    return `
      <div class="inventory-summary">
        <article class="inventory-metric primary">
          <span>数据总量</span>
          <strong>${summary.total}</strong>
        </article>
        <article class="inventory-metric primary">
          <span>平均完整度</span>
          <strong>${summary.averageScore}%</strong>
        </article>
        ${statusCards}
      </div>
    `;
  }

  function renderMissing(item) {
    if (!item.missing?.length) return "无";
    return item.missing.map((field) => `<code>${escapeHtml(field)}</code>`).join(" ");
  }

  function renderRows(items) {
    return items
      .map((item) => {
        const source = item.sourceUrl
          ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceName || "来源")}</a>`
          : escapeHtml(item.sourceName || "未记录");

        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.path)}</small>
            </td>
            <td>${escapeHtml(item.type)}</td>
            <td><span class="trust-pill status-${escapeHtml(item.status)}">${escapeHtml(item.statusLabel)}</span></td>
            <td>
              <div class="score-bar" aria-label="完整度 ${item.score}%">
                <span style="width: ${Number(item.score) || 0}%"></span>
              </div>
              <b>${item.score}%</b>
            </td>
            <td>${renderMissing(item)}</td>
            <td>${source}<small>${escapeHtml(item.updatedAt || "未记录")}</small></td>
          </tr>
        `;
      })
      .join("");
  }

  function renderInventory(inventory) {
    const items = [...inventory.items].sort((a, b) => {
      const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });

    root.innerHTML = `
      ${renderSummary(inventory.summary)}
      <div class="inventory-toolbar">
        <p>最近扫描：${escapeHtml(new Date(inventory.generatedAt).toLocaleString("zh-CN"))}</p>
        <a href="integration-guide.html">查看 WebView 接入说明</a>
      </div>
      <div class="inventory-table-wrap">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>条目</th>
              <th>类型</th>
              <th>状态</th>
              <th>完整度</th>
              <th>待补字段</th>
              <th>来源 / 更新时间</th>
            </tr>
          </thead>
          <tbody>${renderRows(items)}</tbody>
        </table>
      </div>
    `;
  }

  async function loadInventory() {
    try {
      const response = await fetch("/api/wiki/inventory");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      renderInventory(await response.json());
    } catch (error) {
      root.innerHTML = `
        <div class="inventory-error">
          <h2>数据读取失败</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  loadInventory();
})();
