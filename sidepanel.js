// Configure Tailwind
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#007aff",
        "mac-dark": "#1e1e1e",
        "mac-column": "#161616",
        "mac-border": "#323232",
        "mac-selected": "#0058d1",
      },
    },
  },
};

// Theme Toggle
const themeToggleBtn = document.getElementById("theme-toggle");
const html = document.documentElement;
const lockBtn = document.getElementById("lock-btn");

let isLocked = localStorage.getItem("shiftclip_locked") === "true";

function updateLockIcon() {
  if (!lockBtn) return;
  if (isLocked) {
    lockBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    lockBtn.classList.add("text-primary");
  } else {
    lockBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
    lockBtn.classList.remove("text-primary");
  }
}

if (lockBtn) {
  lockBtn.addEventListener("click", () => {
    isLocked = !isLocked;
    localStorage.setItem("shiftclip_locked", isLocked);
    updateLockIcon();
    renderColumns();
  });
  updateLockIcon();
}

if (localStorage.getItem("theme") === "light") {
  html.classList.remove("dark");
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    html.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      html.classList.contains("dark") ? "dark" : "light",
    );
  });
}

// Dropdown functionality
const addBtn = document.getElementById("add-btn");
const addDropdown = document.getElementById("add-dropdown");
const addFolderBtn = document.getElementById("add-folder-btn");
const addClipBtn = document.getElementById("add-clip-btn");

// Modal elements
const clipModal = document.getElementById("clip-modal");
const clipSubjectInput = document.getElementById("clip-subject");
const clipDescriptionInput = document.getElementById("clip-description");
const clipCancelBtn = document.getElementById("clip-cancel");
const clipSaveBtn = document.getElementById("clip-save");

// Folder Modal elements
const folderModal = document.getElementById("folder-modal");
const folderNameInput = document.getElementById("folder-name");
const folderCancelBtn = document.getElementById("folder-cancel");
const folderSaveBtn = document.getElementById("folder-save");

// Toast elements
const toastContainer = document.getElementById("toast-container");

// Context Menu elements
const contextMenu = document.getElementById("context-menu");
const customTooltip = document.getElementById("custom-tooltip");

// Search elements
const searchInput = document.getElementById("search-input");
const searchResultsContainer = document.getElementById("search-results");
const breadcrumbBar = document.getElementById("breadcrumb-bar");

function showToast(message) {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className =
    "pointer-events-auto bg-[#0084ff] border border-white/10 text-white pl-4 pr-2 py-2 rounded-[15px] shadow-lg text-[15px] transition-all duration-500 transform -translate-x-full opacity-0 flex items-center gap-3";

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  const closeBtn = document.createElement("button");
  closeBtn.className =
    "p-1 hover:bg-white/20 rounded-[15px] text-white/80 hover:text-white transition-colors";
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  const remove = () => {
    toast.classList.add("-translate-x-full", "opacity-0");
    setTimeout(() => {
      toast.remove();
    }, 500);
  };

  closeBtn.onclick = remove;
  toast.appendChild(closeBtn);

  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove("-translate-x-full", "opacity-0");
  });

  // Remove after 5 seconds
  setTimeout(remove, 5000);
}

function showTooltip(e, text) {
  if (!customTooltip) return;
  customTooltip.textContent = text;
  customTooltip.classList.remove("hidden");
  updateTooltipPosition(e);
}

function hideTooltip() {
  if (!customTooltip) return;
  customTooltip.classList.add("hidden");
}

function updateTooltipPosition(e) {
  if (!customTooltip) return;
  customTooltip.style.left = `${e.clientX + 10}px`;
  customTooltip.style.top = `${e.clientY + 10}px`;
}

if (addBtn && addDropdown) {
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (
      !addDropdown.classList.contains("hidden") &&
      !addBtn.contains(e.target) &&
      !addDropdown.contains(e.target)
    ) {
      addDropdown.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) {
      contextMenu.classList.add("hidden");
    }
  });
}

// Data & State
let fileSystem = [];
try {
  const stored = localStorage.getItem("shiftclip_data");
  if (stored) {
    fileSystem = JSON.parse(stored);
  } else {
    fileSystem = [];
    localStorage.setItem("shiftclip_data", JSON.stringify(fileSystem));
  }
} catch (e) {
  console.error("Error loading data:", e);
}

let selectedPath = []; // Array of indices representing the path
let editingItem = null; // Track if we are editing an existing clip

