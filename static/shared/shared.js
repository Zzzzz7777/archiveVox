// ============================================================
// 1. CONFIGURATION & STATE
// ============================================================

const state = {
    user: null,
    activeView: 'dashboard',
    chartInstances: {},
    dashboard: {
        my_students: 0,
        class_avg_wcpm: 0,
        my_assessments: 0,
        recent_assessments: [],
        class_performance: []
    },
    students: [],
    materials: [],
    assessments: [],
    teachers: [],
    importPreview: null,
    importFile: null,
    principalDashboard: null,
    reportData: null
};

const assessmentState = {
    step: 1,
    student: null,
    material: null,
    audioBlob: null,
    recording: false,
    mediaRecorder: null,
    audioChunks: [],
    results: null,
    timerInterval: null,
    seconds: 0,
    stream: null,
    playbackUrl: null
};

const uiSettings = {
    fontSize: 'default',
    micDeviceId: '',
    audioOutputId: ''
};

const UI_SETTINGS_STORAGE_KEY = 'archivevox.ui-settings';
const SIDEBAR_STORAGE_KEY = 'archivevox.sidebar-collapsed';
let settingsPopover = null;
let settingsPopoverInitialized = false;
let styleGuardObserver = null;
let sidebarToggleInitialized = false;

const sidebarState = {
    collapsed: false,
    mobileOpen: false
};

const modalRuntime = {
    confirmResolver: null
};

// ============================================================
// 2. CORE UTILITIES
// ============================================================

function safeNumber(value, decimals = 0) {
    const num = parseFloat(value);
    return Number.isNaN(num) ? 0 : Number(num.toFixed(decimals));
}

function escapeAssessmentHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function loadUiSettings() {
    try {
        const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            uiSettings.fontSize = parsed.fontSize === 'large' ? 'large' : 'default';
            uiSettings.micDeviceId = typeof parsed.micDeviceId === 'string' ? parsed.micDeviceId : '';
            uiSettings.audioOutputId = typeof parsed.audioOutputId === 'string' ? parsed.audioOutputId : '';
        }
    } catch (error) {
        console.warn('Unable to load UI settings:', error);
    }
}

function persistUiSettings() {
    try {
        window.localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings));
    } catch (error) {
        console.warn('Unable to save UI settings:', error);
    }
}

function applyFontSizeSetting() {
    document.documentElement.dataset.fontScale = uiSettings.fontSize === 'large' ? 'large' : 'default';
}

function loadSidebarPreference() {
    try {
        sidebarState.collapsed = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch (error) {
        sidebarState.collapsed = false;
    }
}

function persistSidebarPreference() {
    try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarState.collapsed));
    } catch (error) {
        console.warn('Unable to save sidebar preference:', error);
    }
}

function isDesktopSidebarMode() {
    return window.matchMedia('(min-width: 700px)').matches;
}

function applySidebarState() {
    const appShell = document.getElementById('app-shell');
    if (!appShell) return;

    const desktop = isDesktopSidebarMode();
    appShell.classList.toggle('sidebar-collapsed', desktop && sidebarState.collapsed);
    appShell.classList.toggle('sidebar-mobile-open', !desktop && sidebarState.mobileOpen);

    if (desktop) {
        appShell.classList.remove('sidebar-mobile-open');
    }

    const desktopToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('sidebar-toggle-mobile');
    const expanded = desktop ? !sidebarState.collapsed : sidebarState.mobileOpen;
    desktopToggle?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    mobileToggle?.setAttribute('aria-expanded', sidebarState.mobileOpen ? 'true' : 'false');
}

function closeMobileSidebar() {
    if (!sidebarState.mobileOpen) return;
    sidebarState.mobileOpen = false;
    applySidebarState();
}

function toggleSidebar() {
    if (isDesktopSidebarMode()) {
        sidebarState.collapsed = !sidebarState.collapsed;
        persistSidebarPreference();
    } else {
        sidebarState.mobileOpen = !sidebarState.mobileOpen;
    }
    applySidebarState();
}

