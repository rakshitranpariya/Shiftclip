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

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   // ← ADD THIS CHECK (lines 4-5)
//   if (!tab || !tab.url || !tab.url.startsWith("http")) {
//     console.log("Cannot paste on chrome:// URLs");
//     return;
//   }

//   if (
//     info.parentMenuItemId === "swift-clip-parent" &&
//     info.menuItemId.startsWith("clip-")
//   ) {
//     const clipId = info.menuItemId.replace("clip-", "");
//     chrome.storage.local.get("shiftclip_data", (data) => {
//       if (data.shiftclip_data) {
//         const allClips = getAllClips(data.shiftclip_data);
//         const clickedClip = allClips.find((c) => c.id.toString() === clipId);
//         if (clickedClip) {
//           const snippet = clickedClip.description || clickedClip.content || "";
//           chrome.scripting.executeScript({
//             target: { tabId: tab.id },
//             func: (snippetToInsert) => {
//               const el = document.activeElement;
//               if (!el) return;

//               if (el.isContentEditable) {
//                 const selection = window.getSelection();
//                 if (selection.rangeCount > 0) {
//                   const range = selection.getRangeAt(0);
//                   range.deleteContents();
//                   const textNode = document.createTextNode(snippetToInsert);
//                   range.insertNode(textNode);
//                   range.setStartAfter(textNode);
//                   range.collapse(true);
//                   selection.removeAllRanges();
//                   selection.addRange(range);
//                 }
//               } else if (
//                 typeof el.selectionStart === "number" &&
//                 typeof el.selectionEnd === "number"
//               ) {
//                 const start = el.selectionStart;
//                 const end = el.selectionEnd;
//                 const value = el.value || "";
//                 el.value =
//                   value.slice(0, start) + snippetToInsert + value.slice(end);
//                 const caret = start + snippetToInsert.length;
//                 el.selectionStart = el.selectionEnd = caret;
//                 el.focus();
//               }
//             },
//             args: [snippet],
//           });
//         }
//       }
//     });
//   }
// });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log(
    "🔥 CLICK DETECTED:",
    info.menuItemId,
    info.parentMenuItemId,
    tab?.url,
  );

  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    console.log("🚫 Blocked: not HTTP tab");
    return;
  }

  if (
    info.parentMenuItemId === "swift-clip-parent" &&
    info.menuItemId.startsWith("clip-")
  ) {
    console.log("✅ Processing clip...");
    const clipId = info.menuItemId.replace("clip-", "");

    chrome.storage.local.get("shiftclip_data", (data) => {
      if (data.shiftclip_data) {
        const allClips = getAllClips(data.shiftclip_data);
        const clickedClip = allClips.find((c) => c.id.toString() === clipId);

        if (clickedClip) {
          const snippet = clickedClip.description || clickedClip.content || "";
          console.log("✂️ Pasting:", snippet.substring(0, 50));

          // CAPTURE tab.id BEFORE executeScript
          const tabId = tab.id;

          chrome.scripting.executeScript(
            {
              target: { tabId: tabId }, // Use captured tabId
              func: async (snippetToInsert) => {
                try {
                  // METHOD 1: Modern Clipboard API (works on 90% sites)
                  await navigator.clipboard.writeText(snippetToInsert);
                  document.execCommand("paste");
                  return "CLIPBOARD_SUCCESS";
                } catch (e) {
                  // METHOD 2: Force find input and paste
                  const el =
                    document.activeElement ||
                    document.querySelector(
                      'input[type="text"], textarea, [contenteditable]',
                    );

                  if (!el) return "NO_INPUT_FOUND";

                  el.focus();

                  if (el.contentEditable === "true" || el.isContentEditable) {
                    // ContentEditable (React/Modern sites)
                    el.textContent = snippetToInsert;
                  } else {
                    // Normal inputs
                    el.value = snippetToInsert;
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                  }

                  return `PASTED_TO_${el.tagName}`;
                }
              },
              args: [snippet],
            },
            (results) => {
              console.log("🎉 Results:", results[0]?.result);
            },
          );
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