function saveData() {
  localStorage.setItem("shiftclip_data", JSON.stringify(fileSystem));
  renderColumns();
}

function getTargetChildren() {
  let currentLevel = fileSystem;
  for (let i = 0; i < selectedPath.length; i++) {
    const index = selectedPath[i];
    const item = currentLevel[index];
    if (item && item.type === "folder") {
      if (i === selectedPath.length - 1) {
        return item.children;
      }
      currentLevel = item.children;
    } else {
      return currentLevel;
    }
  }
  return currentLevel;
}

if (addFolderBtn) {
  addFolderBtn.addEventListener("click", () => {
    addDropdown.classList.add("hidden");
    if (folderModal) {
      folderNameInput.value = "";
      folderModal.classList.remove("hidden");
      folderNameInput.focus();
    }
  });
}

if (addClipBtn) {
  addClipBtn.addEventListener("click", () => {
    addDropdown.classList.add("hidden");
    editingItem = null; // Reset editing state
    if (clipModal) {
      clipSubjectInput.value = "";
      clipDescriptionInput.value = "";
      clipModal.classList.remove("hidden");
      clipSubjectInput.focus();
    }
  });
}

if (clipCancelBtn) {
  clipCancelBtn.addEventListener("click", () => {
    clipModal.classList.add("hidden");
  });
}

if (clipSaveBtn) {
  clipSaveBtn.addEventListener("click", () => {
    const name = clipSubjectInput.value.trim();
    const description = clipDescriptionInput.value.trim();

    if (name) {
      if (editingItem) {
        // Update existing item
        editingItem.name = name;
        editingItem.description = description || "";
        editingItem = null;
      } else {
        // Create new item
        getTargetChildren().push({
          id: Date.now().toString(),
          type: "clip",
          name,
          description: description || "",
        });
      }
      saveData();
      clipModal.classList.add("hidden");
    } else {
      clipSubjectInput.focus();
    }
  });
}

if (clipModal) {
  clipModal.addEventListener("click", (e) => {
    if (e.target === clipModal) {
      clipModal.classList.add("hidden");
    }
  });
}

if (folderCancelBtn) {
  folderCancelBtn.addEventListener("click", () => {
    folderModal.classList.add("hidden");
  });
}

if (folderSaveBtn) {
  folderSaveBtn.addEventListener("click", () => {
    const name = folderNameInput.value.trim();
    if (name) {
      getTargetChildren().push({
        id: Date.now().toString(),
        type: "folder",
        name,
        children: [],
      });
      saveData();
      folderModal.classList.add("hidden");
    } else {
      folderNameInput.focus();
    }
  });
}

if (folderModal) {
  folderModal.addEventListener("click", (e) => {
    if (e.target === folderModal) {
      folderModal.classList.add("hidden");
    }
  });
}

// Search functionality
if (searchInput && searchResultsContainer) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      searchResultsContainer.innerHTML = "";
      searchResultsContainer.classList.add("hidden");
      return;
    }

    const results = searchFileSystem(query);
    renderSearchResults(results.slice(0, 5));
  });

  // Hide search results when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !searchResultsContainer.classList.contains("hidden") &&
      !searchInput.contains(e.target) &&
      !searchResultsContainer.contains(e.target)
    ) {
      searchResultsContainer.classList.add("hidden");
    }
  });
}

function searchFileSystem(query) {
  const results = [];

  function recurse(items, path) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const currentPath = [...path, i];

      if (
        item.name.toLowerCase().includes(query) ||
        (item.type === "clip" &&
          item.description &&
          item.description.toLowerCase().includes(query))
      ) {
        results.push({ item, path: currentPath });
      }

      if (item.type === "folder" && item.children) {
        recurse(item.children, currentPath);
      }
    }
  }

  recurse(fileSystem, []);
  return results;
}

