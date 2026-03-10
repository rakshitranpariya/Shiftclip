function getAllClips(items) {
  let clips = [];
  if (!items) return clips;
  for (const item of items) {
    if (item.type === "clip") {
      clips.push(item);
    } else if (item.type === "folder" && item.children) {
      clips.push(...getAllClips(item.children));
    }
  }
  return clips;
}

function updateFavoritesMenu() {
  chrome.contextMenus.removeAll(() => {
    // It's good practice to check for errors, even if they are not always fatal.
    if (chrome.runtime.lastError) {
      // This can happen if the extension is reloaded and the menu was already gone.
      // console.error(`Error removing context menus: ${chrome.runtime.lastError.message}`);
    }

    chrome.contextMenus.create(
      {
        id: "swift-clip-parent",
        title: "Swift Clip Favorites",
        contexts: ["editable"],
      },
      () => {
        // This callback ensures the parent menu is created before we add children.
        if (chrome.runtime.lastError) {
          console.error(
            `Error creating parent context menu: ${chrome.runtime.lastError.message}`,
          );
          return;
        }

        chrome.storage.local.get("shiftclip_data", (result) => {
          const fileSystem = result.shiftclip_data;
          if (!fileSystem) {
            chrome.contextMenus.create({
              id: "no-favorites",
              parentId: "swift-clip-parent",
              title: "No favorites yet",
              enabled: false,
              contexts: ["editable"],
            });
            return;
          }

          const allClips = getAllClips(fileSystem);
          const favoriteClips = allClips.filter((clip) => clip.isFavorite);

          if (favoriteClips.length === 0) {
            chrome.contextMenus.create({
              id: "no-favorites",
              parentId: "swift-clip-parent",
              title: "No favorites yet",
              enabled: false,
              contexts: ["editable"],
            });
          } else {
            favoriteClips.forEach((clip) => {
              chrome.contextMenus.create({
                id: `clip-${clip.id}`,
                parentId: "swift-clip-parent",
                title: clip.name,
                contexts: ["editable"],
              });
            });
          }
        });
      },
    );
  });
}

chrome.runtime.onInstalled.addListener(() => {
  updateFavoritesMenu();
});

chrome.runtime.onStartup.addListener(() => {
  updateFavoritesMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.parentMenuItemId === "swift-clip-parent" &&
    info.menuItemId.startsWith("clip-")
  ) {
    const clipId = info.menuItemId.replace("clip-", "");
    chrome.storage.local.get("shiftclip_data", (data) => {
      if (data.shiftclip_data) {
        const allClips = getAllClips(data.shiftclip_data);
        const clickedClip = allClips.find((c) => c.id.toString() === clipId);
        if (clickedClip) {
          const snippet = clickedClip.description || clickedClip.content || "";
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (snippetToInsert) => {
              const el = document.activeElement;
              if (!el) return;

              if (el.isContentEditable) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  range.deleteContents();
                  const textNode = document.createTextNode(snippetToInsert);
                  range.insertNode(textNode);
                  range.setStartAfter(textNode);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              } else if (
                typeof el.selectionStart === "number" &&
                typeof el.selectionEnd === "number"
              ) {
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const value = el.value || "";
                el.value =
                  value.slice(0, start) + snippetToInsert + value.slice(end);
                const caret = start + snippetToInsert.length;
                el.selectionStart = el.selectionEnd = caret;
                el.focus();
              }
            },
            args: [snippet],
          });
        }
      }
    });
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.shiftclip_data) {
    updateFavoritesMenu();
  }
});
