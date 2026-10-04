const API_BASE_URL = window.CALCULATOR_API_BASE_URL.replace(/\/$/, "");

async function readResponse(response, fallbackMessage) {
  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok ? "The server returned an invalid response" : fallbackMessage);
  }

  if (!response.ok) {
    throw new Error(data.message || data.detail || fallbackMessage);
  }
  return data;
}

async function calculate(expression, angleMode = "DEG") {
  const response = await fetch(`${API_BASE_URL}/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expression, angle_mode: angleMode })
  });

  return readResponse(response, "Calculation failed");
}

async function getHistory(keyword = "", favoriteOnly = false, page = 1) {
  const parameters = new URLSearchParams();
  parameters.set("page", page);
  parameters.set("page_size", "10");
  if (keyword) parameters.set("keyword", keyword);
  if (favoriteOnly) parameters.set("favorite_only", "true");
  const query = parameters.toString();
  const response = await fetch(`${API_BASE_URL}/history${query ? `?${query}` : ""}`);
  return readResponse(response, "Failed to load history");
}

async function updateFavorite(id, isFavorite) {
  const response = await fetch(`${API_BASE_URL}/history/${id}/favorite`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_favorite: isFavorite })
  });
  return readResponse(response, "Failed to update favorite");
}

async function deleteHistory(id) {
  const response = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: "DELETE"
  });

  return readResponse(response, "Failed to delete the record");
}

async function clearHistory() {
  const response = await fetch(`${API_BASE_URL}/history`, { method: "DELETE" });
  return readResponse(response, "Failed to clear history");
}

async function deleteSelectedHistory(ids) {
  const response = await fetch(`${API_BASE_URL}/history/batch`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
  return readResponse(response, "Failed to delete selected records");
}

async function updateHistoryMetadata(id, note) {
  const response = await fetch(`${API_BASE_URL}/history/${id}/metadata`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note })
  });
  return readResponse(response, "Failed to update note");
}