function renderSearchResults(results) {
  if (!searchResultsContainer) return;

  if (results.length === 0) {
    searchResultsContainer.innerHTML =
      '<div class="px-3 py-1.5 text-[15px] text-black dark:text-white/40">No results found</div>';
    searchResultsContainer.classList.remove("hidden");
    return;
  }

  searchResultsContainer.innerHTML = "";
  results.forEach(({ item, path }) => {
    const resultItem = document.createElement("button");
    resultItem.className =
      "w-full text-left px-3 py-1.5 text-[15px] text-gray-800 dark:text-white hover:bg-primary hover:text-white transition-colors flex items-center gap-2 group";

    const iconClass = item.type === "folder" ? "icon-folder" : "icon-doc";
    let contentHtml;
    if (item.type === "clip" && item.description) {
      contentHtml = `<div class="flex flex-col flex-1 min-w-0"><span class="truncate">${item.name}</span><span class="text-white/50 group-hover:text-white text-[10px] truncate">${item.description}</span></div>`;
    } else {
      contentHtml = `<span class="flex-1 truncate">${item.name}</span>`;
    }

    resultItem.innerHTML = `<span class="icon ${iconClass}"></span>${contentHtml}`;

    resultItem.addEventListener("click", () => {
      selectedPath = path;
      renderColumns();
      searchResultsContainer.innerHTML = "";
      searchResultsContainer.classList.add("hidden");
      searchInput.value = "";
    });

    searchResultsContainer.appendChild(resultItem);
  });

  searchResultsContainer.classList.remove("hidden");
}

const columnsContainer = document.getElementById("columns-container");
const previewPanel = document.getElementById("preview-panel");
const itemCountElement = document.getElementById("item-count");

function getParentArray(path) {
  let current = fileSystem;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) return null;
    current = current[path[i]].children;
  }
  return current;
}

function moveItem(sourcePath, targetPath) {
  // Prevent moving into self or children
  if (sourcePath.length <= targetPath.length) {
    let isPrefix = true;
    for (let i = 0; i < sourcePath.length; i++) {
      if (sourcePath[i] !== targetPath[i]) {
        isPrefix = false;
        break;
      }
    }
    if (isPrefix) return;
  }

  const sourceParent = getParentArray(sourcePath);
  if (!sourceParent) return;
  const sourceIndex = sourcePath[sourcePath.length - 1];
  const item = sourceParent[sourceIndex];

  const targetParent = getParentArray(targetPath);
  if (!targetParent) return;
  const targetIndex = targetPath[targetPath.length - 1];
  const targetFolder = targetParent[targetIndex];

  if (!targetFolder || targetFolder.type !== "folder") return;

  // Remove from source
  sourceParent.splice(sourceIndex, 1);

  // Add to target
  targetFolder.children.push(item);

  // Update selectedPath to keep the destination folder open
  let newSelectedPath = [...targetPath];
  if (sourceParent === targetParent && sourceIndex < targetIndex) {
    newSelectedPath[newSelectedPath.length - 1]--;
  }
  selectedPath = newSelectedPath;

  saveData();
}

function moveItemToLevel(sourcePath, targetLevelPath) {
  // Prevent moving into self or children
  if (targetLevelPath.length >= sourcePath.length) {
    let isPrefix = true;
    for (let i = 0; i < sourcePath.length; i++) {
      if (sourcePath[i] !== targetLevelPath[i]) {
        isPrefix = false;
        break;
      }
    }
    if (isPrefix) return;
  }

  const sourceParent = getParentArray(sourcePath);
  if (!sourceParent) return;
  const sourceIndex = sourcePath[sourcePath.length - 1];
  const item = sourceParent[sourceIndex];

  let targetArray;
  if (targetLevelPath.length === 0) {
    targetArray = fileSystem;
  } else {
    const parent = getParentArray(targetLevelPath);
    if (!parent) return;
    const index = targetLevelPath[targetLevelPath.length - 1];
    const folder = parent[index];
    if (!folder || folder.type !== "folder") return;
    targetArray = folder.children;
  }

  // Remove from source
  sourceParent.splice(sourceIndex, 1);

  // Add to target
  targetArray.push(item);

  saveData();
}