function initSidebarToggle() {
    if (sidebarToggleInitialized) return;

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileSidebarToggle = document.getElementById('sidebar-toggle-mobile');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (!sidebarToggle && !mobileSidebarToggle) return;

    sidebarToggleInitialized = true;

    sidebarToggle?.addEventListener('click', (event) => {
        event.preventDefault();
        toggleSidebar();
    });

    mobileSidebarToggle?.addEventListener('click', (event) => {
        event.preventDefault();
        toggleSidebar();
    });

    sidebarOverlay?.addEventListener('click', closeMobileSidebar);

    window.addEventListener('resize', () => {
        if (isDesktopSidebarMode()) {
            sidebarState.mobileOpen = false;
        }
        applySidebarState();
    });
}

function shouldStripInlineColor(value) {
    return /#|rgb\(|hsl\(|oklch\(/i.test(String(value || ''));
}

function stripHardcodedInlineColors(root = document) {
    const scope = root instanceof Element ? root : document.body;
    if (!scope) return;

    const targets = [];
    if (scope.hasAttribute && scope.hasAttribute('style')) {
        targets.push(scope);
    }
    targets.push(...scope.querySelectorAll('[style]'));

    const colorProps = [
        'color',
        'background',
        'background-color',
        'border',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-color',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color'
    ];

    targets.forEach((el) => {
        let changed = false;
        colorProps.forEach((prop) => {
            const value = el.style.getPropertyValue(prop);
            if (value && shouldStripInlineColor(value)) {
                el.style.removeProperty(prop);
                changed = true;
            }
        });

        if (changed && !el.getAttribute('style')?.trim()) {
            el.removeAttribute('style');
        }
    });
}

function initStyleGuard() {
    if (styleGuardObserver || !document.body) return;

    stripHardcodedInlineColors(document.body);

    styleGuardObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.target instanceof Element) {
                stripHardcodedInlineColors(mutation.target);
            }

            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof Element) {
                        stripHardcodedInlineColors(node);
                    }
                });
            }
        });
    });

    styleGuardObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });
}

// ============================================================
// 3. SETTINGS POPOVER
// ============================================================

function ensureSettingsPopover() {
    if (settingsPopover) return settingsPopover;

    settingsPopover = document.createElement('div');
    settingsPopover.id = 'settings-popover';
    settingsPopover.className = 'settings-popover hidden';
    settingsPopover.innerHTML = `
        <div class="setting-row">
            <label for="settings-font-size">Font Size</label>
            <select id="settings-font-size">
                <option value="default">Default</option>
                <option value="large">Large</option>
            </select>
        </div>
        <div class="setting-row">
            <label for="settings-mic-input">Mic Input</label>
            <select id="settings-mic-input">
                <option value="">System default</option>
            </select>
        </div>
        <div class="setting-row">
            <label for="settings-audio-output">Audio Output</label>
            <select id="settings-audio-output">
                <option value="">System default</option>
            </select>
        </div>
        <button type="button" id="settings-signout" class="btn-secondary">Sign Out</button>
    `;

    document.body.appendChild(settingsPopover);
    return settingsPopover;
}

function setSettingsPopoverPosition() {
    if (!settingsPopover || settingsPopover.classList.contains('hidden') || !settingsBtn) return;
    const rect = settingsBtn.getBoundingClientRect();
    settingsPopover.style.left = `${Math.max(8, rect.left - 176)}px`;
    settingsPopover.style.top = `${rect.bottom + 8}px`;
}

async function refreshAudioDeviceOptions() {
    const popover = ensureSettingsPopover();
    const micSelect = popover.querySelector('#settings-mic-input');
    const outputSelect = popover.querySelector('#settings-audio-output');
    if (!micSelect || !outputSelect) return;

    micSelect.innerHTML = '<option value="">System default</option>';
    outputSelect.innerHTML = '<option value="">System default</option>';

    if (!navigator.mediaDevices?.enumerateDevices) return;

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        let hasMic = false;
        let hasOutput = false;

        devices.forEach((device, index) => {
            const label = device.label || `${device.kind} ${index + 1}`;
            if (device.kind === 'audioinput') {
                hasMic = true;
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = label;
                micSelect.appendChild(option);
            }
            if (device.kind === 'audiooutput') {
                hasOutput = true;
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = label;
                outputSelect.appendChild(option);
            }
        });

        if (!hasMic) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No mic devices found';
            micSelect.appendChild(option);
        }

        if (!hasOutput) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No output devices found';
            outputSelect.appendChild(option);
        }
    } catch (error) {
        console.warn('Unable to enumerate audio devices:', error);
    }

    micSelect.value = uiSettings.micDeviceId || '';
    outputSelect.value = uiSettings.audioOutputId || '';
}

