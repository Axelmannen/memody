// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Lyrics Player Extension installed');
  
  // Create context menu item
  chrome.contextMenus.create({
    id: "openLyricsPlayer",
    title: "Search lyrics for '%s'",
    contexts: ["selection"]
  });
});

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  openLyricsPlayer();
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openLyricsPlayer") {
    const selectedText = info.selectionText || '';
    openLyricsPlayer(selectedText);
  }
});

// Function to open the lyrics player
function openLyricsPlayer(songTitle = '') {
  // Store the song title
  if (songTitle) {
    chrome.storage.local.set({ 'selectedSongTitle': songTitle }, () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
      });
    });
  } else {
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html')
    });
  }
}