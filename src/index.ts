const MODULE_NAME = 'persona-pin';
const METADATA_KEY = 'pinnedPersona';

interface LorebookEntry {
    content?: string;
    [key: string]: unknown;
}

interface CharacterBackup {
    characterId: number;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    lorebook?: Record<string, string>; // entry key -> original content
}

let enabled = true;
let backup: CharacterBackup | null = null;

function init() {
    const ctx = SillyTavern.getContext();

    // Load settings
    enabled = ctx.extensionSettings[MODULE_NAME]?.enabled ?? true;

    // Add simple settings panel
    const panel = document.getElementById('extensions_settings2');
    if (panel) {
        panel.insertAdjacentHTML('beforeend', `
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b><i class="fa-solid fa-thumbtack"></i> Persona Pin</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input type="checkbox" id="persona-pin-enabled" ${enabled ? 'checked' : ''}>
                        <span>Lock {{user}} to persona that opened each chat</span>
                    </label>
                    <div id="persona-pin-status" style="margin-top: 10px; opacity: 0.7;"></div>
                </div>
            </div>
        `);

        document.getElementById('persona-pin-enabled')?.addEventListener('change', (e) => {
            enabled = (e.target as HTMLInputElement).checked;
            ctx.extensionSettings[MODULE_NAME] = { enabled };
            ctx.saveSettingsDebounced();
        });
    }

    // Restore any stale backup and pin persona on chat open
    ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => {
        restore(); // Clean up before switching
        pinPersona();
    });

    // Replace {{user}} before generation
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, replaceUser);

    // Restore after generation
    ctx.eventSource.on(ctx.eventTypes.GENERATION_ENDED, restore);
    ctx.eventSource.on(ctx.eventTypes.GENERATION_STOPPED, restore);

    // Update status on settings change
    ctx.eventSource.on(ctx.eventTypes.SETTINGS_UPDATED, updateStatus);

    // Check if chat already loaded
    if (ctx.characterId !== undefined && ctx.characterId >= 0) {
        pinPersona();
    }

    console.log(`[${MODULE_NAME}] Initialized`);
}

function pinPersona() {
    if (!enabled) return;

    const ctx = SillyTavern.getContext();
    const meta = ctx.chatMetadata;

    if (!meta[METADATA_KEY] && ctx.name1) {
        meta[METADATA_KEY] = ctx.name1;
        ctx.saveMetadata();
        console.log(`[${MODULE_NAME}] Pinned: ${ctx.name1}`);
    }

    updateStatus();
}

function replaceUser() {
    if (!enabled) return;

    const ctx = SillyTavern.getContext();

    // Clear stale backup from different character (race condition: user switched chats mid-generation)
    if (backup && backup.characterId !== ctx.characterId) {
        backup = null;
    }

    if (backup) return; // Already have active backup for this character

    const pinned = ctx.chatMetadata?.[METADATA_KEY];

    if (!pinned || ctx.characterId === undefined || ctx.characterId < 0) return;

    const char = ctx.characters[ctx.characterId];
    if (!char) return;

    // Backup
    backup = {
        characterId: ctx.characterId,
        description: char.description || '',
        personality: char.personality || '',
        scenario: char.scenario || '',
        first_mes: char.first_mes || '',
        mes_example: char.mes_example || '',
    };

    // Backup lorebook entries
    const entries = char.data?.character_book?.entries as Record<string, LorebookEntry> | undefined;
    if (entries) {
        backup.lorebook = {};
        for (const [key, entry] of Object.entries(entries)) {
            if (entry?.content) backup.lorebook[key] = entry.content;
        }
    }

    // Replace {{user}} with pinned persona
    const re = /\{\{user\}\}/gi;
    char.description = char.description?.replace(re, pinned) || '';
    char.personality = char.personality?.replace(re, pinned) || '';
    char.scenario = char.scenario?.replace(re, pinned) || '';
    char.first_mes = char.first_mes?.replace(re, pinned) || '';
    char.mes_example = char.mes_example?.replace(re, pinned) || '';

    // Replace in lorebook
    if (entries) {
        for (const entry of Object.values(entries)) {
            if (entry?.content) entry.content = entry.content.replace(re, pinned);
        }
    }
}

function restore() {
    if (!backup) return;

    const ctx = SillyTavern.getContext();

    if (ctx.characterId !== backup.characterId) {
        backup = null;
        return;
    }

    const char = ctx.characters[backup.characterId];
    if (char) {
        char.description = backup.description;
        char.personality = backup.personality;
        char.scenario = backup.scenario;
        char.first_mes = backup.first_mes;
        char.mes_example = backup.mes_example;

        // Restore lorebook
        const entries = char.data?.character_book?.entries as Record<string, LorebookEntry> | undefined;
        if (backup.lorebook && entries) {
            for (const [key, content] of Object.entries(backup.lorebook)) {
                if (entries[key]) entries[key].content = content;
            }
        }
    }

    backup = null;
}

function updateStatus() {
    const el = document.getElementById('persona-pin-status');
    if (!el) return;

    const ctx = SillyTavern.getContext();
    const pinned = ctx.chatMetadata?.[METADATA_KEY];

    if (ctx.characterId === undefined || ctx.characterId < 0) {
        el.textContent = 'No chat loaded';
    } else if (!pinned) {
        el.textContent = 'No persona pinned yet';
    } else {
        el.textContent = `Pinned: ${pinned}`;
    }
}

init();