function closeSettingsPopover() {
    if (settingsPopover) {
        settingsPopover.classList.add('hidden');
    }
}

async function toggleSettingsPopover() {
    const popover = ensureSettingsPopover();
    const isHidden = popover.classList.contains('hidden');
    if (!isHidden) {
        closeSettingsPopover();
        return;
    }

    popover.classList.remove('hidden');
    setSettingsPopoverPosition();
    await refreshAudioDeviceOptions();
}

function applyAudioOutputPreference(audioElement) {
    const sinkId = uiSettings.audioOutputId || '';
    if (!audioElement || !sinkId || typeof audioElement.setSinkId !== 'function') return;

    audioElement.setSinkId(sinkId).catch((error) => {
        console.warn('Unable to apply selected audio output:', error);
    });
}

function initSettingsControls() {
    if (settingsPopoverInitialized) return;
    settingsPopoverInitialized = true;

    const popover = ensureSettingsPopover();
    const fontSelect = popover.querySelector('#settings-font-size');
    const micSelect = popover.querySelector('#settings-mic-input');
    const outputSelect = popover.querySelector('#settings-audio-output');
    const signOutBtn = popover.querySelector('#settings-signout');

    if (fontSelect) {
        fontSelect.value = uiSettings.fontSize;
        fontSelect.addEventListener('change', () => {
            uiSettings.fontSize = fontSelect.value === 'large' ? 'large' : 'default';
            applyFontSizeSetting();
            persistUiSettings();
        });
    }

    if (micSelect) {
        micSelect.addEventListener('change', () => {
            uiSettings.micDeviceId = micSelect.value || '';
            persistUiSettings();
            showToast('Microphone preference updated.', 'info');
        });
    }

    if (outputSelect) {
        outputSelect.addEventListener('change', () => {
            uiSettings.audioOutputId = outputSelect.value || '';
            persistUiSettings();
            showToast('Audio output preference updated.', 'info');
        });
    }

    signOutBtn?.addEventListener('click', async () => {
        await handleLogout();
    });

    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn?.addEventListener('click', async (event) => {
        event.stopPropagation();
        await toggleSettingsPopover();
    });

    document.addEventListener('click', (event) => {
        if (!settingsPopover || settingsPopover.classList.contains('hidden')) return;
        const target = event.target;
        if (target instanceof Node && (settingsPopover.contains(target) || settingsBtn?.contains(target))) return;
        closeSettingsPopover();
    });

    window.addEventListener('resize', setSettingsPopoverPosition);
}

// ============================================================
// 4. HTTP & API HELPERS
// ============================================================

function fetchJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    let body = options.body;

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json; charset=utf-8');
    }

    if (
        body &&
        typeof body === 'object' &&
        !(body instanceof FormData) &&
        !(body instanceof URLSearchParams) &&
        !(body instanceof Blob) &&
        !(body instanceof ArrayBuffer)
    ) {
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json; charset=utf-8');
        }
        body = JSON.stringify(body);
    } else if (body && !headers.has('Content-Type') && typeof body === 'string') {
        headers.set('Content-Type', 'application/json; charset=utf-8');
    }

    return fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers,
        body
    }).then(async (response) => {
        let raw = '';
        try {
            const buffer = await response.arrayBuffer();
            raw = new TextDecoder('utf-8').decode(buffer);
        } catch (error) {
            raw = '';
        }

        let data = {};
        if (raw.trim() !== '') {
            try {
                data = JSON.parse(raw);
            } catch (error) {
                data = { message: raw };
            }
        }

        if (!response.ok) {
            throw new Error(data.message || `Request failed (${response.status})`);
        }

        return data;
    });
}

// ============================================================
// 5. TOAST NOTIFICATIONS
// ============================================================

function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'toast-root';
        root.className = 'toast-stack';
        document.body.appendChild(root);
    }
    return root;
}

