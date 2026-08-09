// Clipboard-Go Frontend Controller

let historyItems = [];
let selectedIndex = 0;
let activeFilter = 'all'; // 'all', 'pinned', 'text', 'image'
let searchQuery = '';
let isIncognito = false;

// DOM Elements
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const itemList = document.getElementById('item-list');
const emptyState = document.getElementById('empty-state');
const btnIncognito = document.getElementById('btn-incognito');
const incognitoBanner = document.getElementById('incognito-banner');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');
const filterPills = document.querySelectorAll('.filter-pill');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    setupWailsEventListeners();
    await checkIncognitoState();
    await loadHistory();
    focusSearch();
}

function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.length > 0) {
            btnClearSearch.classList.remove('hidden');
        } else {
            btnClearSearch.classList.add('hidden');
        }
        loadHistory();
    });

    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.classList.add('hidden');
        loadHistory();
        focusSearch();
    });

    // Category Filter Pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.dataset.filter;
            loadHistory();
        });
    });

    // Header Action Buttons
    btnIncognito.addEventListener('click', toggleIncognito);
    btnClear.addEventListener('click', clearHistory);
    btnClose.addEventListener('click', () => {
        if (window.go && window.go.main && window.go.main.App) {
            window.go.main.App.HideWindow();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
}

function setupWailsEventListeners() {
    if (window.runtime) {
        window.runtime.EventsOn("clipboard:changed", (newItem) => {
            showToast("New item copied");
            loadHistory();
        });

        window.runtime.EventsOn("ui:focus_search", () => {
            focusSearch();
            loadHistory();
        });
    }
}

function focusSearch() {
    setTimeout(() => {
        searchInput.focus();
        searchInput.select();
    }, 50);
}

async function checkIncognitoState() {
    try {
        if (window.go && window.go.main && window.go.main.App) {
            isIncognito = await window.go.main.App.IsIncognito();
            updateIncognitoUI();
        }
    } catch (e) {
        console.error("Error checking incognito state:", e);
    }
}

async function toggleIncognito() {
    try {
        if (window.go && window.go.main && window.go.main.App) {
            isIncognito = await window.go.main.App.ToggleIncognito();
            updateIncognitoUI();
            showToast(isIncognito ? "Incognito Mode Enabled" : "Incognito Mode Disabled");
        }
    } catch (e) {
        console.error("Error toggling incognito:", e);
    }
}

function updateIncognitoUI() {
    const offIcon = btnIncognito.querySelector('.incognito-off-icon');
    const onIcon = btnIncognito.querySelector('.incognito-on-icon');

    if (isIncognito) {
        offIcon.classList.add('hidden');
        onIcon.classList.remove('hidden');
        btnIncognito.classList.add('active');
        incognitoBanner.classList.remove('hidden');
    } else {
        offIcon.classList.remove('hidden');
        onIcon.classList.add('hidden');
        btnIncognito.classList.remove('active');
        incognitoBanner.classList.add('hidden');
    }
}

async function loadHistory() {
    try {
        let pinnedOnly = (activeFilter === 'pinned');
        let tagFilter = '';
        
        if (window.go && window.go.main && window.go.main.App) {
            historyItems = await window.go.main.App.GetHistory(searchQuery, tagFilter, pinnedOnly, 100, 0) || [];
        } else {
            // Demo fallback data if running outside Wails
            historyItems = [
                { id: 1, type: "text", content: "git commit -m 'Implement technical spec'", created_at: "2026-08-09 06:10:00", pinned: true, tags: ["git"] },
                { id: 2, type: "text", content: "https://wails.io/docs/gettingstarted/installation", created_at: "2026-08-09 06:05:00", pinned: false, tags: ["url"] },
                { id: 3, type: "text", content: "export PATH=$PATH:/home/surya/go/bin", created_at: "2026-08-09 05:45:00", pinned: false, tags: ["bash"] }
            ];
        }

        // Apply type filters if needed
        if (activeFilter === 'text') {
            historyItems = historyItems.filter(i => i.type === 'text');
        } else if (activeFilter === 'image') {
            historyItems = historyItems.filter(i => i.type === 'image');
        }

        selectedIndex = 0;
        renderItems();
    } catch (e) {
        console.error("Error loading history:", e);
    }
}

function renderItems() {
    itemList.innerHTML = '';

    if (historyItems.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    historyItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = `item-card ${index === selectedIndex ? 'selected' : ''}`;
        card.dataset.id = item.id;
        card.dataset.index = index;

        const isCode = isCodeSnippet(item.content);
        const timeAgo = formatTimeAgo(item.created_at);

        card.innerHTML = `
            <div class="item-header">
                <div class="item-meta">
                    <span class="badge ${item.type === 'image' ? 'badge-image' : 'badge-text'}">${item.type}</span>
                    <span class="item-time">${timeAgo}</span>
                </div>
                <div class="item-actions">
                    <button class="action-btn star-btn ${item.pinned ? 'pinned' : ''}" title="${item.pinned ? 'Unpin' : 'Pin'}" data-action="pin">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${item.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                    <button class="action-btn" title="Delete" data-action="delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            
            ${item.type === 'image' 
                ? `<img src="${item.content}" class="item-image-preview" alt="Clipboard Image">`
                : `<div class="item-content ${isCode ? 'code-snippet' : ''}">${escapeHtml(item.content)}</div>`
            }

            ${item.tags && item.tags.length > 0 ? `
                <div class="item-tags">
                    ${item.tags.map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('')}
                </div>
            ` : ''}
        `;

        card.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                if (action === 'pin') {
                    togglePinItem(item.id);
                } else if (action === 'delete') {
                    deleteItem(item.id);
                }
                e.stopPropagation();
                return;
            }

            selectAndPaste(item.id);
        });

        itemList.appendChild(card);
    });

    scrollToSelected();
}