function showContextMenu(e, item, path) {
  if (!contextMenu) return;

  // Position menu
  const rect = e.target.closest("button").getBoundingClientRect();
  contextMenu.style.top = `${rect.bottom}px`;
  contextMenu.style.left = `${rect.right - 160}px`; // Align right edge roughly
  contextMenu.classList.remove("hidden");

  const colors = ["green", "yellow", "violet", "pink", "orange", "white"];

  let colorOptions = "";
  if (item.type === "folder") {
    colorOptions = `
        <div class="px-3 py-2 border-b border-white/10 flex gap-2 justify-between">
            ${colors
              .map(
                (c) =>
                  `<button class="w-3 h-3 rounded-full ${
                    c === "white" ? "bg-white" : `bg-${c}-500`
                  } hover:scale-125 transition-transform" data-color="${c}"></button>`,
              )
              .join("")}
        </div>`;
  }

  contextMenu.innerHTML = `
        ${colorOptions}
        <button id="ctx-edit" class="w-full text-left px-3 py-2 text-[15px] text-gray-800 dark:text-white hover:bg-primary flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit
        </button>
        <button id="ctx-delete" class="w-full text-left px-3 py-2 text-[15px] text-red-500 dark:text-red-400 hover:bg-primary hover:text-white flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            Delete
        </button>
    `;

  // Bind actions
  contextMenu.querySelectorAll("button[data-color]").forEach((btn) => {
    btn.onclick = () => {
      item.color = btn.dataset.color;
      saveData();
      contextMenu.classList.add("hidden");
    };
  });

  contextMenu.querySelector("#ctx-edit").onclick = () => {
    contextMenu.classList.add("hidden");
    if (item.type === "folder") {
      const newName = prompt("Rename folder:", item.name);
      if (newName) {
        item.name = newName;
        saveData();
      }
    } else {
      editingItem = item;
      clipSubjectInput.value = item.name;
      clipDescriptionInput.value = item.description || "";
      clipModal.classList.remove("hidden");
      clipSubjectInput.focus();
    }
  };

  contextMenu.querySelector("#ctx-delete").onclick = () => {
    contextMenu.classList.add("hidden");
    if (confirm(`Delete ${item.name}?`)) {
      const parent = getParentArray(path);
      const index = path[path.length - 1];
      parent.splice(index, 1);

      // If deleted item was part of selected path, reset selection
      if (selectedPath.length >= path.length) {
        let match = true;
        for (let i = 0; i < path.length; i++) {
          if (path[i] !== selectedPath[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          selectedPath = path.slice(0, path.length - 1);
        }
      }
      saveData();
    }
  };
}

function renderBreadcrumbs() {
  if (!breadcrumbBar) return;
  breadcrumbBar.innerHTML = "";

  const homeBtn = document.createElement("button");
  homeBtn.className = "hover:text-white transition-colors";
  homeBtn.textContent = "Home";
  homeBtn.onclick = () => {
    selectedPath = [];
    renderColumns();
  };
  breadcrumbBar.appendChild(homeBtn);

  let currentLevel = fileSystem;
  for (let i = 0; i < selectedPath.length; i++) {
    const index = selectedPath[i];
    const item = currentLevel[index];
    if (!item) break;

    const separator = document.createElement("img");
    separator.src = "./assets/arrow_dark.png";
    separator.className = "mx-2 opacity-30 w-3 h-3 dark:invert-0 invert";
    breadcrumbBar.appendChild(separator);

    const btn = document.createElement("button");
    btn.className = "hover:text-white transition-colors";
    btn.textContent =
      item.name.length > 10 ? item.name.substring(0, 10) + "..." : item.name;
    const path = selectedPath.slice(0, i + 1);
    btn.onclick = () => {
      selectedPath = path;
      renderColumns();
    };
    breadcrumbBar.appendChild(btn);

    if (item.type === "folder") {
      currentLevel = item.children;
    }
  }
}

function renderColumns() {
  if (!columnsContainer || !previewPanel) return;

  // Remove existing columns (keep preview panel)
  const children = Array.from(columnsContainer.children);
  children.forEach((child) => {
    if (child.id !== "preview-panel") {
      columnsContainer.removeChild(child);
    }
  });

  renderBreadcrumbs();

  // Calculate active depth for visual indicator
  let activeDepth = 0;
  let tempLevel = fileSystem;
  for (let i = 0; i < selectedPath.length; i++) {
    const item = tempLevel[selectedPath[i]];
    if (item && item.type === "folder") {
      tempLevel = item.children;
      activeDepth++;
    } else {
      break;
    }
  }

  let currentItems = fileSystem;
  let depth = 0;
  let isClipSelected = false;

  // Render root column
  renderColumn(currentItems, depth, depth === activeDepth);

  // Render subsequent columns based on selection
  for (let i = 0; i < selectedPath.length; i++) {
    const selectedIndex = selectedPath[i];
    const selectedItem = currentItems[selectedIndex];

    if (selectedItem && selectedItem.type === "folder") {
      currentItems = selectedItem.children || [];
      depth++;
      renderColumn(currentItems, depth, depth === activeDepth);
    } else if (selectedItem && selectedItem.type === "clip") {
      // Update preview
      previewPanel.innerHTML = `<div class="p-4 w-full h-full overflow-auto text-left"><pre class="text-[15px] text-gray-800 dark:text-white/80 font-mono whitespace-pre-wrap">${selectedItem.description || selectedItem.content || ""}</pre></div>`;
      isClipSelected = true;
      break;
    }
  }

  if (itemCountElement) {
    itemCountElement.textContent = `${currentItems.length} item${
      currentItems.length !== 1 ? "s" : ""
    }`;
  }

  if (!isClipSelected) {
    previewPanel.innerHTML =
      '<p class="text-[15px] mt-4 font-medium">Select a snippet</p>';
  }
}

function renderColumn(items, depth, isActive) {
  const col = document.createElement("div");
  col.className =
    "w-60 flex-shrink-0 column-border overflow-y-auto custom-scrollbar py-2 transition-colors rounded-[15px]";

  if (isActive) {
    col.classList.add("border", "border-blue-200", "dark:border-primary");
  }

  col.addEventListener("dragover", (e) => {
    if (isLocked) return;
    e.preventDefault();
    col.classList.add("bg-white/10");
  });

  col.addEventListener("dragleave", (e) => {
    e.preventDefault();
    col.classList.remove("bg-white/10");
  });

  col.addEventListener("drop", (e) => {
    if (isLocked) return;
    e.preventDefault();
    col.classList.remove("bg-white/10");
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data && data.path) {
        moveItemToLevel(data.path, selectedPath.slice(0, depth));
      }
    } catch (err) {
      console.error("Drop error", err);
    }
  });

  col.addEventListener("click", (e) => {
    if (e.target === col) {
      selectedPath = selectedPath.slice(0, depth);
      renderColumns();
    }
  });

  items.forEach((item, index) => {
    const row = document.createElement("div");
    const isSelected = selectedPath[depth] === index;
    row.className = `item-row ${isSelected ? "selected" : ""} group relative rounded-[15px]`;
    row.draggable = !isLocked;
    if (item.type === "clip" && item.description) {
      row.addEventListener("mouseenter", (e) =>
        showTooltip(e, item.description),
      );
      row.addEventListener("mouseleave", hideTooltip);
      row.addEventListener("mousemove", updateTooltipPosition);
    }

    row.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          path: [...selectedPath.slice(0, depth), index],
        }),
      );
      e.dataTransfer.effectAllowed = "move";
    });

    row.addEventListener("dragover", (e) => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      if (item.type === "folder") {
        row.classList.add("bg-white/20");
      }
    });

    row.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      row.classList.remove("bg-white/20");
    });

    row.addEventListener("drop", (e) => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      row.classList.remove("bg-white/20");
      if (item.type !== "folder") return;
      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (data && data.path) {
          moveItem(data.path, [...selectedPath.slice(0, depth), index]);
        }
      } catch (err) {
        console.error("Drop error", err);
      }
    });

    row.onclick = (e) => {
      e.stopPropagation();
      selectedPath = selectedPath.slice(0, depth);
      selectedPath.push(index);
      if (item.type === "clip") {
        navigator.clipboard
          .writeText(item.description || item.content || "")
          .then(() => showToast(`Message copied`))
          .catch(console.error);
      }
      renderColumns();
    };

    // Options Button
    const optionsBtn = `<button class="options-btn p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-[15px] mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 dark:text-white/60">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
    </button>`;

    let iconHtml;
    if (item.type === "folder") {
      const color = item.color || "white";
      iconHtml = `<img src="./assets/darkThemedfolder/${color}folder.png" class="icon ${color === "white" ? "dark:invert-0 invert" : ""}">`;
    } else {
      iconHtml = `<span class="icon icon-doc text-gray-500 dark:text-white/60"></span>`;
    }

    const arrow =
      item.type === "folder"
        ? '<img src="./assets/arrow_dark.png" class="w-4 h-4 ml-2 opacity-30 dark:invert-0 invert">'
        : "";
    row.innerHTML = `${iconHtml}<span class="text-[15px] flex-1 break-words text-gray-900 dark:text-white">${item.name}</span>${optionsBtn}${arrow}`;

    row.querySelector(".options-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      showContextMenu(e, item, [...selectedPath.slice(0, depth), index]);
    });

    col.appendChild(row);
  });

  columnsContainer.insertBefore(col, previewPanel);
}

// Initial render
renderColumns();

// Debug helper: Run resetApp() in the console to clear storage
window.resetApp = () => {
  localStorage.removeItem("shiftclip_data");
  location.reload();
};