function inferToastTone(message) {
    const text = String(message || '').toLowerCase();
    if (text.includes('success')) return 'success';
    if (text.includes('failed') || text.includes('error')) return 'error';
    return 'info';
}

function showToast(message, tone = 'info', timeout = 3200) {
    if (!document.body) {
        nativeAlert(message);
        return;
    }

    const root = ensureToastRoot();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tone}`;
    toast.textContent = String(message || '');
    root.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    const dismiss = () => {
        toast.classList.remove('toast-visible');
        window.setTimeout(() => {
            toast.remove();
            if (!root.childElementCount) {
                root.remove();
            }
        }, 180);
    };

    const timerId = window.setTimeout(dismiss, timeout);
    toast.addEventListener('click', () => {
        window.clearTimeout(timerId);
        dismiss();
    });
}

const nativeAlert = window.alert.bind(window);

window.alert = (message) => {
    showToast(message, inferToastTone(message));
};

// ============================================================
// 6. MODAL FUNCTIONALITY
// ============================================================

function ensureFieldHint(field) {
    if (!(field instanceof HTMLElement) || !field.parentElement) return null;

    let hint = field.parentElement.querySelector('.field-hint[data-for-field]');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'field-hint';
        hint.dataset.forField = 'true';
        field.insertAdjacentElement('afterend', hint);
    }
    return hint;
}

function setFieldError(field, message) {
    if (!(field instanceof HTMLElement)) return;
    field.classList.add('field-invalid');
    field.setAttribute('aria-invalid', 'true');
    const hint = ensureFieldHint(field);
    if (hint) {
        hint.textContent = message;
        hint.classList.add('field-hint-error');
    }
}

function clearFieldError(field) {
    if (!(field instanceof HTMLElement)) return;
    field.classList.remove('field-invalid');
    field.removeAttribute('aria-invalid');
    const hint = ensureFieldHint(field);
    if (hint) {
        hint.textContent = '';
        hint.classList.remove('field-hint-error');
    }
}

function clearFormErrors(form) {
    form?.querySelectorAll('.field-invalid').forEach((field) => clearFieldError(field));
}

function setupModalFocusTrap(modal) {
    if (!(modal instanceof HTMLElement)) return;

    const selector = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const handler = (event) => {
        if (event.key !== 'Tab') return;

        const focusable = Array.from(modal.querySelectorAll(selector)).filter((node) => {
            return node instanceof HTMLElement && !node.hasAttribute('hidden');
        });

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    };

    modal._focusTrapHandler = handler;
    modal.addEventListener('keydown', handler);

    const initialFocus = modal.querySelector(selector);
    if (initialFocus instanceof HTMLElement) {
        window.setTimeout(() => initialFocus.focus(), 0);
    }
}

function teardownModalFocusTrap(modal) {
    if (!(modal instanceof HTMLElement)) return;
    if (modal._focusTrapHandler) {
        modal.removeEventListener('keydown', modal._focusTrapHandler);
        delete modal._focusTrapHandler;
    }
}

function ensureConfirmModal() {
    let modal = document.getElementById('confirm-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal hidden';
    modal.style.zIndex = '13000';
    modal.innerHTML = `
        <div class="modal-content modal-content-compact">
            <div class="modal-header">
                <h3 id="confirm-modal-title">Please Confirm</h3>
                <button type="button" class="close-modal" id="confirm-modal-close"><span class="icon-error" aria-hidden="true"><svg>...</svg></span></button>
            </div>
            <p id="confirm-modal-message" class="confirm-message"></p>
            <div class="modal-actions">
                <button type="button" id="confirm-modal-cancel" class="btn-secondary">Cancel</button>
                <button type="button" id="confirm-modal-confirm" class="btn-danger">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const cancel = () => resolveConfirm(false);
    modal.querySelector('#confirm-modal-close')?.addEventListener('click', cancel);
    modal.querySelector('#confirm-modal-cancel')?.addEventListener('click', cancel);
    modal.querySelector('#confirm-modal-confirm')?.addEventListener('click', () => resolveConfirm(true));
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            resolveConfirm(false);
        }
    });

    return modal;
}

function resolveConfirm(value) {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    const resolver = modalRuntime.confirmResolver;
    modalRuntime.confirmResolver = null;
    if (resolver) {
        resolver(value);
    }
}