function handleGlobalKeydown(e) {
    if (historyItems.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (selectedIndex < historyItems.length - 1) {
                selectedIndex++;
                updateSelectionUI();
            }
            break;

        case 'ArrowUp':
            e.preventDefault();
            if (selectedIndex > 0) {
                selectedIndex--;
                updateSelectionUI();
            }
            break;

        case 'Enter':
            e.preventDefault();
            if (historyItems[selectedIndex]) {
                selectAndPaste(historyItems[selectedIndex].id);
            }
            break;

        case 'Escape':
            e.preventDefault();
            if (searchQuery.length > 0) {
                searchInput.value = '';
                searchQuery = '';
                btnClearSearch.classList.add('hidden');
                loadHistory();
            } else if (window.go && window.go.main && window.go.main.App) {
                window.go.main.App.HideWindow();
            }
            break;

        case 'Delete':
            if (document.activeElement !== searchInput && historyItems[selectedIndex]) {
                e.preventDefault();
                deleteItem(historyItems[selectedIndex].id);
            }
            break;

        case 'p':
        case 'P':
            if (document.activeElement !== searchInput && historyItems[selectedIndex]) {
                e.preventDefault();
                togglePinItem(historyItems[selectedIndex].id);
            }
            break;
    }
}

function updateSelectionUI() {
    const cards = itemList.querySelectorAll('.item-card');
    cards.forEach((card, idx) => {
        if (idx === selectedIndex) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    scrollToSelected();
}

function scrollToSelected() {
    const selectedCard = itemList.querySelector('.item-card.selected');
    if (selectedCard) {
        selectedCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

async function selectAndPaste(id) {
    try {
        if (window.go && window.go.main && window.go.main.App) {
            await window.go.main.App.TriggerPaste(id);
            showToast("Pasted to active window");
        } else {
            showToast("Pasted (Demo mode)");
        }
    } catch (e) {
        console.error("Paste error:", e);
        showToast("Error executing paste");
    }
}

async function togglePinItem(id) {
    try {
        if (window.go && window.go.main && window.go.main.App) {
            const pinned = await window.go.main.App.TogglePin(id);
            showToast(pinned ? "Item pinned" : "Item unpinned");
            await loadHistory();
        }
    } catch (e) {
        console.error("Toggle pin error:", e);
    }
}

async function deleteItem(id) {
    try {
        if (window.go && window.go.main && window.go.main.App) {
            await window.go.main.App.DeleteItem(id);
            showToast("Item deleted");
            await loadHistory();
        }
    } catch (e) {
        console.error("Delete item error:", e);
    }
}

async function clearHistory() {
    if (!confirm("Clear all unpinned clipboard history?")) return;
    try {
        if (window.go && window.go.main && window.go.main.App) {
            await window.go.main.App.ClearHistory();
            showToast("History cleared");
            await loadHistory();
        }
    } catch (e) {
        console.error("Clear history error:", e);
    }
}

function isCodeSnippet(str) {
    if (!str) return false;
    const codePatterns = [/function\s+/i, /const\s+/i, /let\s+/i, /var\s+/i, /import\s+/i, /export\s+/i, /def\s+/i, /class\s+/i, /package\s+/i, /func\s+/i, /SELECT\s+/i, /INSERT\s+/i, /[{};=<>]/];
    return codePatterns.some(p => p.test(str)) || str.includes('\n');
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2000);
}
