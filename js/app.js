const expressionElement = document.querySelector("#expression");
const resultElement = document.querySelector("#result");
const messageElement = document.querySelector("#message");
const historyList = document.querySelector("#history-list");
const historyStatus = document.querySelector("#history-status");
const refreshButton = document.querySelector("#refresh-history");
const searchForm = document.querySelector("#history-search");
const searchKeyword = document.querySelector("#search-keyword");
const favoriteOnly = document.querySelector("#favorite-only");
const buttons = document.querySelector(".calculator");
const pageContainer = document.querySelector(".page-container");
const historyPanel = document.querySelector("#history-panel");
const toggleHistoryButton = document.querySelector("#toggle-history");
const deleteSelectedButton = document.querySelector("#delete-selected");

let expression = "";
let currentPage = 1;
let totalPages = 1;
let historyVersion = 0;
let visibleHistoryRecords = new Map();
const selectedHistoryIds = new Set();

toggleHistoryButton.addEventListener("click", () => {
  const willHide = !historyPanel.hidden;
  historyPanel.hidden = willHide;
  pageContainer.classList.toggle("history-collapsed", willHide);
  toggleHistoryButton.textContent = willHide ? "Show History" : "Hide History";
  toggleHistoryButton.setAttribute("aria-expanded", String(!willHide));
});

function updateExpression() {
  expressionElement.textContent = expression || "0";
}

function showMessage(message = "") {
  messageElement.textContent = message;
}

buttons.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.number !== undefined) {
    expression += button.dataset.number;
  } else if (button.dataset.operator) {
    expression += button.dataset.operator;
  } else if (button.dataset.value) {
    expression += button.dataset.value;
  } else if (button.dataset.constant) {
    if (/[\d.)]$/.test(expression) || /(?:pi|e)$/.test(expression)) expression += "*";
    expression += button.dataset.constant;
  } else if (button.dataset.function) {
    expression = expression
      ? `${button.dataset.function}(${expression})`
      : `${button.dataset.function}(`;
  } else if (button.dataset.action === "reciprocal") {
    expression = `1/(${expression || "0"})`;
  } else if (button.dataset.action === "square") {
    expression = `(${expression || "0"})^2`;
  } else if (button.dataset.action === "sqrt") {
    expression = `sqrt(${expression || "0"})`;
  } else if (button.dataset.action === "clear") {
    expression = "";
    resultElement.textContent = "0";
    showMessage();
  } else if (button.dataset.action === "delete") {
    expression = expression.slice(0, -1);
  } else if (button.dataset.action === "calculate") {
    await submitCalculation();
  }

  updateExpression();
});

async function submitCalculation() {
  if (!expression.trim()) {
    showMessage("Please enter an expression");
    return;
  }

  expression = closeOpenParentheses(expression);
  updateExpression();
  showMessage("Calculating...");
  try {
    const data = await calculate(expression, "DEG");
    resultElement.textContent = data.result;
    showMessage();
    currentPage = 1;
    await loadHistory();
  } catch (error) {
    showMessage(error.message || "Unable to connect to the server");
  }
}

function closeOpenParentheses(value) {
  let balance = 0;
  for (const character of value) {
    if (character === "(") balance += 1;
    if (character === ")") balance -= 1;
    if (balance < 0) return value;
  }
  return value + ")".repeat(balance);
}

async function loadHistory() {
  const version = ++historyVersion;
  historyStatus.textContent = "Loading...";
  try {
    const data = await getHistory(searchKeyword.value.trim(), favoriteOnly.checked, currentPage);
    if (version !== historyVersion) return;
    if (!Array.isArray(data.items) || typeof data.total !== "number") {
      throw new Error("Invalid history response");
    }
    totalPages = Math.max(1, Math.ceil(data.total / data.page_size));
    if (currentPage > totalPages) {
      currentPage = totalPages;
      return loadHistory();
    }
    const records = data.items;
    visibleHistoryRecords = new Map(records.map(record => [String(record.id), record]));
    selectedHistoryIds.clear();
    updateBatchControls();
    document.querySelector("#page-info").textContent = `Page ${currentPage} / ${totalPages} · ${data.total} total`;
    document.querySelector("#previous-page").disabled = currentPage <= 1;
    document.querySelector("#next-page").disabled = currentPage >= totalPages;
    historyList.innerHTML = records.map(record => `
      <li>
        <input class="history-select" type="checkbox" data-select-id="${record.id}"
               aria-label="Select ${escapeHtml(record.expression)}">
        <span class="history-expression">${escapeHtml(record.expression)} = ${record.result}</span>
        <time>
          ${new Date(record.created_at).toLocaleString("en-US")}
          <span class="angle-badge">${record.angle_mode === "RAD" ? "RAD" : "DEG"}</span>
        </time>
        <div class="history-metadata">
          ${record.note ? `<span class="history-note"><strong>Note:</strong> ${escapeHtml(record.note)}</span>` : ""}
        </div>
        <span class="history-actions">
          <button class="favorite-button" type="button"
            data-favorite-id="${record.id}"
            data-favorite="${record.is_favorite}"
            aria-label="${record.is_favorite ? "Remove from favorites" : "Add to favorites"}">
            ${record.is_favorite ? "★" : "☆"}
          </button>
          <button class="copy-button" type="button" data-copy-id="${record.id}">Copy</button>
          <button class="metadata-button" type="button" data-metadata-id="${record.id}">Note</button>
          <button class="delete-button" type="button" data-history-id="${record.id}">Delete</button>
        </span>
      </li>
    `).join("");
    historyStatus.textContent = records.length ? "" : "No records found";
  } catch (error) {
    if (version !== historyVersion) return;
    historyStatus.textContent = error.message || "Unable to connect to the server";
  }
}