function showConfirm(message, options = {}) {
    const modal = ensureConfirmModal();
    const title = options.title || 'Please Confirm';
    const confirmLabel = options.confirmLabel || 'Confirm';
    const cancelLabel = options.cancelLabel || 'Cancel';
    const confirmTone = options.confirmTone || 'danger';

    const titleEl = modal.querySelector('#confirm-modal-title');
    const messageEl = modal.querySelector('#confirm-modal-message');
    const confirmBtn = modal.querySelector('#confirm-modal-confirm');
    const cancelBtn = modal.querySelector('#confirm-modal-cancel');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) {
        confirmBtn.textContent = confirmLabel;
        confirmBtn.className = confirmTone === 'primary' ? 'btn-primary' : 'btn-danger';
    }
    if (cancelBtn) cancelBtn.textContent = cancelLabel;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    return new Promise((resolve) => {
        modalRuntime.confirmResolver = resolve;
    });
}

function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.add('hidden');
        m.style.display = 'none';
        m.style.opacity = '0';
    });

    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn('Modal not found:', modalId);
        return;
    }

    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '24px';
    modal.style.background = 'rgba(0, 0, 0, 0.6)';
    modal.style.zIndex = '9999';

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.dataset.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement.id || '' : '';
    modal.onclick = async (event) => {
        if (event.target === modal) {
            await requestCloseModal(modalId);
        }
    };

    document.body.style.overflow = 'hidden';

    const content = modal.querySelector('.modal-content');
    if (content instanceof HTMLElement) {
        content.style.maxWidth = '700px';
        content.style.width = '95%';
        content.style.maxHeight = '90vh';
        content.style.overflowY = 'auto';
        content.scrollTop = 0;
    }

    setupModalFocusTrap(modal);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        teardownModalFocusTrap(modal);
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    document.body.style.overflow = '';

    const previousFocusId = modal?.dataset.previousFocus;
    if (previousFocusId) {
        const previousFocus = document.getElementById(previousFocusId);
        if (previousFocus instanceof HTMLElement) {
            previousFocus.focus();
        }
    }
}

function isModalVisible(modalId) {
    const modal = document.getElementById(modalId);
    return !!modal && !modal.classList.contains('hidden');
}

async function requestCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;

    if (modal.dataset.dirty === 'true') {
        const shouldDiscard = await showConfirm(
            modal.dataset.dirtyMessage || 'Discard unsaved changes?',
            {
                title: 'Unsaved Changes',
                confirmLabel: 'Discard Changes',
                confirmTone: 'danger'
            }
        );
        if (!shouldDiscard) {
            return false;
        }
    }

    closeModal(modalId);
    return true;
}

function getTopVisibleModal() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal && !confirmModal.classList.contains('hidden')) {
        return confirmModal;
    }

    const visible = Array.from(document.querySelectorAll('.modal')).filter((modal) => !modal.classList.contains('hidden'));
    return visible[visible.length - 1] || null;
}

// ============================================================
// 7. NAVIGATION
// ============================================================

