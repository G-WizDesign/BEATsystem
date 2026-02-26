class GmScreen {
    constructor() {
        this.colorPalettes = {
            dark: ['#FF6B6B', '#4D96FF', '#FFD93D', '#6BCB77', '#C77DFF', '#FF8FAB', '#00D1B2', '#F97316', '#22C55E', '#06B6D4', '#A3E635', '#F43F5E', '#10B981', '#8B5CF6', '#14B8A6', '#F59E0B', '#84CC16', '#EC4899', '#38BDF8', '#EAB308'],
            light: ['#C81D25', '#0052CC', '#B15E00', '#0B7A43', '#6B21A8', '#BE185D', '#007A78', '#9A3412', '#0F766E', '#1D4ED8', '#3F6212', '#9F1239', '#166534', '#4338CA', '#0E7490', '#B45309', '#4D7C0F', '#A21CAF', '#0369A1', '#A16207'],
            'high-contrast': ['#FFB000', '#648FFF', '#DC267F', '#785EF0', '#FE6100', '#00E5FF', '#7CFC00', '#FFFFFF', '#FFD166', '#7FDBFF', '#FF4D6D', '#B8F200', '#FF9F1C', '#9D4EDD', '#00F5D4', '#F15BB5', '#00BBF9', '#FEE440', '#F94144', '#43AA8B']
        };
        this.nextColorIndex = 0;
        this.recycledColorIndices = [];

        this.characters = [];
        this.activeCharacterId = null;
        this.currentRound = 1;
        this.roundFocuses = new Map([[1, new Set()]]);
        this.roundStarts = new Map([[1, 0]]);
        this.beats = [];
        this.interjections = [];
        this.modalContext = null;
        this.pendingFocusCharacterId = null;
        this.pendingFocusAction = null;
        this.pendingCharacterActionId = null;
        this.pendingMinionGroupId = null;
        this.pendingMinionAnchorElement = null;
        const queryParams = new URLSearchParams(window.location.search);
        this.embeddedMode = queryParams.get('embedded') === '1';
        this.panelKey = queryParams.get('panelKey') || 'main';
        this.panelName = queryParams.get('panelName') || '';
        this.initiativeTracks = [];
        this.activeTrackId = null;
        this.trackStorageKey = `beatInitiativeTracks:${this.panelKey}`;
        this.panelStackStorageKey = 'beatInitiativePanels';
        this.minionStorageKey = 'beatMinionGroups';
        this.minionSizeConfig = {
            handful: { label: 'Handful', die: 'd4', max: 4, columns: 2 },
            'small-group': { label: 'Small Group', die: 'd6', max: 6, columns: 3 },
            mob: { label: 'Mob', die: 'd8', max: 8, columns: 4 },
            unit: { label: 'Unit', die: 'd10', max: 10, columns: 5 },
            'large-unit': { label: 'Large Unit', die: 'd12', max: 12, columns: 4 },
            horde: { label: 'Horde', die: 'd20', max: 20, columns: 5 }
        };
        this.minionDieThresholds = [
            { max: 20, die: 'd20' },
            { max: 12, die: 'd12' },
            { max: 10, die: 'd10' },
            { max: 8, die: 'd8' },
            { max: 6, die: 'd6' },
            { max: 4, die: 'd4' }
        ];
        this.minionGroups = [];

        this.layout = {
            labelX: 16,
            trackStartX: 210,
            rowHeight: 54,
            topPadding: 26,
            columnWidth: 56,
            circleRadius: 11
        };

        this.bindEvents();
        this.initializeTheme();
        if (this.embeddedMode) {
            this.initializeTrackSystem();
            this.applyEmbeddedLayout();
        } else {
            this.applyManagerLayout();
            this.initializeEmbeddedPanelStack();
            this.initializeMinionGroups();
        }
    }

    bindEvents() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const characterForm = document.getElementById('character-form');
        const activeSelect = document.getElementById('active-character');
        const interjectionSelect = document.getElementById('interjection-character');
        const activeFocusChip = document.getElementById('active-focus-chip');
        const interjectionChip = document.getElementById('interjection-chip');
        const startNewRoundButton = document.getElementById('start-new-round');
        const removeLastRoundButton = document.getElementById('remove-last-round');
        const addBeatButton = document.getElementById('add-beat');
        const addInterjectionButton = document.getElementById('add-interjection');
        const addInitiativeTrackButton = document.getElementById('add-initiative-track');
        const clearInitiativeTrackButton = document.getElementById('clear-initiative-track');
        const deleteInitiativeTrackButton = document.getElementById('delete-initiative-track');
        const minionGroupForm = document.getElementById('minion-group-form');
        const closeInterjectionModalButton = document.getElementById('close-interjection-modal');
        const interjectionModal = document.getElementById('interjection-modal');
        const focusChangeModal = document.getElementById('focus-change-modal');
        const confirmFocusChangeButton = document.getElementById('confirm-focus-change');
        const cancelFocusChangeButton = document.getElementById('cancel-focus-change');
        const characterActionModal = document.getElementById('character-action-modal');
        const confirmRemoveCharacterButton = document.getElementById('confirm-remove-character');
        const confirmDefeatCharacterButton = document.getElementById('confirm-defeat-character');
        const cancelCharacterActionButton = document.getElementById('cancel-character-action');
        const minionInitiativeModal = document.getElementById('minion-initiative-modal');
        const closeMinionInitiativeModalButton = document.getElementById('close-minion-initiative-modal');

        if (characterForm) {
            characterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCharacter();
            });
        }

        if (activeSelect) {
            activeSelect.addEventListener('change', () => this.handleActiveCharacterChange());
        }

        if (interjectionSelect) {
            interjectionSelect.addEventListener('change', () => this.updateSelectIndicators());
        }

        if (activeFocusChip) {
            activeFocusChip.addEventListener('click', () => this.cycleActiveFocus());
        }

        if (interjectionChip) {
            interjectionChip.addEventListener('click', () => this.cycleInterjectionSource());
        }

        if (startNewRoundButton) {
            startNewRoundButton.addEventListener('click', () => this.startNewRound());
        }

        if (removeLastRoundButton) {
            removeLastRoundButton.addEventListener('click', () => this.removeLastRound());
        }

        if (addBeatButton) {
            addBeatButton.addEventListener('click', () => this.addBeat());
        }

        if (addInterjectionButton) {
            addInterjectionButton.addEventListener('click', () => this.openInterjectionModal());
        }

        if (addInitiativeTrackButton) {
            addInitiativeTrackButton.addEventListener('click', () => this.addInitiativeTrack());
        }

        if (clearInitiativeTrackButton) {
            clearInitiativeTrackButton.addEventListener('click', () => this.clearCurrentInitiativeTrack());
        }

        if (deleteInitiativeTrackButton) {
            deleteInitiativeTrackButton.addEventListener('click', () => this.deleteCurrentInitiativeTrack());
        }

        if (minionGroupForm) {
            minionGroupForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleAddMinionGroup();
            });
        }

        if (closeInterjectionModalButton) {
            closeInterjectionModalButton.addEventListener('click', () => this.closeInterjectionModal());
        }

        if (interjectionModal) {
            interjectionModal.addEventListener('click', (event) => {
                if (event.target === interjectionModal) {
                    this.closeInterjectionModal();
                }
            });
        }

        if (confirmFocusChangeButton) {
            confirmFocusChangeButton.addEventListener('click', () => this.confirmFocusChange());
        }

        if (cancelFocusChangeButton) {
            cancelFocusChangeButton.addEventListener('click', () => this.closeFocusChangeModal());
        }

        if (focusChangeModal) {
            focusChangeModal.addEventListener('click', (event) => {
                if (event.target === focusChangeModal) {
                    this.closeFocusChangeModal();
                }
            });
        }

        if (confirmRemoveCharacterButton) {
            confirmRemoveCharacterButton.addEventListener('click', () => this.removeCharacter(this.pendingCharacterActionId));
        }

        if (confirmDefeatCharacterButton) {
            confirmDefeatCharacterButton.addEventListener('click', () => this.markCharacterDefeated(this.pendingCharacterActionId));
        }

        if (cancelCharacterActionButton) {
            cancelCharacterActionButton.addEventListener('click', () => this.closeCharacterActionModal());
        }

        if (characterActionModal) {
            characterActionModal.addEventListener('click', (event) => {
                if (event.target === characterActionModal) {
                    this.closeCharacterActionModal();
                }
            });
        }

        if (closeMinionInitiativeModalButton) {
            closeMinionInitiativeModalButton.addEventListener('click', () => this.closeMinionInitiativeModal());
        }

        if (minionInitiativeModal) {
            minionInitiativeModal.addEventListener('click', (event) => {
                const panel = minionInitiativeModal.querySelector('.modal-panel');
                if (panel && !panel.contains(event.target)) {
                    this.closeMinionInitiativeModal();
                }
            });
        }

        window.addEventListener('message', (event) => {
            const payload = event.data;
            if (!payload || payload.type !== 'beat-theme-sync' || typeof payload.theme !== 'string') {
                return;
            }

            this.setTheme(payload.theme, false);
        });

        document.addEventListener('keydown', (e) => {
            if (this.isTypingTarget(e.target)) {
                return;
            }

            if (e.code === 'KeyT' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    isTypingTarget(target) {
        if (!target) {
            return false;
        }

        const tagName = target.tagName ? target.tagName.toLowerCase() : '';
        return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    }

    applyEmbeddedLayout() {
        document.body.classList.add('embedded-mode');
        const heading = document.querySelector('.gm-panel h2');
        if (heading && this.panelName) {
            heading.textContent = `${this.panelName} - BEAT Tracker`;
        }
    }

    applyManagerLayout() {
        document.body.classList.add('manager-mode');
        const heading = document.querySelector('.gm-panel h2');
        if (heading) {
            heading.textContent = 'Conflict Manager - BEAT Trackers';
        }
    }

    initializeEmbeddedPanelStack() {
        this.renderEmbeddedPanelStack();
    }

    loadEmbeddedPanelList() {
        try {
            const raw = localStorage.getItem(this.panelStackStorageKey);
            if (!raw) {
                return [];
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.filter(panel => panel && panel.id);
        } catch (error) {
            return [];
        }
    }

    saveEmbeddedPanelList(panelList) {
        try {
            localStorage.setItem(this.panelStackStorageKey, JSON.stringify(panelList));
        } catch (error) {
            this.setStatus('Could not save initiative panel list.');
        }
    }

    addEmbeddedInitiativePanel() {
        const existingPanels = this.loadEmbeddedPanelList();
        const enteredName = window.prompt('Name this new initiative panel:');
        if (enteredName === null) {
            return;
        }

        const panelName = enteredName.trim();
        if (!panelName) {
            this.setStatus('Panel name is required.');
            return;
        }

        const panel = {
            id: `panel-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name: panelName
        };

        existingPanels.push(panel);
        this.saveEmbeddedPanelList(existingPanels);
        this.renderEmbeddedPanelStack();
        this.setStatus(`Added ${panel.name}.`);
    }

    renameEmbeddedInitiativePanel(panelId) {
        const existingPanels = this.loadEmbeddedPanelList();
        const panel = existingPanels.find(item => item.id === panelId);
        if (!panel) {
            return;
        }

        const enteredName = window.prompt('Rename initiative panel:', panel.name || 'Initiative Panel');
        if (enteredName === null) {
            return;
        }

        const nextName = enteredName.trim();
        if (!nextName) {
            this.setStatus('Panel name cannot be empty.');
            return;
        }

        panel.name = nextName;
        this.saveEmbeddedPanelList(existingPanels);
        this.renderEmbeddedPanelStack();
        this.setStatus(`Renamed panel to ${nextName}.`);
    }

    removeEmbeddedInitiativePanel(panelId) {
        const existingPanels = this.loadEmbeddedPanelList();
        const panel = existingPanels.find(item => item.id === panelId);
        if (!panel) {
            return;
        }

        const confirmed = window.confirm(`Delete "${panel.name}" panel? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        const filteredPanels = existingPanels.filter(item => item.id !== panelId);
        this.saveEmbeddedPanelList(filteredPanels);
        localStorage.removeItem(`beatInitiativeTracks:${panelId}`);
        this.renderEmbeddedPanelStack();
        this.setStatus(`Deleted ${panel.name}.`);
    }

    renderEmbeddedPanelStack() {
        const panelContainer = document.getElementById('initiative-track-panels');
        if (!panelContainer || this.embeddedMode) {
            return;
        }

        panelContainer.innerHTML = '';
        const panels = this.loadEmbeddedPanelList();

        if (!panels.length) {
            const emptyState = document.createElement('div');
            emptyState.className = 'initiative-embedded-empty';
            emptyState.textContent = 'No initiative panels yet. Use "New Initiative Track" to add and name one.';
            panelContainer.appendChild(emptyState);
            return;
        }

        panels.forEach((panel) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'initiative-embedded-panel';

            const header = document.createElement('div');
            header.className = 'initiative-embedded-header';

            const title = document.createElement('span');
            title.className = 'initiative-embedded-title';
            title.textContent = panel.name;

            const actions = document.createElement('div');
            actions.className = 'initiative-embedded-actions';

            const renameButton = document.createElement('button');
            renameButton.type = 'button';
            renameButton.className = 'gm-action-button';
            renameButton.textContent = 'Rename';
            renameButton.addEventListener('click', () => this.renameEmbeddedInitiativePanel(panel.id));

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'gm-action-button';
            deleteButton.textContent = 'Delete Panel';
            deleteButton.addEventListener('click', () => this.removeEmbeddedInitiativePanel(panel.id));

            actions.appendChild(renameButton);
            actions.appendChild(deleteButton);
            header.appendChild(title);
            header.appendChild(actions);

            const iframe = document.createElement('iframe');
            iframe.className = 'initiative-embedded-iframe';
            iframe.src = `gm-screen.html?embedded=1&panelKey=${encodeURIComponent(panel.id)}&panelName=${encodeURIComponent(panel.name)}`;
            iframe.title = panel.name;
            iframe.loading = 'lazy';
            iframe.addEventListener('load', () => {
                try {
                    iframe.contentWindow?.postMessage({
                        type: 'beat-theme-sync',
                        theme: this.getCurrentTheme()
                    }, '*');
                } catch (error) {
                    // Best effort sync only.
                }
            });

            wrapper.appendChild(header);
            wrapper.appendChild(iframe);
            panelContainer.appendChild(wrapper);
        });
    }

    initializeTrackSystem() {
        const loadedTracks = this.loadTracksFromStorage();
        if (loadedTracks.length) {
            this.initiativeTracks = loadedTracks;
            const savedActiveTrackId = this.loadActiveTrackSelection();
            const preferredTrack = loadedTracks.find(track => track.id === savedActiveTrackId) || loadedTracks[0];
            this.activeTrackId = preferredTrack.id;
            this.applyTrackState(preferredTrack);
            this.refreshTrackSelector();
            this.saveActiveTrackSelection();
            this.setStatus(`Loaded ${loadedTracks.length} saved initiative track${loadedTracks.length === 1 ? '' : 's'}.`);
            return;
        }

        const initialTrack = this.createEmptyTrack('Initiative Track 1');
        this.initiativeTracks = [initialTrack];
        this.activeTrackId = initialTrack.id;
        this.applyTrackState(initialTrack);
        this.refreshTrackSelector();
        this.saveTracksToStorage();
        this.saveActiveTrackSelection();
    }

    getActiveTrackStorageKey(panelId = null) {
        const resolvedPanelId = panelId || this.panelKey;
        return `beatInitiativeActiveTrack:${resolvedPanelId}`;
    }

    saveActiveTrackSelection() {
        if (!this.activeTrackId) {
            return;
        }

        try {
            localStorage.setItem(this.getActiveTrackStorageKey(), this.activeTrackId);
        } catch (error) {
            // Ignore storage write failures for active selection.
        }
    }

    loadActiveTrackSelection(panelId = null) {
        try {
            return localStorage.getItem(this.getActiveTrackStorageKey(panelId)) || null;
        } catch (error) {
            return null;
        }
    }

    createEmptyTrack(name) {
        return {
            id: `track-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name,
            createdAt: Date.now(),
            nextColorIndex: 0,
            recycledColorIndices: [],
            characters: [],
            activeCharacterId: null,
            currentRound: 1,
            roundFocuses: [[1, []]],
            roundStarts: [[1, 0]],
            beats: [],
            interjections: []
        };
    }

    getTrackSnapshot(trackId, existingTrackName = null) {
        const existingTrack = this.initiativeTracks.find(track => track.id === trackId) || null;
        const fallbackIndex = this.initiativeTracks.length + 1;
        return {
            id: trackId,
            name: existingTrackName || existingTrack?.name || `Initiative Track ${fallbackIndex}`,
            createdAt: existingTrack?.createdAt || Date.now(),
            updatedAt: Date.now(),
            nextColorIndex: this.nextColorIndex,
            recycledColorIndices: [...this.recycledColorIndices],
            characters: this.characters.map(character => ({ ...character })),
            activeCharacterId: this.activeCharacterId,
            currentRound: this.currentRound,
            roundFocuses: [...this.roundFocuses.entries()].map(([round, focusedSet]) => [round, [...focusedSet]]),
            roundStarts: [...this.roundStarts.entries()],
            beats: this.beats.map(beat => ({ ...beat })),
            interjections: this.interjections.map(interjection => ({ ...interjection }))
        };
    }

    applyTrackState(track) {
        if (!track) {
            return;
        }

        this.nextColorIndex = Number.isFinite(track.nextColorIndex) ? track.nextColorIndex : 0;
        this.recycledColorIndices = Array.isArray(track.recycledColorIndices)
            ? track.recycledColorIndices.filter(index => Number.isFinite(index))
            : [];
        this.characters = Array.isArray(track.characters) ? track.characters.map(character => ({ ...character })) : [];
        this.activeCharacterId = track.activeCharacterId || null;
        this.currentRound = Number.isFinite(track.currentRound) && track.currentRound > 0 ? track.currentRound : 1;
        this.roundFocuses = new Map(
            (track.roundFocuses || [[1, []]]).map(([round, focusedList]) => [Number(round), new Set(focusedList || [])])
        );
        this.roundStarts = new Map((track.roundStarts || [[1, 0]]).map(([round, step]) => [Number(round), Number(step)]));
        if (!this.roundStarts.size) {
            this.roundStarts.set(1, 0);
        }

        if (!this.roundFocuses.size) {
            this.roundFocuses.set(this.currentRound, new Set());
        }

        this.beats = Array.isArray(track.beats) ? track.beats.map(beat => ({ ...beat })) : [];
        this.interjections = Array.isArray(track.interjections) ? track.interjections.map(interjection => ({ ...interjection })) : [];

        this.syncCharacterSelectors();
        this.updateSelectIndicators();
        this.updateCharacterColorPreview();
        this.renderTracker();
    }

    getNextPaletteIndexFromState() {
        if (Array.isArray(this.recycledColorIndices) && this.recycledColorIndices.length) {
            const recycled = this.recycledColorIndices.shift();
            if (Number.isFinite(recycled)) {
                return recycled;
            }
        }

        const next = Number.isFinite(this.nextColorIndex) ? this.nextColorIndex : 0;
        this.nextColorIndex = next + 1;
        return next;
    }

    recyclePaletteIndexToState(paletteIndex) {
        if (!Number.isFinite(paletteIndex)) {
            return;
        }

        if (!Array.isArray(this.recycledColorIndices)) {
            this.recycledColorIndices = [];
        }

        this.recycledColorIndices = this.recycledColorIndices.filter(index => index !== paletteIndex);
        this.recycledColorIndices.unshift(paletteIndex);
    }

    refreshTrackSelector() {
        if (!this.embeddedMode) {
            return;
        }

        const trackPanels = document.getElementById('initiative-track-panels');
        if (!trackPanels) {
            return;
        }

        trackPanels.innerHTML = '';
        this.initiativeTracks.forEach((track) => {
            const panel = document.createElement('button');
            panel.type = 'button';
            panel.className = `initiative-track-panel${track.id === this.activeTrackId ? ' active' : ''}`;
            panel.textContent = track.name;
            panel.addEventListener('click', () => {
                if (track.id === this.activeTrackId) {
                    return;
                }

                this.switchInitiativeTrack(track.id);
            });
            trackPanels.appendChild(panel);
        });
    }

    persistActiveTrackState() {
        if (!this.activeTrackId) {
            return;
        }

        const existingTrack = this.initiativeTracks.find(track => track.id === this.activeTrackId) || null;
        const updatedTrack = this.getTrackSnapshot(this.activeTrackId, existingTrack?.name || null);

        this.initiativeTracks = this.initiativeTracks.map(track => (
            track.id === this.activeTrackId ? updatedTrack : track
        ));

        this.saveTracksToStorage();
    }

    addInitiativeTrack() {
        if (!this.embeddedMode) {
            this.addEmbeddedInitiativePanel();
            return;
        }

        this.persistActiveTrackState();

        const nextTrackNumber = this.initiativeTracks.length + 1;
        const newTrack = this.createEmptyTrack(`Initiative Track ${nextTrackNumber}`);
        this.initiativeTracks.push(newTrack);
        this.activeTrackId = newTrack.id;

        this.applyTrackState(newTrack);
        this.refreshTrackSelector();
        this.saveTracksToStorage();
        this.saveActiveTrackSelection();
        this.setStatus(`Created ${newTrack.name}.`);
    }

    switchInitiativeTrack(trackId) {
        const nextTrack = this.initiativeTracks.find(track => track.id === trackId);
        if (!nextTrack) {
            this.setStatus('Selected initiative track could not be found.');
            return;
        }

        this.persistActiveTrackState();
        this.activeTrackId = trackId;
        this.applyTrackState(nextTrack);
        this.refreshTrackSelector();
        this.saveActiveTrackSelection();
        this.setStatus(`Switched to ${nextTrack.name}.`);
    }

    clearCurrentInitiativeTrack() {
        if (!this.activeTrackId) {
            return;
        }

        const existingTrack = this.initiativeTracks.find(track => track.id === this.activeTrackId);
        const clearedTrack = this.createEmptyTrack(existingTrack?.name || 'Initiative Track');
        clearedTrack.id = this.activeTrackId;
        clearedTrack.createdAt = existingTrack?.createdAt || Date.now();

        this.initiativeTracks = this.initiativeTracks.map(track => (
            track.id === this.activeTrackId ? clearedTrack : track
        ));

        this.applyTrackState(clearedTrack);
        this.refreshTrackSelector();
        this.saveTracksToStorage();
        this.saveActiveTrackSelection();
        this.setStatus(`${clearedTrack.name} has been cleared.`);
    }

    deleteCurrentInitiativeTrack() {
        if (!this.activeTrackId) {
            return;
        }

        const currentTrack = this.initiativeTracks.find(track => track.id === this.activeTrackId);
        if (!currentTrack) {
            this.setStatus('Current initiative track could not be found.');
            return;
        }

        const confirmed = window.confirm(`Delete "${currentTrack.name}"? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        if (this.initiativeTracks.length <= 1) {
            this.clearCurrentInitiativeTrack();
            this.setStatus('Last track cannot be deleted, so it was cleared instead.');
            return;
        }

        const removedIndex = this.initiativeTracks.findIndex(track => track.id === this.activeTrackId);
        const remainingTracks = this.initiativeTracks.filter(track => track.id !== this.activeTrackId);
        const nextIndex = Math.max(0, Math.min(removedIndex, remainingTracks.length - 1));
        const nextTrack = remainingTracks[nextIndex];

        this.initiativeTracks = remainingTracks;
        this.activeTrackId = nextTrack.id;
        this.applyTrackState(nextTrack);
        this.refreshTrackSelector();
        this.saveTracksToStorage();
        this.saveActiveTrackSelection();
        this.setStatus(`Deleted ${currentTrack.name}. Switched to ${nextTrack.name}.`);
    }

    saveTracksToStorage() {
        try {
            localStorage.setItem(this.trackStorageKey, JSON.stringify(this.initiativeTracks));
        } catch (error) {
            this.setStatus('Could not save initiative tracks to local storage.');
        }
    }

    loadTracksFromStorage() {
        try {
            const raw = localStorage.getItem(this.trackStorageKey);
            if (!raw) {
                return [];
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.filter(track => track && track.id);
        } catch (error) {
            return [];
        }
    }

    initializeMinionGroups() {
        this.minionGroups = this.loadMinionGroupsFromStorage();
        this.renderMinionGroups();
    }

    loadMinionGroupsFromStorage() {
        try {
            const raw = localStorage.getItem(this.minionStorageKey);
            if (!raw) {
                return [];
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.filter(group => group && group.id && group.sizeKey);
        } catch (error) {
            return [];
        }
    }

    saveMinionGroupsToStorage() {
        try {
            localStorage.setItem(this.minionStorageKey, JSON.stringify(this.minionGroups));
        } catch (error) {
            this.setStatus('Could not save minion groups.');
        }
    }

    handleAddMinionGroup() {
        const nameInput = document.getElementById('minion-group-name');
        const sizeSelect = document.getElementById('minion-group-size');
        if (!nameInput || !sizeSelect) {
            return;
        }

        const name = nameInput.value.trim();
        const sizeKey = sizeSelect.value;
        const config = this.minionSizeConfig[sizeKey];

        if (!name) {
            this.setStatus('Enter a minion group name first.');
            return;
        }

        if (!config) {
            this.setStatus('Choose a valid minion group size.');
            return;
        }

        const group = {
            id: `minion-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name,
            sizeKey,
            traits: '',
            healthDamage: 0,
            cohesionDamage: 0
        };

        this.minionGroups.push(group);
        nameInput.value = '';
        this.renderMinionGroups();
        this.saveMinionGroupsToStorage();
        this.setStatus(`Added minion group ${group.name}.`);
    }

    removeMinionGroup(groupId) {
        const group = this.minionGroups.find(item => item.id === groupId);
        if (!group) {
            return;
        }

        this.minionGroups = this.minionGroups.filter(item => item.id !== groupId);
        this.renderMinionGroups();
        this.saveMinionGroupsToStorage();
        this.setStatus(`Removed minion group ${group.name}.`);
    }

    getUniqueCharacterName(existingCharacters, baseName) {
        const normalizedBase = baseName.trim();
        if (!normalizedBase) {
            return 'Minion Group';
        }

        const lowerNames = new Set((existingCharacters || []).map(character => character.name.toLowerCase()));
        if (!lowerNames.has(normalizedBase.toLowerCase())) {
            return normalizedBase;
        }

        let suffix = 2;
        while (lowerNames.has(`${normalizedBase} ${suffix}`.toLowerCase())) {
            suffix += 1;
        }

        return `${normalizedBase} ${suffix}`;
    }

    panelAlreadyHasMinionGroup(panelId, group) {
        if (!panelId || !group) {
            return false;
        }

        const storageKey = `beatInitiativeTracks:${panelId}`;
        let tracks = [];
        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            tracks = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            tracks = [];
        }

        const normalizedGroupName = group.name.trim().toLowerCase();
        return tracks.some((track) => {
            const characters = Array.isArray(track?.characters) ? track.characters : [];
            return characters.some((character) => {
                if (!character || typeof character !== 'object') {
                    return false;
                }

                if (character.sourceMinionGroupId) {
                    return character.sourceMinionGroupId === group.id;
                }

                if (typeof character.sourceMinionGroupName === 'string'
                    && character.sourceMinionGroupName.trim().toLowerCase() === normalizedGroupName) {
                    return true;
                }

                return typeof character.name === 'string'
                    && character.name.trim().toLowerCase() === normalizedGroupName;
            });
        });
    }

    positionMinionInitiativeModal(anchorElement) {
        const modal = document.getElementById('minion-initiative-modal');
        if (!modal) {
            return;
        }

        const panel = modal.querySelector('.modal-panel');
        if (!panel) {
            return;
        }

        const fallbackTop = Math.max(12, (window.innerHeight - panel.offsetHeight) / 2);
        if (!anchorElement) {
            panel.style.left = `${Math.max(12, (window.innerWidth - panel.offsetWidth) / 2)}px`;
            panel.style.top = `${fallbackTop}px`;
            panel.style.visibility = 'visible';
            return;
        }

        const anchorCard = anchorElement.closest('.minion-group-card') || anchorElement;
        const anchorRect = anchorCard.getBoundingClientRect();

        panel.style.left = '12px';
        panel.style.top = `${fallbackTop}px`;
        panel.style.visibility = 'hidden';

        requestAnimationFrame(() => {
            const panelRect = panel.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const margin = 12;

            let left = anchorRect.left + ((anchorRect.width - panelRect.width) / 2);
            left = Math.max(margin, Math.min(left, viewportWidth - panelRect.width - margin));

            let top = anchorRect.top + 10;
            if (top + panelRect.height > viewportHeight - margin) {
                top = anchorRect.bottom - panelRect.height - 10;
            }
            if (top < margin) {
                top = Math.max(margin, Math.min(fallbackTop, viewportHeight - panelRect.height - margin));
            }

            panel.style.left = `${left}px`;
            panel.style.top = `${top}px`;
            panel.style.visibility = 'visible';
        });
    }

    openMinionInitiativeModal(groupId, anchorElement = null) {
        const group = this.minionGroups.find(item => item.id === groupId);
        if (!group) {
            return;
        }

        const panels = this.loadEmbeddedPanelList();
        if (!panels.length) {
            this.setStatus('Create an initiative panel first.');
            return;
        }

        const modal = document.getElementById('minion-initiative-modal');
        const subtitle = document.getElementById('minion-initiative-subtitle');
        const options = document.getElementById('minion-initiative-options');
        if (!modal || !subtitle || !options) {
            return;
        }

        this.pendingMinionGroupId = groupId;
        this.pendingMinionAnchorElement = anchorElement;
        options.innerHTML = '';

        let disabledCount = 0;

        panels.forEach(panel => {
            const alreadyAdded = this.panelAlreadyHasMinionGroup(panel.id, group);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'interjection-option-button';
            button.textContent = alreadyAdded ? `${panel.name} (Already added)` : panel.name;
            button.disabled = alreadyAdded;
            if (alreadyAdded) {
                disabledCount += 1;
            } else {
                button.addEventListener('click', () => this.addMinionGroupToInitiativePanel(groupId, panel.id, panel.name));
            }
            options.appendChild(button);
        });

        subtitle.textContent = disabledCount === panels.length
            ? `${group.name} is already in every panel.`
            : `Choose a panel for ${group.name}. Disabled options already contain this minion group.`;

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        this.positionMinionInitiativeModal(anchorElement);
    }

    closeMinionInitiativeModal() {
        const modal = document.getElementById('minion-initiative-modal');
        if (!modal) {
            return;
        }

        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        this.pendingMinionGroupId = null;
        this.pendingMinionAnchorElement = null;

        const panel = modal.querySelector('.modal-panel');
        if (panel) {
            panel.style.left = '';
            panel.style.top = '';
            panel.style.visibility = '';
        }
    }

    addMinionGroupToInitiativePanel(groupId, panelId, panelName) {
        const group = this.minionGroups.find(item => item.id === groupId);
        if (!group || !panelId) {
            return;
        }

        const storageKey = `beatInitiativeTracks:${panelId}`;
        let tracks = [];
        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            tracks = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            tracks = [];
        }

        if (!tracks.length) {
            tracks = [this.createEmptyTrack('Initiative Track 1')];
        }

        const activeTrackId = this.loadActiveTrackSelection(panelId);
        const targetTrackIndex = Math.max(0, tracks.findIndex(track => track.id === activeTrackId));
        const alreadyAdded = this.panelAlreadyHasMinionGroup(panelId, group);

        if (alreadyAdded) {
            this.setStatus(`${group.name} is already in ${panelName || 'that panel'}.`);
            this.closeMinionInitiativeModal();
            return;
        }

        const targetTrack = { ...tracks[targetTrackIndex] };
        const existingCharacters = Array.isArray(targetTrack.characters)
            ? targetTrack.characters.map(character => ({ ...character }))
            : [];

        const currentTheme = localStorage.getItem('diceRollerTheme') || 'dark';
        const palette = this.getPaletteForTheme(currentTheme);
        const recycledColorIndices = Array.isArray(targetTrack.recycledColorIndices)
            ? targetTrack.recycledColorIndices.filter(index => Number.isFinite(index))
            : [];
        let nextColorIndex = Number.isFinite(targetTrack.nextColorIndex) ? targetTrack.nextColorIndex : 0;
        let paletteIndex = nextColorIndex;

        if (recycledColorIndices.length) {
            const recycled = recycledColorIndices.shift();
            if (Number.isFinite(recycled)) {
                paletteIndex = recycled;
            }
        } else {
            nextColorIndex += 1;
        }

        const color = palette[paletteIndex % palette.length];

        const character = {
            id: `char-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name: this.getUniqueCharacterName(existingCharacters, group.name),
            isMinionGroup: true,
            sourceMinionGroupId: group.id,
            sourceMinionGroupName: group.name,
            paletteIndex,
            color,
            defeated: false,
            defeatedAtStep: null,
            defeatedAtRound: null
        };

        existingCharacters.push(character);
        targetTrack.characters = existingCharacters;
        targetTrack.recycledColorIndices = recycledColorIndices;
        targetTrack.nextColorIndex = nextColorIndex;
        targetTrack.activeCharacterId = targetTrack.activeCharacterId || character.id;

        tracks[targetTrackIndex] = targetTrack;

        try {
            localStorage.setItem(storageKey, JSON.stringify(tracks));
            this.refreshEmbeddedPanelFrame(panelId);
            this.setStatus(`Added ${group.name} to ${panelName || 'selected panel'}.`);
        } catch (error) {
            this.setStatus('Could not add minion group to initiative panel.');
        }

        this.closeMinionInitiativeModal();
    }

    refreshEmbeddedPanelFrame(panelId) {
        if (this.embeddedMode || !panelId) {
            return;
        }

        const iframes = document.querySelectorAll('.initiative-embedded-iframe');
        if (!iframes.length) {
            return;
        }

        iframes.forEach((iframe) => {
            try {
                const source = iframe.getAttribute('src') || '';
                if (!source) {
                    return;
                }

                const url = new URL(source, window.location.href);
                if (url.searchParams.get('panelKey') !== panelId) {
                    return;
                }

                url.searchParams.set('_refresh', String(Date.now()));
                iframe.setAttribute('src', url.toString());
            } catch (error) {
                // Best effort refresh only.
            }
        });
    }

    updateMinionTraits(groupId, traits) {
        const group = this.minionGroups.find(item => item.id === groupId);
        if (!group) {
            return;
        }

        group.traits = traits;
        this.saveMinionGroupsToStorage();
    }

    setMinionHealthDamage(groupId, damage) {
        const group = this.minionGroups.find(item => item.id === groupId);
        if (!group) {
            return;
        }

        const config = this.minionSizeConfig[group.sizeKey];
        if (!config) {
            return;
        }

        const nextDamage = Math.max(0, Math.min(config.max, damage));
        group.healthDamage = group.healthDamage === nextDamage
            ? Math.max(0, nextDamage - 1)
            : nextDamage;
        this.renderMinionGroups();
        this.saveMinionGroupsToStorage();
    }

    setMinionCohesionDamage(groupId, damage) {
        const group = this.minionGroups.find(item => item.id === groupId);
        if (!group) {
            return;
        }

        const config = this.minionSizeConfig[group.sizeKey];
        if (!config) {
            return;
        }

        const cohesionMax = Math.floor(config.max / 2);
        const nextDamage = Math.max(0, Math.min(cohesionMax, damage));
        group.cohesionDamage = group.cohesionDamage === nextDamage
            ? Math.max(0, nextDamage - 1)
            : nextDamage;
        this.renderMinionGroups();
        this.saveMinionGroupsToStorage();
    }

    getMinionThresholdLabels(maxValue) {
        const labels = new Map();
        this.minionDieThresholds
            .filter(threshold => threshold.max <= maxValue)
            .forEach(threshold => {
                labels.set(threshold.max, threshold.die);
            });
        return labels;
    }

    getCurrentMinionFoundationDie(maxValue, healthDamage) {
        const remainingHealth = Math.max(0, maxValue - healthDamage);
        const availableThresholds = this.minionDieThresholds
            .filter(threshold => threshold.max <= maxValue)
            .sort((a, b) => a.max - b.max);
        if (!remainingHealth) {
            return 'defeated';
        }

        const matched = availableThresholds.find(threshold => remainingHealth < threshold.max);
        if (matched) {
            return matched.die;
        }

        const highest = availableThresholds[availableThresholds.length - 1];
        return highest ? highest.die : 'd4';
    }

    renderMinionGroups() {
        const list = document.getElementById('minion-groups-list');
        const empty = document.getElementById('minion-groups-empty');
        if (!list || !empty || this.embeddedMode) {
            return;
        }

        list.innerHTML = '';

        if (!this.minionGroups.length) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        this.minionGroups.forEach((group) => {
            const config = this.minionSizeConfig[group.sizeKey];
            if (!config) {
                return;
            }
            const currentFoundationDie = this.getCurrentMinionFoundationDie(config.max, group.healthDamage);

            const card = document.createElement('article');
            card.className = 'minion-group-card';

            const header = document.createElement('div');
            header.className = 'minion-group-card-header';

            const titleWrap = document.createElement('div');
            const title = document.createElement('h3');
            title.className = 'minion-group-title';
            title.textContent = group.name;

            const subtitle = document.createElement('div');
            subtitle.className = 'minion-group-subtitle';
            subtitle.textContent = `${config.label} • ${config.die}`;

            const foundationWrap = document.createElement('div');
            foundationWrap.className = 'minion-foundation';

            const foundationLabel = document.createElement('span');
            foundationLabel.className = 'minion-foundation-title';
            foundationLabel.textContent = 'Current Foundation';

            const foundationVisual = document.createElement('div');
            foundationVisual.className = `minion-foundation-visual${currentFoundationDie === 'defeated' ? ' defeated' : ''}`;

            if (currentFoundationDie !== 'defeated') {
                const shape = document.createElement('div');
                shape.className = `minion-foundation-shape ${currentFoundationDie}-shape`;
                foundationVisual.appendChild(shape);
            }

            const foundationDieLabel = document.createElement('span');
            foundationDieLabel.className = 'minion-foundation-die';
            foundationDieLabel.textContent = currentFoundationDie === 'defeated' ? 'Defeated' : currentFoundationDie.toUpperCase();
            foundationVisual.appendChild(foundationDieLabel);

            foundationWrap.appendChild(foundationLabel);
            foundationWrap.appendChild(foundationVisual);

            titleWrap.appendChild(title);
            titleWrap.appendChild(subtitle);
            titleWrap.appendChild(foundationWrap);

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'gm-action-button';
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => this.removeMinionGroup(group.id));

            const addToInitiativeButton = document.createElement('button');
            addToInitiativeButton.type = 'button';
            addToInitiativeButton.className = 'gm-action-button';
            addToInitiativeButton.textContent = 'Add to Initiative';
            addToInitiativeButton.addEventListener('click', (event) => this.openMinionInitiativeModal(group.id, event.currentTarget));

            const headerActions = document.createElement('div');
            headerActions.className = 'minion-card-actions';
            headerActions.appendChild(addToInitiativeButton);
            headerActions.appendChild(removeButton);

            header.appendChild(titleWrap);
            header.appendChild(headerActions);

            const traitsLabel = document.createElement('label');
            traitsLabel.className = 'minion-traits-label';
            traitsLabel.textContent = 'Traits';

            const traitsInput = document.createElement('textarea');
            traitsInput.className = 'minion-traits-input';
            traitsInput.rows = 2;
            traitsInput.value = group.traits || '';
            traitsInput.placeholder = 'Add traits...';
            traitsInput.addEventListener('input', (event) => {
                this.updateMinionTraits(group.id, event.target.value);
            });

            const healthSection = document.createElement('section');
            healthSection.className = 'minion-section minion-health-section';

            const healthHeading = document.createElement('h4');
            healthHeading.className = 'minion-section-title';
            healthHeading.textContent = `Health (${config.max})`;

            const healthGrid = document.createElement('div');
            healthGrid.className = 'minion-health-grid';
            healthGrid.style.gridTemplateColumns = `repeat(${config.columns}, minmax(0, 1fr))`;

            const thresholdLabels = this.getMinionThresholdLabels(config.max);

            for (let value = 1; value <= config.max; value++) {
                const healthValue = config.max - value + 1;
                const box = document.createElement('button');
                box.type = 'button';
                box.className = `minion-box${value <= group.healthDamage ? ' filled' : ''}`;
                box.setAttribute('aria-label', `Set damage to ${value} (health ${healthValue})`);
                box.addEventListener('click', () => this.setMinionHealthDamage(group.id, value));

                const valueLabel = document.createElement('span');
                valueLabel.className = 'minion-box-value';
                valueLabel.textContent = `${healthValue}`;
                box.appendChild(valueLabel);

                if (thresholdLabels.has(healthValue)) {
                    const dieLabel = document.createElement('span');
                    dieLabel.className = 'minion-box-die';
                    dieLabel.textContent = thresholdLabels.get(healthValue);
                    box.appendChild(dieLabel);
                }

                healthGrid.appendChild(box);
            }

            const cohesionSection = document.createElement('section');
            cohesionSection.className = 'minion-section minion-cohesion-section';

            const cohesionMax = Math.floor(config.max / 2);
            const cohesionHeading = document.createElement('h4');
            cohesionHeading.className = 'minion-section-title';
            cohesionHeading.textContent = `Cohesion (${cohesionMax})`;

            const cohesionRow = document.createElement('div');
            cohesionRow.className = 'minion-cohesion-row';
            cohesionRow.style.gridTemplateColumns = `repeat(${cohesionMax}, minmax(0, 1fr))`;

            for (let value = 1; value <= cohesionMax; value++) {
                const box = document.createElement('button');
                box.type = 'button';
                box.className = `minion-box cohesion${value <= group.cohesionDamage ? ' filled' : ''}`;
                box.setAttribute('aria-label', `Set cohesion damage to ${value}`);
                box.addEventListener('click', () => this.setMinionCohesionDamage(group.id, value));

                const valueLabel = document.createElement('span');
                valueLabel.className = 'minion-box-value';
                valueLabel.textContent = `${value}`;
                box.appendChild(valueLabel);

                cohesionRow.appendChild(box);
            }

            healthSection.appendChild(healthHeading);
            healthSection.appendChild(healthGrid);
            cohesionSection.appendChild(cohesionHeading);
            cohesionSection.appendChild(cohesionRow);

            card.appendChild(header);
            card.appendChild(traitsLabel);
            card.appendChild(traitsInput);
            card.appendChild(healthSection);
            card.appendChild(cohesionSection);
            list.appendChild(card);
        });
    }

    handleAddCharacter() {
        const nameInput = document.getElementById('character-name');
        const colorInput = document.getElementById('character-color');

        if (!nameInput || !colorInput) {
            return;
        }

        const name = nameInput.value.trim();
        if (!name) {
            this.setStatus('Enter a character name first.');
            return;
        }

        const duplicate = this.characters.some(character => character.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
            this.setStatus('Character names must be unique.');
            return;
        }

        const activePalette = this.getPaletteForTheme(this.getCurrentTheme());
        const paletteIndex = this.getNextPaletteIndexFromState();
        const assignedColor = activePalette[paletteIndex % activePalette.length];

        const character = {
            id: `char-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            name,
            paletteIndex,
            color: assignedColor,
            defeated: false,
            defeatedAtStep: null,
            defeatedAtRound: null
        };

        this.characters.push(character);
        if (!this.activeCharacterId) {
            this.activeCharacterId = character.id;
        }

        nameInput.value = '';
        this.updateCharacterColorPreview();
        this.syncCharacterSelectors();
        this.updateSelectIndicators();
        this.updateCharacterColorPreview();
        this.renderTracker();
        this.setStatus(`Added ${character.name}.`);
    }

    updateCharacterColorPreview() {
        const colorInput = document.getElementById('character-color');
        if (!colorInput) {
            return;
        }

        const palette = this.getPaletteForTheme(this.getCurrentTheme());
        const previewIndex = Array.isArray(this.recycledColorIndices) && this.recycledColorIndices.length
            ? this.recycledColorIndices[0]
            : this.nextColorIndex;
        colorInput.value = palette[previewIndex % palette.length];
    }

    getCurrentTheme() {
        if (document.body.classList.contains('light-mode')) {
            return 'light';
        }

        if (document.body.classList.contains('high-contrast-mode')) {
            return 'high-contrast';
        }

        return 'dark';
    }

    getPaletteForTheme(theme) {
        return this.colorPalettes[theme] || this.colorPalettes.dark;
    }

    applyThemePaletteToCharacters(theme) {
        const palette = this.getPaletteForTheme(theme);
        this.characters.forEach(character => {
            character.color = palette[character.paletteIndex % palette.length];
        });
    }

    syncCharacterSelectors() {
        const activeSelect = document.getElementById('active-character');
        const interjectionSelect = document.getElementById('interjection-character');

        if (!activeSelect || !interjectionSelect) {
            return;
        }

        activeSelect.innerHTML = '';
        interjectionSelect.innerHTML = '';

        const activeCharacters = this.getActiveCharacters();

        if (this.activeCharacterId) {
            const currentActive = this.getCharacter(this.activeCharacterId);
            if (!currentActive || currentActive.defeated) {
                this.activeCharacterId = activeCharacters.length ? activeCharacters[0].id : null;
            }
        } else if (activeCharacters.length) {
            this.activeCharacterId = activeCharacters[0].id;
        }

        activeCharacters.forEach(character => {
            const activeOption = document.createElement('option');
            activeOption.value = character.id;
            activeOption.textContent = `● ${character.name}`;
            activeOption.dataset.color = character.color;
            activeOption.style.color = character.color;
            activeSelect.appendChild(activeOption);

            const interjectionOption = document.createElement('option');
            interjectionOption.value = character.id;
            interjectionOption.textContent = `● ${character.name}`;
            interjectionOption.dataset.color = character.color;
            interjectionOption.style.color = character.color;
            interjectionSelect.appendChild(interjectionOption);
        });

        if (this.activeCharacterId) {
            activeSelect.value = this.activeCharacterId;
        }

        const fallbackInterjection = activeCharacters.find(character => character.id !== this.activeCharacterId) || activeCharacters[0];
        if (fallbackInterjection) {
            interjectionSelect.value = fallbackInterjection.id;
        }

        this.updateSelectIndicators();

    }

    updateSelectIndicators() {
        const activeSelect = document.getElementById('active-character');
        const interjectionSelect = document.getElementById('interjection-character');
        const activeChip = document.getElementById('active-focus-chip');
        const interjectionChip = document.getElementById('interjection-chip');

        if (activeSelect && activeChip) {
            const activeOption = activeSelect.options[activeSelect.selectedIndex];
            const activeColor = activeOption ? activeOption.dataset.color : '';
            activeChip.style.backgroundColor = activeColor || 'transparent';
            activeSelect.style.boxShadow = activeColor ? `inset 6px 0 0 ${activeColor}` : 'none';
        }

        if (interjectionSelect && interjectionChip) {
            const interjectionOption = interjectionSelect.options[interjectionSelect.selectedIndex];
            const interjectionColor = interjectionOption ? interjectionOption.dataset.color : '';
            interjectionChip.style.backgroundColor = interjectionColor || 'transparent';
            interjectionSelect.style.boxShadow = interjectionColor ? `inset 6px 0 0 ${interjectionColor}` : 'none';
        }

    }

    cycleSelectOption(selectElement) {
        if (!selectElement || selectElement.options.length === 0) {
            return false;
        }

        const currentIndex = selectElement.selectedIndex < 0 ? 0 : selectElement.selectedIndex;
        const nextIndex = (currentIndex + 1) % selectElement.options.length;
        selectElement.selectedIndex = nextIndex;
        return true;
    }

    cycleActiveFocus() {
        const activeSelect = document.getElementById('active-character');
        if (!this.cycleSelectOption(activeSelect)) {
            this.setStatus('Add characters to set focus.');
            return;
        }

        this.setActiveCharacter(activeSelect.value);
    }

    cycleInterjectionSource() {
        const interjectionSelect = document.getElementById('interjection-character');
        if (!this.cycleSelectOption(interjectionSelect)) {
            this.setStatus('Add characters to pick an interjection source.');
            return;
        }

        this.updateSelectIndicators();
    }

    renderCharacterLegend() {
        const legend = document.getElementById('character-legend');
        if (!legend) {
            return;
        }

        legend.innerHTML = '';

        if (!this.characters.length) {
            return;
        }

        this.getDisplayCharacters().forEach(character => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = `legend-item${character.id === this.activeCharacterId ? ' active' : ''}${character.defeated ? ' defeated' : ''}`;
            item.setAttribute('aria-label', character.defeated ? `${character.name} is defeated` : `Set focus to ${character.name}`);
            if (character.defeated) {
                item.disabled = true;
            } else {
                item.addEventListener('click', () => this.setActiveCharacter(character.id));
            }

            const swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            swatch.style.backgroundColor = character.color;

            const name = document.createElement('span');
            name.textContent = character.defeated ? `${character.name} (Defeated)` : character.name;

            item.appendChild(swatch);
            item.appendChild(name);
            legend.appendChild(item);
        });
    }

    handleActiveCharacterChange() {
        if (!this.getActiveCharacters().length) {
            this.setStatus('Add at least one character first.');
            return;
        }

        const activeSelect = document.getElementById('active-character');
        if (!activeSelect || !activeSelect.value) {
            this.setStatus('Choose an active character.');
            return;
        }

        this.setActiveCharacter(activeSelect.value);
    }

    setActiveCharacter(characterId) {
        if (!characterId) {
            return;
        }

        const targetCharacter = this.getCharacter(characterId);
        if (!targetCharacter || targetCharacter.defeated) {
            this.setStatus('Cannot set focus to a defeated character.');
            return;
        }

        this.activeCharacterId = characterId;

        const focusedThisRound = this.roundFocuses.get(this.currentRound) || new Set();
        this.roundFocuses.set(this.currentRound, focusedThisRound);
        focusedThisRound.add(this.activeCharacterId);

        const activeCharacter = this.getCharacter(this.activeCharacterId);
        this.setStatus(`${activeCharacter ? activeCharacter.name : 'Character'} now has focus in round ${this.currentRound}.`);

        this.syncCharacterSelectors();
        this.updateSelectIndicators();
        this.updateCharacterColorPreview();
        this.renderTracker();
    }

    getActiveCharacters() {
        return this.characters.filter(character => !character.defeated);
    }

    getDisplayCharacters() {
        const activeCharacters = this.characters.filter(character => !character.defeated);
        const defeatedCharacters = this.characters.filter(character => character.defeated);
        return [...activeCharacters, ...defeatedCharacters];
    }

    openCharacterActionModal(characterId = this.activeCharacterId) {
        if (!characterId) {
            this.setStatus('No character to modify.');
            return;
        }

        const modal = document.getElementById('character-action-modal');
        const subtitle = document.getElementById('character-action-subtitle');
        const character = this.getCharacter(characterId);
        if (!modal || !subtitle || !character) {
            return;
        }

        this.pendingCharacterActionId = character.id;
        subtitle.textContent = `Choose what to do with ${character.name}. Remove deletes them and all related BEATs/INTERJECTIONs. Mark Defeated keeps history but ends their line.`;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeCharacterActionModal() {
        const modal = document.getElementById('character-action-modal');
        if (!modal) {
            return;
        }

        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        this.pendingCharacterActionId = null;
    }

    openFocusChangeModal(characterId, pendingAction = null) {
        const modal = document.getElementById('focus-change-modal');
        const subtitle = document.getElementById('focus-change-subtitle');
        const character = this.getCharacter(characterId);
        if (!modal || !subtitle || !character) {
            return;
        }

        this.pendingFocusCharacterId = characterId;
        this.pendingFocusAction = pendingAction;
        subtitle.textContent = `"${character.name}" is not the active focus. Switch focus to this character?`;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeFocusChangeModal() {
        const modal = document.getElementById('focus-change-modal');
        if (!modal) {
            return;
        }

        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        this.pendingFocusCharacterId = null;
        this.pendingFocusAction = null;
    }

    confirmFocusChange() {
        const pendingCharacterId = this.pendingFocusCharacterId;
        const pendingAction = this.pendingFocusAction;

        this.closeFocusChangeModal();

        if (pendingCharacterId) {
            this.setActiveCharacter(pendingCharacterId);
        }

        if (pendingAction) {
            this.executePendingFocusAction(pendingAction);
        }
    }

    executePendingFocusAction(action) {
        if (!action || action.type === 'none') {
            return;
        }

        switch (action.type) {
            case 'line-click': {
                if (!action.svg || !Number.isFinite(action.clickedX)) {
                    return;
                }

                const beatsForActive = this.getCurrentRoundBeats(this.activeCharacterId);
                const roundStart = this.getCurrentRoundStart();
                const nextBeatStep = roundStart + beatsForActive.length;
                const nextBeatX = this.getX(nextBeatStep);

                if (beatsForActive.length === 0) {
                    this.addBeat();
                    return;
                }

                const clickedNearEnd = action.clickedX >= nextBeatX - (this.layout.columnWidth * 0.45);
                if (clickedNearEnd) {
                    const lastBeat = beatsForActive[beatsForActive.length - 1];
                    this.openLineEndActionModal(lastBeat.step);
                    return;
                }

                let selectedLeft = null;
                let selectedRight = null;
                let smallestDistance = Number.POSITIVE_INFINITY;

                for (let index = 0; index < beatsForActive.length; index++) {
                    const leftBeat = beatsForActive[index];
                    const rightBeat = beatsForActive[index + 1] || null;
                    const rightStep = rightBeat ? rightBeat.step : leftBeat.step + 1;
                    const midpointX = (this.getX(leftBeat.step) + this.getX(rightStep)) / 2;
                    const distance = Math.abs(action.clickedX - midpointX);
                    if (distance < smallestDistance) {
                        smallestDistance = distance;
                        selectedLeft = leftBeat.step;
                        selectedRight = rightStep;
                    }
                }

                if (selectedLeft !== null && selectedRight !== null) {
                    this.openInterjectionSourceModal(selectedLeft, selectedRight);
                }
                return;
            }

            case 'line-context': {
                const beatsForActive = this.getCurrentRoundBeats(this.activeCharacterId);
                if (!beatsForActive.length) {
                    this.setStatus('Add a BEAT first, then right-click for quick end-INTERJECTION.');
                    return;
                }

                const lastBeat = beatsForActive[beatsForActive.length - 1];
                this.openInterjectionSourceModal(lastBeat.step, lastBeat.step + 1);
                return;
            }

            default:
                return;
        }
    }

    startNewRound() {
        const activeCharacters = this.getActiveCharacters();
        if (!activeCharacters.length) {
            this.setStatus('Add at least one character before starting a new round.');
            return;
        }

        const focusedThisRound = this.roundFocuses.get(this.currentRound) || new Set();
        if (focusedThisRound.size < activeCharacters.length) {
            this.setStatus('Not all characters have had focus yet. Start a new round anyway when ready.');
        }

        const nextRound = this.currentRound + 1;
        const nextStart = this.getCurrentRoundMaxStep() + 1;
        this.roundStarts.set(nextRound, nextStart);
        this.roundFocuses.set(nextRound, new Set());
        this.currentRound = nextRound;

        if (this.activeCharacterId) {
            const activeCharacter = this.getCharacter(this.activeCharacterId);
            this.setStatus(`Started round ${this.currentRound}. ${activeCharacter ? activeCharacter.name : 'Active character'} is ready.`);
        } else {
            this.setStatus(`Started round ${this.currentRound}.`);
        }

        this.renderTracker();
    }

    removeLastRound() {
        if (this.currentRound <= 1) {
            this.setStatus('Round 1 cannot be removed.');
            return;
        }

        const hasBeats = this.beats.some(beat => beat.round === this.currentRound);
        if (hasBeats) {
            this.setStatus('Can only remove the current round when it has no BEATs.');
            return;
        }

        this.interjections = this.interjections.filter(interjection => interjection.round !== this.currentRound);
        this.roundStarts.delete(this.currentRound);
        this.roundFocuses.delete(this.currentRound);
        this.currentRound -= 1;

        this.setStatus(`Removed empty round. Back to round ${this.currentRound}.`);
        this.renderTracker();
    }

    getCurrentRoundStart() {
        return this.roundStarts.get(this.currentRound) || 0;
    }

    getCurrentRoundBeats(characterId) {
        return this.beats
            .filter(beat => beat.characterId === characterId && beat.round === this.currentRound)
            .sort((a, b) => a.step - b.step);
    }

    getCurrentRoundMaxStep() {
        const roundStart = this.getCurrentRoundStart();
        const roundBeats = this.beats.filter(beat => beat.round === this.currentRound);
        if (!roundBeats.length) {
            return roundStart;
        }

        return roundBeats.reduce((maxStep, beat) => Math.max(maxStep, beat.step), roundStart);
    }

    addBeat() {
        const activeCharacter = this.getCharacter(this.activeCharacterId);
        if (!this.activeCharacterId || !activeCharacter) {
            this.setStatus('Set an active focus before adding BEATs.');
            return;
        }

        if (activeCharacter.defeated) {
            this.setStatus('Cannot add BEATs for a defeated character.');
            return;
        }

        const currentRoundBeats = this.getCurrentRoundBeats(this.activeCharacterId);
        const beatStep = this.getCurrentRoundStart() + currentRoundBeats.length;

        const beat = {
            type: 'beat',
            characterId: this.activeCharacterId,
            step: beatStep,
            round: this.currentRound
        };

        this.beats.push(beat);

        this.setStatus(`Added BEAT for ${activeCharacter ? activeCharacter.name : 'active character'}.`);
        this.renderTracker();
    }

    deleteBeat(targetBeat) {
        if (!targetBeat) {
            return;
        }

        const beatIndex = this.beats.indexOf(targetBeat);
        if (beatIndex === -1) {
            return;
        }

        this.beats.splice(beatIndex, 1);
        const character = this.getCharacter(targetBeat.characterId);
        this.setStatus(`Removed BEAT for ${character ? character.name : 'character'}.`);
        this.renderTracker();
    }

    openInterjectionModal() {
        const activeCharacter = this.getCharacter(this.activeCharacterId);
        if (!this.activeCharacterId || !activeCharacter) {
            this.setStatus('Set an active focus before adding INTERJECTION BEATs.');
            return;
        }

        if (activeCharacter.defeated) {
            this.setStatus('Cannot add INTERJECTION BEATs for a defeated active character.');
            return;
        }

        const interjectionSelect = document.getElementById('interjection-character');
        if (!interjectionSelect || !interjectionSelect.value) {
            this.setStatus('Choose a character colour source for the INTERJECTION BEAT.');
            return;
        }

        const sourceCharacterId = interjectionSelect.value;
        if (sourceCharacterId === this.activeCharacterId) {
            this.setStatus('INTERJECTION BEAT must use a different character colour.');
            return;
        }

        const sourceCharacter = this.getCharacter(sourceCharacterId);
        if (!sourceCharacter || sourceCharacter.defeated) {
            this.setStatus('Choose a non-defeated character for INTERJECTION source.');
            return;
        }

        const beatsForActive = this.getCurrentRoundBeats(this.activeCharacterId);
        if (beatsForActive.length < 1) {
            this.setStatus('Need at least 1 BEAT in the current round for the active character.');
            return;
        }

        const modal = document.getElementById('interjection-modal');
        const subtitle = document.getElementById('interjection-modal-subtitle');
        const optionsHost = document.getElementById('interjection-options');
        if (!modal || !subtitle || !optionsHost) {
            return;
        }

        subtitle.textContent = `${activeCharacter ? activeCharacter.name : 'Active'} (Round ${this.currentRound}) using ${sourceCharacter ? sourceCharacter.name : 'selected'} colour.`;

        optionsHost.innerHTML = '';
        for (let index = 0; index < beatsForActive.length; index++) {
            const leftBeat = beatsForActive[index];
            const rightBeat = beatsForActive[index + 1] || null;
            const rightStep = rightBeat ? rightBeat.step : leftBeat.step + 1;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'interjection-option-button';
            button.textContent = rightBeat
                ? `Between BEAT ${index + 1} and BEAT ${index + 2}`
                : `After BEAT ${index + 1}`;
            button.addEventListener('click', () => {
                this.addInterjectionAtGap(sourceCharacterId, leftBeat.step, rightStep);
            });
            optionsHost.appendChild(button);
        }

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    closeInterjectionModal() {
        const modal = document.getElementById('interjection-modal');
        if (!modal) {
            return;
        }

        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        this.modalContext = null;
    }

    openInterjectionSourceModal(leftStep, rightStep) {
        const modal = document.getElementById('interjection-modal');
        const subtitle = document.getElementById('interjection-modal-subtitle');
        const optionsHost = document.getElementById('interjection-options');
        if (!modal || !subtitle || !optionsHost) {
            return;
        }

        const activeCharacter = this.getCharacter(this.activeCharacterId);
        if (!activeCharacter) {
            return;
        }

        optionsHost.innerHTML = '';

        const sources = this.characters.filter(character => !character.defeated && character.id !== this.activeCharacterId);
        if (!sources.length) {
            this.setStatus('Add another character to create interjections.');
            return;
        }

        const hasRightBeat = this.getCurrentRoundBeats(this.activeCharacterId).some(beat => beat.step === rightStep);
        const gapLabel = hasRightBeat
            ? `between BEAT ${leftStep - this.getCurrentRoundStart() + 1} and BEAT ${rightStep - this.getCurrentRoundStart() + 1}`
            : `after BEAT ${leftStep - this.getCurrentRoundStart() + 1}`;

        subtitle.textContent = `${activeCharacter.name} (Round ${this.currentRound}) • Choose interjection source ${gapLabel}.`;

        sources.forEach(source => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'interjection-option-button';
            button.textContent = `Use ${source.name}`;
            button.style.borderLeft = `6px solid ${source.color}`;
            button.addEventListener('click', () => {
                this.addInterjectionAtGap(source.id, leftStep, rightStep);
            });
            optionsHost.appendChild(button);
        });

        this.modalContext = { type: 'source-pick', leftStep, rightStep };
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    openLineEndActionModal(lastBeatStep) {
        const modal = document.getElementById('interjection-modal');
        const subtitle = document.getElementById('interjection-modal-subtitle');
        const optionsHost = document.getElementById('interjection-options');
        if (!modal || !subtitle || !optionsHost) {
            return;
        }

        const activeCharacter = this.getCharacter(this.activeCharacterId);
        if (!activeCharacter) {
            return;
        }

        subtitle.textContent = `${activeCharacter.name} (Round ${this.currentRound}) • Choose action at end of line.`;
        optionsHost.innerHTML = '';

        const addBeatButton = document.createElement('button');
        addBeatButton.type = 'button';
        addBeatButton.className = 'interjection-option-button';
        addBeatButton.textContent = 'Add BEAT at end';
        addBeatButton.addEventListener('click', () => {
            this.closeInterjectionModal();
            this.addBeat();
        });
        optionsHost.appendChild(addBeatButton);

        const addInterjectionButton = document.createElement('button');
        addInterjectionButton.type = 'button';
        addInterjectionButton.className = 'interjection-option-button';
        addInterjectionButton.textContent = 'Add INTERJECTION after last BEAT';
        addInterjectionButton.addEventListener('click', () => {
            this.openInterjectionSourceModal(lastBeatStep, lastBeatStep + 1);
        });
        optionsHost.appendChild(addInterjectionButton);

        this.modalContext = { type: 'line-end-action', lastBeatStep };
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    handleActiveLineClick(characterId, event, svg) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const transformed = point.matrixTransform(svg.getScreenCTM().inverse());
        const clickedX = transformed.x;

        if (characterId !== this.activeCharacterId) {
            this.openFocusChangeModal(characterId, {
                type: 'line-click',
                clickedX,
                svg
            });
            return;
        }

        const beatsForActive = this.getCurrentRoundBeats(this.activeCharacterId);
        const roundStart = this.getCurrentRoundStart();
        const nextBeatStep = roundStart + beatsForActive.length;
        const nextBeatX = this.getX(nextBeatStep);

        if (beatsForActive.length === 0) {
            this.addBeat();
            return;
        }

        const clickedNearEnd = clickedX >= nextBeatX - (this.layout.columnWidth * 0.45);
        if (clickedNearEnd) {
            const lastBeat = beatsForActive[beatsForActive.length - 1];
            this.openLineEndActionModal(lastBeat.step);
            return;
        }

        let selectedLeft = null;
        let selectedRight = null;
        let smallestDistance = Number.POSITIVE_INFINITY;

        for (let index = 0; index < beatsForActive.length; index++) {
            const leftBeat = beatsForActive[index];
            const rightBeat = beatsForActive[index + 1] || null;
            const rightStep = rightBeat ? rightBeat.step : leftBeat.step + 1;
            const midpointX = (this.getX(leftBeat.step) + this.getX(rightStep)) / 2;
            const distance = Math.abs(clickedX - midpointX);
            if (distance < smallestDistance) {
                smallestDistance = distance;
                selectedLeft = leftBeat.step;
                selectedRight = rightStep;
            }
        }

        if (selectedLeft !== null && selectedRight !== null) {
            this.openInterjectionSourceModal(selectedLeft, selectedRight);
        }
    }

    addInterjectionAtGap(sourceCharacterId, leftStep, rightStep) {
        if (!Number.isFinite(leftStep) || !Number.isFinite(rightStep)) {
            this.setStatus('Invalid interjection BEAT gap selected.');
            return;
        }

        this.interjections.push({
            activeCharacterId: this.activeCharacterId,
            sourceCharacterId,
            step: (leftStep + rightStep) / 2,
            round: this.currentRound
        });

        const sourceCharacter = this.getCharacter(sourceCharacterId);
        this.setStatus(`Added INTERJECTION BEAT in ${sourceCharacter ? sourceCharacter.name : 'selected'} colour.`);
        this.closeInterjectionModal();
        this.renderTracker();
    }

    deleteInterjection(targetInterjection) {
        if (!targetInterjection) {
            return;
        }

        const interjectionIndex = this.interjections.indexOf(targetInterjection);
        if (interjectionIndex === -1) {
            return;
        }

        this.interjections.splice(interjectionIndex, 1);
        const sourceCharacter = this.getCharacter(targetInterjection.sourceCharacterId);
        this.setStatus(`Removed INTERJECTION BEAT from ${sourceCharacter ? sourceCharacter.name : 'selected'} colour.`);
        this.renderTracker();
    }

    removeCharacter(characterId) {
        this.closeCharacterActionModal();

        if (!characterId) {
            this.setStatus('No character selected to remove.');
            return;
        }

        const characterToRemove = this.getCharacter(characterId);
        if (!characterToRemove) {
            this.setStatus('Character could not be found.');
            return;
        }

        this.recyclePaletteIndexToState(characterToRemove.paletteIndex);

        this.characters = this.characters.filter(character => character.id !== characterId);

        const beatsBefore = this.beats.length;
        this.beats = this.beats.filter(beat => beat.characterId !== characterId);
        const removedBeats = beatsBefore - this.beats.length;

        const interjectionsBefore = this.interjections.length;
        this.interjections = this.interjections.filter(interjection => (
            interjection.activeCharacterId !== characterId
            && interjection.sourceCharacterId !== characterId
        ));
        const removedInterjections = interjectionsBefore - this.interjections.length;

        this.roundFocuses.forEach((focusedSet) => {
            focusedSet.delete(characterId);
        });

        if (this.activeCharacterId === characterId) {
            const nextActive = this.getActiveCharacters()[0] || null;
            this.activeCharacterId = nextActive ? nextActive.id : null;
        }

        this.syncCharacterSelectors();
        this.updateSelectIndicators();
        this.renderTracker();

        const activeSuffix = this.activeCharacterId
            ? ` Active focus is now ${this.getCharacter(this.activeCharacterId)?.name || 'updated'}.`
            : ' No characters remain.';
        this.setStatus(`Removed ${characterToRemove.name} (${removedBeats} BEATs, ${removedInterjections} INTERJECTIONs).${activeSuffix}`);
    }

    markCharacterDefeated(characterId) {
        this.closeCharacterActionModal();

        if (!characterId) {
            this.setStatus('No character selected to mark defeated.');
            return;
        }

        const character = this.getCharacter(characterId);
        if (!character) {
            this.setStatus('Character could not be found.');
            return;
        }

        if (character.defeated) {
            this.setStatus(`${character.name} is already defeated.`);
            return;
        }

        character.defeated = true;
        character.defeatedAtRound = this.currentRound;
        character.defeatedAtStep = this.getCurrentRoundStart() + this.getCurrentRoundBeats(character.id).length;
        this.roundFocuses.forEach((focusedSet) => {
            focusedSet.delete(characterId);
        });

        if (this.activeCharacterId === characterId) {
            const nextActive = this.getActiveCharacters()[0] || null;
            this.activeCharacterId = nextActive ? nextActive.id : null;
        }

        this.syncCharacterSelectors();
        this.updateSelectIndicators();
        this.renderTracker();

        const activeSuffix = this.activeCharacterId
            ? ` Active focus is now ${this.getCharacter(this.activeCharacterId)?.name || 'updated'}.`
            : ' No active characters remain.';
        this.setStatus(`${character.name} marked as defeated.${activeSuffix}`);
    }

    getCharacter(characterId) {
        return this.characters.find(character => character.id === characterId) || null;
    }

    setStatus(text) {
        const status = document.getElementById('tracker-status');
        if (status) {
            status.textContent = text;
        }
    }

    getLineEndStep() {
        const largestRoundStart = [...this.roundStarts.values()].reduce((maxStep, step) => Math.max(maxStep, step), 0);
        const largestBeatStep = this.beats.length ? this.beats.reduce((maxStep, beat) => Math.max(maxStep, beat.step), 0) : 0;
        return Math.max(largestRoundStart, largestBeatStep, 1);
    }

    getX(step) {
        return this.layout.trackStartX + (step * this.layout.columnWidth);
    }

    getY(rowIndex) {
        return this.layout.topPadding + (rowIndex * this.layout.rowHeight);
    }

    renderTracker() {
        const svg = document.getElementById('beat-tracker-svg');
        if (!svg) {
            return;
        }

        this.renderCharacterLegend();

        const displayCharacters = this.getDisplayCharacters();
        const rowIndexByCharacterId = new Map();
        displayCharacters.forEach((character, index) => {
            rowIndexByCharacterId.set(character.id, index);
        });

        const stepsForWidth = this.getLineEndStep() + 1;
        const width = this.getX(stepsForWidth) + this.layout.columnWidth;
        const height = this.layout.topPadding + Math.max(displayCharacters.length, 1) * this.layout.rowHeight;

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', `${Math.max(height, 120)}`);

        svg.innerHTML = '';

        if (!displayCharacters.length) {
            this.persistActiveTrackState();
            this.refreshTrackSelector();
            return;
        }

        const baseEndX = this.getX(stepsForWidth);

        displayCharacters.forEach((character, index) => {
            const y = this.getY(index);

            const skullAction = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            skullAction.setAttribute('x', `${this.layout.labelX - 4}`);
            skullAction.setAttribute('y', `${y + 5}`);
            skullAction.setAttribute('fill', 'var(--text-primary)');
            skullAction.setAttribute('font-size', '15');
            skullAction.setAttribute('text-anchor', 'end');
            skullAction.setAttribute('opacity', character.defeated ? '0.78' : '0.9');
            skullAction.textContent = '☠️';
            skullAction.style.cursor = 'pointer';
            const skullTooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            skullTooltip.textContent = `Character actions for ${character.name}`;
            skullAction.appendChild(skullTooltip);
            skullAction.addEventListener('click', (event) => {
                event.stopPropagation();
                this.openCharacterActionModal(character.id);
            });
            svg.appendChild(skullAction);

            const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            name.setAttribute('x', `${this.layout.labelX}`);
            name.setAttribute('y', `${y + 5}`);
            name.setAttribute('fill', 'var(--text-primary)');
            name.setAttribute('font-size', '16');
            name.setAttribute('font-weight', character.id === this.activeCharacterId ? '700' : '500');
            if (character.defeated) {
                name.setAttribute('opacity', '0.75');
            }
            if (character.id === this.activeCharacterId) {
                name.setAttribute('text-decoration', 'underline');
            }
            name.textContent = character.name;
            name.style.cursor = character.defeated ? 'default' : 'pointer';
            const nameTooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            nameTooltip.textContent = character.defeated ? `${character.name} is defeated` : `Set focus to ${character.name}`;
            name.appendChild(nameTooltip);
            if (!character.defeated) {
                name.addEventListener('click', () => this.setActiveCharacter(character.id));
            }
            svg.appendChild(name);

            if (character.defeated) {
                const labelWidth = name.getComputedTextLength();
                const badgeX = this.layout.labelX + labelWidth + 10;
                const badgeY = y - 10;
                const badgeHeight = 16;
                const badgeText = 'DEFEATED';
                const badgeTextWidth = (badgeText.length * 7) + 10;

                const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                badgeRect.setAttribute('x', `${badgeX}`);
                badgeRect.setAttribute('y', `${badgeY}`);
                badgeRect.setAttribute('width', `${badgeTextWidth}`);
                badgeRect.setAttribute('height', `${badgeHeight}`);
                badgeRect.setAttribute('rx', '8');
                badgeRect.setAttribute('fill', 'var(--color-accent)');
                badgeRect.setAttribute('opacity', '0.85');
                svg.appendChild(badgeRect);

                const badgeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                badgeLabel.setAttribute('x', `${badgeX + (badgeTextWidth / 2)}`);
                badgeLabel.setAttribute('y', `${badgeY + 11}`);
                badgeLabel.setAttribute('fill', 'var(--text-button)');
                badgeLabel.setAttribute('font-size', '10');
                badgeLabel.setAttribute('font-weight', '700');
                badgeLabel.setAttribute('text-anchor', 'middle');
                badgeLabel.textContent = badgeText;
                svg.appendChild(badgeLabel);
            }

            const maxBeatStep = this.beats
                .filter(beat => beat.characterId === character.id)
                .reduce((maxStep, beat) => Math.max(maxStep, beat.step), 0);
            const maxInterjectionStep = this.interjections
                .filter(interjection => interjection.activeCharacterId === character.id)
                .reduce((maxStep, interjection) => Math.max(maxStep, interjection.step), 0);
            const defeatedEndStep = character.defeated
                ? Math.max(character.defeatedAtStep || 0, maxBeatStep, maxInterjectionStep)
                : stepsForWidth;
            const lineEndX = this.getX(defeatedEndStep);

            const baseline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            baseline.setAttribute('x1', `${this.layout.trackStartX}`);
            baseline.setAttribute('y1', `${y}`);
            baseline.setAttribute('x2', `${lineEndX}`);
            baseline.setAttribute('y2', `${y}`);
            baseline.setAttribute('stroke', character.color);
            baseline.setAttribute('stroke-width', '3');
            baseline.setAttribute('stroke-linecap', 'round');
            baseline.setAttribute('opacity', character.defeated ? '0.45' : '0.7');
            svg.appendChild(baseline);

            const hoverLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hoverLine.setAttribute('x1', `${this.layout.trackStartX}`);
            hoverLine.setAttribute('y1', `${y}`);
            hoverLine.setAttribute('x2', `${lineEndX}`);
            hoverLine.setAttribute('y2', `${y}`);
            hoverLine.setAttribute('stroke', character.color);
            hoverLine.setAttribute('stroke-width', '8');
            hoverLine.setAttribute('stroke-linecap', 'round');
            hoverLine.setAttribute('opacity', '0');
            hoverLine.style.pointerEvents = 'none';
            svg.appendChild(hoverLine);

            const lineHitArea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineHitArea.setAttribute('x1', `${this.layout.trackStartX}`);
            lineHitArea.setAttribute('y1', `${y}`);
            lineHitArea.setAttribute('x2', `${lineEndX}`);
            lineHitArea.setAttribute('y2', `${y}`);
            lineHitArea.setAttribute('stroke', 'transparent');
            lineHitArea.setAttribute('stroke-width', '18');
            lineHitArea.style.cursor = character.defeated ? 'not-allowed' : character.id === this.activeCharacterId ? 'pointer' : 'default';

            const lineTooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            lineTooltip.textContent = character.defeated
                ? 'Defeated character line is frozen.'
                : character.id === this.activeCharacterId
                ? 'Click near line end to choose BEAT or end-INTERJECTION. Click between BEATs for INTERJECTION. Right-click for quick end-INTERJECTION.'
                : 'Click this character name to set active focus first.';
            lineHitArea.appendChild(lineTooltip);

            lineHitArea.addEventListener('click', (event) => {
                if (character.defeated) {
                    this.setStatus(`${character.name} is defeated and cannot receive new actions.`);
                    return;
                }
                this.handleActiveLineClick(character.id, event, svg);
            });

            lineHitArea.addEventListener('contextmenu', (event) => {
                event.preventDefault();

                if (character.defeated) {
                    this.setStatus(`${character.name} is defeated and cannot receive new actions.`);
                    return;
                }

                if (character.id !== this.activeCharacterId) {
                    this.openFocusChangeModal(character.id, { type: 'line-context' });
                    return;
                }

                const beatsForActive = this.getCurrentRoundBeats(this.activeCharacterId);
                if (!beatsForActive.length) {
                    this.setStatus('Add a BEAT first, then right-click for quick end-INTERJECTION.');
                    return;
                }

                const lastBeat = beatsForActive[beatsForActive.length - 1];
                this.openInterjectionSourceModal(lastBeat.step, lastBeat.step + 1);
            });

            lineHitArea.addEventListener('mouseenter', () => {
                hoverLine.setAttribute('opacity', character.id === this.activeCharacterId ? '0.35' : '0.18');
            });

            lineHitArea.addEventListener('mouseleave', () => {
                hoverLine.setAttribute('opacity', '0');
            });

            svg.appendChild(lineHitArea);
        });

        [...this.roundStarts.entries()]
            .filter(([round]) => round > 1)
            .forEach(([, startStep]) => {
            const separator = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const hasBoundaryInterjection = this.interjections.some(interjection => (
                Math.abs(interjection.step - (startStep - 0.5)) < 0.001
            ));
            const separatorSpacing = hasBoundaryInterjection ? 8 : 0;
            const separatorX = this.getX(startStep) - (this.layout.columnWidth / 2) + separatorSpacing;
            separator.setAttribute('x1', `${separatorX}`);
            separator.setAttribute('y1', `${this.layout.topPadding - 20}`);
            separator.setAttribute('x2', `${separatorX}`);
            separator.setAttribute('y2', `${height - 20}`);
            separator.setAttribute('stroke', 'var(--text-muted)');
            separator.setAttribute('stroke-width', '1');
            separator.setAttribute('stroke-dasharray', '6 6');
            svg.appendChild(separator);
        });

        this.beats.forEach(beat => {
            const rowIndex = rowIndexByCharacterId.get(beat.characterId);
            if (rowIndex === undefined) {
                return;
            }

            const character = this.getCharacter(beat.characterId);
            if (!character) {
                return;
            }
            const beatCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            beatCircle.setAttribute('cx', `${this.getX(beat.step)}`);
            beatCircle.setAttribute('cy', `${this.getY(rowIndex)}`);
            beatCircle.setAttribute('r', `${this.layout.circleRadius}`);
            beatCircle.setAttribute('fill', character.color);
            beatCircle.setAttribute('stroke', 'var(--bg-primary)');
            beatCircle.setAttribute('stroke-width', '2');
            beatCircle.style.cursor = 'pointer';
            const beatTooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            beatTooltip.textContent = `BEAT (${character.name}) • Click to delete`;
            beatCircle.appendChild(beatTooltip);
            beatCircle.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteBeat(beat);
            });
            svg.appendChild(beatCircle);
        });

        const interjectionOffsets = new Map();

        this.interjections.forEach(interjection => {
            const activeRow = rowIndexByCharacterId.get(interjection.activeCharacterId);
            const sourceCharacter = this.getCharacter(interjection.sourceCharacterId);
            if (activeRow === undefined || !sourceCharacter) {
                return;
            }

            const baseX = this.getX(interjection.step);
            const y = this.getY(activeRow);
            const key = `${activeRow}-${interjection.step}`;
            const countAtSpot = interjectionOffsets.get(key) || 0;
            interjectionOffsets.set(key, countAtSpot + 1);
            const spread = 7;
            const magnitude = Math.floor((countAtSpot + 1) / 2) * spread;
            const direction = countAtSpot % 2 === 0 ? 1 : -1;
            const x = countAtSpot === 0 ? baseX : baseX + (magnitude * direction);

            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            marker.setAttribute('x1', `${x}`);
            marker.setAttribute('y1', `${y - 20}`);
            marker.setAttribute('x2', `${x}`);
            marker.setAttribute('y2', `${y + 20}`);
            marker.setAttribute('stroke', sourceCharacter.color);
            marker.setAttribute('stroke-width', '4');
            marker.setAttribute('stroke-linecap', 'round');
            marker.style.cursor = 'pointer';
            const interjectionTooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            interjectionTooltip.textContent = `INTERJECTION (${sourceCharacter.name}) • Click to delete`;
            marker.appendChild(interjectionTooltip);
            marker.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteInterjection(interjection);
            });
            svg.appendChild(marker);
        });

        this.updateCharacterColorPreview();

        this.persistActiveTrackState();
        this.refreshTrackSelector();
    }

    syncThemeToEmbeddedPanels(theme) {
        if (this.embeddedMode) {
            return;
        }

        const iframes = document.querySelectorAll('.initiative-embedded-iframe');
        iframes.forEach((iframe) => {
            try {
                iframe.contentWindow?.postMessage({
                    type: 'beat-theme-sync',
                    theme
                }, '*');
            } catch (error) {
                // Best effort sync only.
            }
        });
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('diceRollerTheme') || 'dark';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        let currentTheme = 'dark';

        if (document.body.classList.contains('light-mode')) {
            currentTheme = 'light';
        } else if (document.body.classList.contains('high-contrast-mode')) {
            currentTheme = 'high-contrast';
        }

        let newTheme;
        switch (currentTheme) {
            case 'dark':
                newTheme = 'light';
                break;
            case 'light':
                newTheme = 'high-contrast';
                break;
            case 'high-contrast':
                newTheme = 'dark';
                break;
            default:
                newTheme = 'dark';
        }

        this.setTheme(newTheme);
    }

    setTheme(theme, persist = true) {
        const body = document.body;
        const toggleButton = document.getElementById('theme-toggle');
        const toggleIcon = toggleButton ? toggleButton.querySelector('.theme-toggle-icon') : null;
        const toggleText = toggleButton ? toggleButton.querySelector('.theme-toggle-text') : null;

        body.classList.remove('light-mode', 'high-contrast-mode');

        switch (theme) {
            case 'light':
                body.classList.add('light-mode');
                if (toggleIcon) toggleIcon.textContent = '☀️';
                if (toggleText) toggleText.textContent = 'Light Mode';
                break;
            case 'high-contrast':
                body.classList.add('high-contrast-mode');
                if (toggleIcon) toggleIcon.textContent = '🎯';
                if (toggleText) toggleText.textContent = 'High Contrast';
                break;
            case 'dark':
            default:
                if (toggleIcon) toggleIcon.textContent = '🌙';
                if (toggleText) toggleText.textContent = 'Dark Mode';
                break;
        }

        this.applyThemePaletteToCharacters(theme);
        this.updateCharacterColorPreview();
        this.syncCharacterSelectors();
        this.updateSelectIndicators();
        this.renderTracker();
        this.renderCharacterLegend();

        if (persist) {
            localStorage.setItem('diceRollerTheme', theme);
        }

        this.syncThemeToEmbeddedPanels(theme);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gmScreen = new GmScreen();
    gmScreen.updateCharacterColorPreview();
        gmScreen.renderCharacterLegend();
});
