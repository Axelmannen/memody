// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Memody Extension installed');
  
  // Create context menu item
  chrome.contextMenus.create({
    id: "openMemody",
    title: "Use Memody to memorize this",
    contexts: ["selection"]
  });
});

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openMemody") {
    const selectedText = info.selectionText || '';
    if (selectedText) {
      chrome.storage.local.set({ 'selectedSongTitle': selectedText }, () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL('index.html')
        });
      });
    }
  }
});