function renderNavigation() {
    const navContainer = document.getElementById('nav-container');
    if (!navContainer) return;
    const role = String(state.user?.role || '').toLowerCase();

    const iconByKey = {
        dashboard: {
            inactive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 4 8 6.7v8.3h-5.2v-5.6H9.2V19H4v-8.3L12 4Zm0-2-10 8.3V21h9.2v-5.6h1.6V21H22V10.3L12 2Z"/></svg>',
            active: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10.5 12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>'
        },
        teachers: {
            inactive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.5 13.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM7.5 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm9 3c3.2 0 6 1.9 6 4.5V22h-2v-3.5c0-1.2-1.7-2.5-4-2.5s-4 1.3-4 2.5V22h-2v-3.5c0-2.6 2.8-4.5 6-4.5ZM7.5 14c1 0 2 .2 2.8.6-.8.8-1.3 1.8-1.3 2.9V22h-2v-4.5c0-1.3-1.8-2.5-4-2.5V13c1.8 0 3.3.4 4.5 1Z"/></svg>',
            active: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.5 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 2.5c-2.7 0-5 1.6-5 3.5V21h10v-2.5c0-1.9-2.3-3.5-5-3.5ZM7.5 14c-2.5 0-4.5 1.4-4.5 3.2V21h6v-2.3c0-1 .4-1.9 1.1-2.7A5.9 5.9 0 0 0 7.5 14Z"/></svg>'
        },
        students: {
            inactive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 3c4.5 0 8 2.6 8 6v2H4v-2c0-3.4 3.5-6 8-6Zm0 2c-3.4 0-6 1.8-6 4h12c0-2.2-2.6-4-6-4Z"/></svg>',
            active: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.9 0-7 2.2-7 5v2h14v-2c0-2.8-3.1-5-7-5Z"/></svg>'
        },
        materials: {
            inactive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 3H21v18H7.5A3.5 3.5 0 0 0 4 24V6.5A3.5 3.5 0 0 1 7.5 3Zm0 2A1.5 1.5 0 0 0 6 6.5v13.1c.5-.4 1.1-.6 1.8-.6H19V5H7.5Zm1.5 3h7v2H9V8Zm0 4h7v2H9v-2Z" transform="translate(0 -1)"/></svg>',
            active: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21V4.5ZM4 6h1v13.5A1.5 1.5 0 0 1 3.5 21H3V7a1 1 0 0 1 1-1Zm5 1h8v2H9Zm0 4h8v2H9Z"/></svg>'
        },
        assessment: {
            inactive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 2h9l4 4v16H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm0 2c-.6 0-1 .4-1 1v14c0 .6.4 1 1 1h11V7h-4V3.9L6 4Zm9 .9V6h1.1L15 4.9ZM8 10h8v2H8v-2Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z"/></svg>',
            active: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm8 1.5V7h2.5L14 4.5ZM8 10h8v1.8H8Zm0 3.6h8v1.8H8Zm0 3.6h5v1.8H8Z"/></svg>'
        },
        reports: {
            inactive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 2h14a3 3 0 0 1 3 3v17h-6v-2h4V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v15h4v2H2V5a3 3 0 0 1 3-3Zm4 16h2V10H9v8Zm4 0h2V8h-2v10Zm4 0h2v-6h-2v6Z"/></svg>',
            active: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3h14a2 2 0 0 1 2 2v14h-4v-2h2V5H5v14h2v2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 14h2V9H9v8Zm4 0h2V7h-2v10Zm4 0h2v-5h-2v5Z"/></svg>'
        }
    };

    const navByRole = {
        teacher: [
            { key: 'dashboard', label: 'Home', page: '/teacher/dashboard.html' },
            { key: 'students', label: 'Students', page: '/teacher/students.html' },
            { key: 'materials', label: 'Library', page: '/teacher/library.html' },
            { key: 'assessment', label: 'Assessment', page: '/teacher/assessments.html' },
            { key: 'reports', label: 'Reports', page: '/teacher/reports.html' }
        ],
        principal: [
            { key: 'dashboard', label: 'Home', page: '/principal-dashboard.html' },
            { key: 'teachers', label: 'Teachers', page: '/principal/teachers.html' },
            { key: 'students', label: 'Students', page: '/principal/students.html' },
            { key: 'materials', label: 'Library', page: '/principal/library.html' },
            { key: 'reports', label: 'Reports', page: '/principal/reports.html' }
        ],
        admin: [
            { key: 'dashboard', label: 'Home', page: '/principal-dashboard.html' },
            { key: 'teachers', label: 'Teachers', page: '/principal/teachers.html' },
            { key: 'students', label: 'Students', page: '/principal/students.html' },
            { key: 'materials', label: 'Library', page: '/principal/library.html' },
            { key: 'reports', label: 'Reports', page: '/principal/reports.html' }
        ],
        student: [
            { key: 'dashboard', label: 'Home', page: '/student-dashboard.html' },
            { key: 'materials', label: 'Library', page: '/teacher/library.html' }
        ],
        parent: [
            { key: 'dashboard', label: 'Home', page: '/parent-dashboard.html' },
            { key: 'reports', label: 'Reports', page: '/principal/reports.html' }
        ]
    };

    const tabs = navByRole[role] || navByRole.teacher;
    const currentPage = window.location.pathname.split('/').pop() || '';

    navContainer.innerHTML = `
        ${tabs.map(tab => `
            <button class="nav-btn ${currentPage === tab.page ? 'active' : ''}" data-page="${tab.page}" aria-label="${tab.label}" data-tooltip="${tab.label}">
                <span class="nav-icon nav-icon-inactive">${iconByKey[tab.key]?.inactive || ''}</span>
                <span class="nav-icon nav-icon-active">${iconByKey[tab.key]?.active || ''}</span>
                <span class="nav-label">${tab.label}</span>
            </button>
        `).join('')}
    `;

    navContainer.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            window.location.href = btn.dataset.page;
        });
    });
}