historyList.addEventListener("click", async event => {
  const copyButton = event.target.closest("button[data-copy-id]");
  if (copyButton) {
    const record = visibleHistoryRecords.get(copyButton.dataset.copyId);
    if (!record) return;
    try {
      await copyText(String(record.result));
      showMessage("Result copied");
    } catch {
      showMessage("Copy failed");
    }
    return;
  }

  const metadataButton = event.target.closest("button[data-metadata-id]");
  if (metadataButton) {
    const record = visibleHistoryRecords.get(metadataButton.dataset.metadataId);
    if (!record) return;
    const note = window.prompt("Note (maximum 200 characters):", record.note || "");
    if (note === null) return;
    try {
      await updateHistoryMetadata(record.id, note.slice(0, 200));
      await loadHistory();
      showMessage();
    } catch (error) {
      if (error.message === "Not Found") {
        await loadHistory();
        showMessage();
      } else {
        showMessage(error.message || "Unable to update note");
      }
    }
    return;
  }

  const favoriteButton = event.target.closest("button[data-favorite-id]");
  if (favoriteButton) {
    try {
      const nextState = favoriteButton.dataset.favorite !== "true";
      await updateFavorite(favoriteButton.dataset.favoriteId, nextState);
      await loadHistory();
    } catch (error) {
      showMessage(error.message);
    }
    return;
  }

  const button = event.target.closest("button[data-history-id]");
  if (!button) return;
  if (!window.confirm("Delete this record?")) return;
  try {
    await deleteHistory(button.dataset.historyId);
    await loadHistory();
  } catch (error) {
    showMessage(error.message);
  }
});

historyList.addEventListener("change", event => {
  const checkbox = event.target.closest("input[data-select-id]");
  if (!checkbox) return;
  if (checkbox.checked) selectedHistoryIds.add(checkbox.dataset.selectId);
  else selectedHistoryIds.delete(checkbox.dataset.selectId);
  updateBatchControls();
});

deleteSelectedButton.addEventListener("click", async () => {
  const ids = [...selectedHistoryIds].map(Number);
  if (!ids.length) return;
  if (!window.confirm(`Delete ${ids.length} selected record(s)?`)) return;
  try {
    const data = await deleteSelectedHistory(ids);
    showMessage(`${data.deleted_count} selected record(s) deleted`);
    await loadHistory();
  } catch (error) {
    showMessage(error.message);
  }
});

refreshButton.addEventListener("click", loadHistory);
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  currentPage = 1;
  loadHistory();
});
favoriteOnly.addEventListener("change", () => {
  currentPage = 1;
  loadHistory();
});
document.querySelector("#previous-page").onclick = () => {
  if (currentPage > 1) { currentPage -= 1; loadHistory(); }
};
document.querySelector("#next-page").onclick = () => {
  if (currentPage < totalPages) { currentPage += 1; loadHistory(); }
};
document.querySelector("#clear-history").onclick = async () => {
  if (!window.confirm("Delete all history? Favorites and records hidden by filters will also be deleted. This cannot be undone.")) return;
  try {
    const data = await clearHistory();
    currentPage = 1;
    showMessage(`${data.deleted_count} record(s) deleted`);
    await loadHistory();
  } catch (error) { showMessage(error.message || "Failed to clear history"); }
};

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function updateBatchControls() {
  deleteSelectedButton.disabled = selectedHistoryIds.size === 0;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy failed");
}

loadHistory();