function renderTopbar() {
    const topbarContent = document.getElementById('topbar-content');
    if (!topbarContent) return;

    const role = String(state.user?.role || '').toLowerCase();
    const isPrincipalDashboard = (role === 'principal' || role === 'admin') && 
        (window.location.pathname.includes('principal-dashboard.html') || window.location.pathname.includes('admin-dashboard.html'));
    const now = new Date();
    const dateText = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (isPrincipalDashboard) {
        topbarContent.className = 'topbar-content topbar-content-dashboard';
        topbarContent.innerHTML = `
            <div class="dashboard-header-left">
                <h1>Dashboard</h1>
                <span class="dashboard-header-date">${dateText}</span>
            </div>
            <div class="dashboard-header-right">
                <button class="notification-btn" type="button" aria-label="Notifications">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        <circle cx="18" cy="8" r="3" fill="red" stroke="none"/>
                    </svg>
                </button>
            </div>
        `;
        return;
    }

    topbarContent.className = 'topbar-content topbar-content-default';
    topbarContent.innerHTML = `
        <div class="topbar-center">
            <span id="current-date">${dateText}</span>
        </div>
    `;
}

// ============================================================
// 8. SESSION MANAGEMENT
// ============================================================

async function checkSession() {
    try {
        // Try to get user from localStorage first (set during login)
        const storedUser = localStorage.getItem('archivevox.user');
        if (storedUser) {
            state.user = JSON.parse(storedUser);
            return state.user;
        }
        
        // Fallback to API
        const data = await fetchJson('/api/session');
        state.user = data.user || null;
        return state.user;
    } catch (error) {
        console.error('Session check failed:', error);
        return null;
    }
}

async function handleLogout() {
    try {
        await fetchJson('/api/logout', { method: 'GET' });
        state.user = null;
        localStorage.removeItem('archivevox.user');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('archivevox.user');
        window.location.href = '/';
    }
}

// ============================================================
// 9. GLOBAL EVENT HANDLERS
// ============================================================

document.addEventListener('keydown', async (event) => {
    if (event.key === 'Escape' && !isDesktopSidebarMode() && sidebarState.mobileOpen) {
        closeMobileSidebar();
        return;
    }

    if (event.key === 'Escape' && settingsPopover && !settingsPopover.classList.contains('hidden')) {
        closeSettingsPopover();
        return;
    }

    if (event.key !== 'Escape') return;

    const modal = getTopVisibleModal();
    if (!modal?.id) return;

    if (modal.id === 'confirm-modal') {
        resolveConfirm(false);
        return;
    }

    await requestCloseModal(modal.id);
});

// ============================================================
// 10. INITIALIZATION
// ============================================================

async function initializeShared() {
    loadUiSettings();
    loadSidebarPreference();
    applyFontSizeSetting();
    initSidebarToggle();
    applySidebarState();
    initStyleGuard();
    initSettingsControls();

    const user = await checkSession();
    if (!user) {
        window.location.href = '/';
        return false;
    }

    state.user = user;

    // Update user info in shell
    const userBadge = document.getElementById('user-badge');
    const roleBadge = document.getElementById('role-badge');
    if (userBadge) userBadge.textContent = user.username || 'User';
    if (roleBadge) roleBadge.textContent = user.role || 'Guest';

    // Apply role theme
    const isAdmin = user.role === 'principal' || user.role === 'admin';
    document.body.classList.toggle('principal-mode', isAdmin);
    document.body.className = 'role-' + (user.role || '').toLowerCase();

    renderNavigation();
    renderTopbar();

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', handleLogout);

    // Call page-specific initialization if available
    if (window.initPage) {
        await window.initPage();
    }

    return true;
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShared);
} else {
    initializeShared();
}