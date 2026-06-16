const MODULE_ID = "foundry-mobile-companion";

const TABS = [
  { id: "character", label: "Character", icon: "fa-solid fa-user" },
  { id: "favorites", label: "Favorites", icon: "fa-solid fa-star" },
  { id: "spells", label: "Spells", icon: "fa-solid fa-wand-sparkles" },
  { id: "inventory", label: "Inventory", icon: "fa-solid fa-backpack" },
  { id: "features", label: "Features", icon: "fa-solid fa-book-sparkles" },
  { id: "combat", label: "Combat", icon: "fa-solid fa-swords" },
  { id: "chat", label: "Chat", icon: "fa-solid fa-comments" },
  { id: "journal", label: "Journal", icon: "fa-solid fa-book-open" },
  { id: "audio", label: "Audio", icon: "fa-solid fa-music" },
  { id: "settings", label: "Settings", icon: "fa-solid fa-gear" }
];

const CHARACTER_TAB_IDS = ["character", "favorites", "spells", "inventory", "features", "combat"];
const FOUNDRY_TAB_IDS = ["chat", "journal", "audio", "settings"];
const DEFAULT_DRAWER_MAIN_TABS = ["character", "favorites", "spells", "inventory", "chat"];

const INVENTORY_TYPES = new Set(["weapon", "equipment", "consumable", "tool", "loot", "container", "backpack"]);
const FEATURE_TYPES = new Set(["feat", "class", "subclass", "race", "background"]);
const THEME_OPTIONS = [
  { id: "ember", label: "Ember" },
  { id: "arcane", label: "Arcane" },
  { id: "forest", label: "Forest" },
  { id: "frost", label: "Frost" },
  { id: "crimson", label: "Crimson" },
  { id: "sunlit", label: "Sunlit" }
];

const ABILITY_ICONS = {
  str: "fa-solid fa-dumbbell",
  dex: "fa-solid fa-feather",
  con: "fa-solid fa-shield-heart",
  int: "fa-solid fa-brain",
  wis: "fa-solid fa-eye",
  cha: "fa-solid fa-masks-theater"
};

const DND5E_SKILL_LABELS = {
  acr: "Acrobatics",
  ani: "Animal Handling",
  arc: "Arcana",
  ath: "Athletics",
  dec: "Deception",
  his: "History",
  ins: "Insight",
  itm: "Intimidation",
  inv: "Investigation",
  med: "Medicine",
  nat: "Nature",
  prc: "Perception",
  prf: "Performance",
  per: "Persuasion",
  rel: "Religion",
  slt: "Sleight of Hand",
  ste: "Stealth",
  sur: "Survival"
};

class FoundryMobileCompanion {
  constructor() {
    this.active = false;
    this.activeTab = "character";
    this.selectedActorId = null;
    this.exitStandardUi = false;
    this.shell = null;
    this.modal = null;
    this.pendingRollDialogResolve = null;
    this.expandedChatMessages = new Set();
    this.confirmingExit = false;
    this.chatDiceMenuOpen = false;
    this.navDrawerOpen = false;
    this.chatToastTimer = null;
    this.lastTokenBarRollTap = 0;
    this.boundRender = this.render.bind(this);
    this.boundResize = this.onWindowResize.bind(this);
    this.boundChatMessageCreated = this.onChatMessageCreated.bind(this);
    this.boundSuppressViewportWarning = this.suppressViewportWarning.bind(this);
    this.boundSuppressViewportWarningSoon = this.scheduleViewportWarningSuppression.bind(this);
    this.boundInterceptApplication = this.interceptRenderedApplication.bind(this);
    this.boundTokenBarRollCapture = this.onTokenBarRollCapture.bind(this);
    this.viewportWarningObserver = null;
  }

  init() {
    this.patchViewportWarning();

    game.settings.register(MODULE_ID, "enabled", {
      name: "FMC.Settings.Enable.Name",
      hint: "FMC.Settings.Enable.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => this.checkActivation()
    });

    game.settings.register(MODULE_ID, "forceMobile", {
      name: "FMC.Settings.Force.Name",
      hint: "FMC.Settings.Force.Hint",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => this.checkActivation()
    });

    game.settings.register(MODULE_ID, "favoriteItems", {
      scope: "client",
      config: false,
      type: Object,
      default: {}
    });

    game.settings.register(MODULE_ID, "favoriteEntries", {
      scope: "client",
      config: false,
      type: Object,
      default: {}
    });

    game.settings.register(MODULE_ID, "theme", {
      scope: "client",
      config: false,
      type: String,
      default: "ember",
      onChange: () => {
        this.applyTheme();
        this.render();
      }
    });

    game.settings.register(MODULE_ID, "navLayout", {
      scope: "client",
      config: false,
      type: String,
      default: "drawer"
    });

    game.settings.register(MODULE_ID, "navMainTabs", {
      scope: "client",
      config: false,
      type: Object,
      default: DEFAULT_DRAWER_MAIN_TABS
    });
  }

  ready() {
    this.checkActivation();
  }

  checkActivation() {
    const shouldActivate = this.shouldActivate();

    if (shouldActivate && !this.active) {
      this.activate();
      return;
    }

    if (!shouldActivate && this.active) this.deactivate();
  }

  shouldActivate() {
    if (this.exitStandardUi) return false;
    if (!game.settings.get(MODULE_ID, "enabled")) return false;
    if (!this.isSupportedUser()) return false;
    if (game.system?.id !== "dnd5e") return false;

    const forced = game.settings.get(MODULE_ID, "forceMobile");
    return forced || this.detectMobile();
  }

  isSupportedUser() {
    const roles = CONST.USER_ROLES;
    const role = game.user?.role ?? roles.NONE;
    return role >= roles.PLAYER && role <= roles.TRUSTED;
  }

  detectMobile() {
    const ua = navigator.userAgent || navigator.vendor || "";
    const uaMobile = /Android|iPhone|iPod/i.test(ua);
    const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const narrow = window.innerWidth <= 820;
    const portrait = window.matchMedia?.("(orientation: portrait)")?.matches ?? window.innerHeight >= window.innerWidth;

    return (uaMobile && touch) || (touch && narrow && portrait);
  }

  activate() {
    this.active = true;
    document.body.classList.add("fmc-mobile-active");
    this.selectInitialActor();
    this.createShell();
    this.registerHooks();
    this.render();
  }

  deactivate() {
    this.active = false;
    document.body.classList.remove("fmc-mobile-active");
    this.unregisterHooks();
    this.viewportWarningObserver?.disconnect();
    this.viewportWarningObserver = null;
    this.shell?.remove();
    this.shell = null;
  }

  registerHooks() {
    Hooks.on("updateActor", this.boundRender);
    Hooks.on("createItem", this.boundRender);
    Hooks.on("updateItem", this.boundRender);
    Hooks.on("deleteItem", this.boundRender);
    Hooks.on("updateCombat", this.boundRender);
    Hooks.on("createCombat", this.boundRender);
    Hooks.on("deleteCombat", this.boundRender);
    Hooks.on("updateCombatant", this.boundRender);
    Hooks.on("createChatMessage", this.boundRender);
    Hooks.on("createChatMessage", this.boundChatMessageCreated);
    Hooks.on("updateChatMessage", this.boundRender);
    Hooks.on("deleteChatMessage", this.boundRender);
    Hooks.on("renderApplication", this.boundInterceptApplication);
    Hooks.on("renderJournalSheet", this.boundInterceptApplication);
    document.addEventListener("click", this.boundTokenBarRollCapture, true);
    document.addEventListener("pointerup", this.boundTokenBarRollCapture, true);
    document.addEventListener("touchend", this.boundTokenBarRollCapture, true);
    window.addEventListener("resize", this.boundResize);
    window.visualViewport?.addEventListener("resize", this.boundSuppressViewportWarningSoon);
  }

  unregisterHooks() {
    Hooks.off("updateActor", this.boundRender);
    Hooks.off("createItem", this.boundRender);
    Hooks.off("updateItem", this.boundRender);
    Hooks.off("deleteItem", this.boundRender);
    Hooks.off("updateCombat", this.boundRender);
    Hooks.off("createCombat", this.boundRender);
    Hooks.off("deleteCombat", this.boundRender);
    Hooks.off("updateCombatant", this.boundRender);
    Hooks.off("createChatMessage", this.boundRender);
    Hooks.off("createChatMessage", this.boundChatMessageCreated);
    Hooks.off("updateChatMessage", this.boundRender);
    Hooks.off("deleteChatMessage", this.boundRender);
    Hooks.off("renderApplication", this.boundInterceptApplication);
    Hooks.off("renderJournalSheet", this.boundInterceptApplication);
    document.removeEventListener("click", this.boundTokenBarRollCapture, true);
    document.removeEventListener("pointerup", this.boundTokenBarRollCapture, true);
    document.removeEventListener("touchend", this.boundTokenBarRollCapture, true);
    window.removeEventListener("resize", this.boundResize);
    window.visualViewport?.removeEventListener("resize", this.boundSuppressViewportWarningSoon);
  }

  createShell() {
    if (this.shell) return;

    this.shell = document.createElement("section");
    this.shell.id = "fmc-app";
    this.shell.innerHTML = `
      <header class="fmc-header"></header>
      <main class="fmc-main"></main>
      <nav class="fmc-nav" aria-label="Mobile companion navigation"></nav>
    `;
    document.body.appendChild(this.shell);
    this.shell.addEventListener("click", (event) => this.onClick(event));
    this.shell.addEventListener("change", (event) => this.onChange(event));
    this.shell.addEventListener("submit", (event) => this.onSubmit(event));
    this.shell.addEventListener("focusin", this.boundSuppressViewportWarningSoon);
    this.applyTheme();
  }

  getActors() {
    return game.actors
      .filter((actor) => actor.testUserPermission(game.user, "OBSERVER"))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get selectedActor() {
    return this.selectedActorId ? game.actors.get(this.selectedActorId) : null;
  }

  get canEditSelectedActor() {
    return this.selectedActor?.testUserPermission(game.user, "OWNER") ?? false;
  }

  selectInitialActor() {
    const actors = this.getActors();
    if (!actors.length) {
      this.selectedActorId = null;
      return;
    }

    if (!this.selectedActorId || !actors.some((actor) => actor.id === this.selectedActorId)) {
      this.selectedActorId = actors[0].id;
    }
  }

  render() {
    if (!this.active || !this.shell) return;
    this.selectInitialActor();
    this.suppressViewportWarning();

    this.shell.querySelector(".fmc-header").innerHTML = this.renderHeader();
    this.shell.querySelector(".fmc-main").innerHTML = this.renderMain();
    this.shell.querySelector(".fmc-nav").innerHTML = this.renderNav();
    if (this.activeTab === "chat") {
      this.bindTokenBarRollButtons();
      this.bindChatScrollState();
      this.scrollChatToBottom();
    }
  }

  bindTokenBarRollButtons() {
    const buttons = Array.from(this.shell?.querySelectorAll(".fmc-tokenbar-roll") ?? []);
    for (const button of buttons) {
      button.onclick = (event) => this.handleTokenBarRollInteraction(button, event);
      button.onpointerup = (event) => {
        if (event.pointerType === "mouse") return;
        return this.handleTokenBarRollInteraction(button, event);
      };
    }
  }

  onTokenBarRollCapture(event) {
    if (!this.active || !this.shell) return;
    if (event.type === "pointerup" && event.pointerType === "mouse") return;

    const button = event.target?.closest?.(".fmc-tokenbar-roll");
    if (!button || !this.shell.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    void this.handleTokenBarRollInteraction(button, event);
  }

  async handleTokenBarRollInteraction(button, event = undefined) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const now = Date.now();
    if (now - this.lastTokenBarRollTap < 350) return;
    this.lastTokenBarRollTap = now;

    this.showTokenBarTapToast();
    try {
      await this.rollTokenBarRequest(button, event);
    } catch (error) {
      console.warn(`${MODULE_ID} | TokenBar tap handler failed`, error);
      ui.notifications.warn("TokenBar roll failed before the roll dialog opened.");
    }
  }

  showTokenBarTapToast() {
    const chatButton = this.shell?.querySelector(".fmc-nav [data-tab='chat']");
    if (!chatButton) return;

    this.shell.querySelector(".fmc-chat-toast")?.remove();
    const element = document.createElement("div");
    element.className = "fmc-chat-toast compact";
    element.innerHTML = `<strong>TokenBar roll</strong>`;
    chatButton.appendChild(element);

    window.clearTimeout(this.chatToastTimer);
    this.chatToastTimer = window.setTimeout(() => element.remove(), 1600);
  }


  onWindowResize() {
    if (this.isTextEntryActive()) {
      this.scheduleViewportWarningSuppression();
      return;
    }

    this.render();
  }

  isTextEntryActive() {
    const active = document.activeElement;
    if (!active || !this.shell?.contains(active)) return false;
    return active.matches("input, textarea, select, [contenteditable='true']");
  }

  scheduleViewportWarningSuppression() {
    this.suppressViewportWarning();
    window.requestAnimationFrame(() => this.suppressViewportWarning());
    window.setTimeout(() => this.suppressViewportWarning(), 50);
    window.setTimeout(() => this.suppressViewportWarning(), 180);
    window.setTimeout(() => this.suppressViewportWarning(), 500);
  }

  renderHeader() {
    const actor = this.selectedActor;
    const actorName = actor ? escapeHtml(actor.name) : "No actor";
    const subtitle = this.activeTabLabel();

    return `
      <div class="fmc-title-block">
        <strong>${actorName}</strong>
        <span>${escapeHtml(subtitle)}</span>
      </div>
      <button class="fmc-icon-button" type="button" data-action="open-actor-sheet" aria-label="Open actor sheet">
        <i class="fa-solid fa-up-right-from-square"></i>
      </button>
    `;
  }

  renderMain() {
    const actors = this.getActors();
    if (!actors.length) return this.renderEmptyState("No available actors", "Ask the GM to assign an actor to your user.");
    if (!this.selectedActor) return this.renderActorPicker();

    switch (this.activeTab) {
      case "character":
        return this.renderCharacter();
      case "favorites":
        return this.renderFavorites();
      case "spells":
        return this.renderSpells();
      case "inventory":
        return this.renderInventory();
      case "features":
        return this.renderFeatures();
      case "combat":
        return this.renderCombat();
      case "chat":
        return this.renderChat();
      case "journal":
        return this.renderJournal();
      case "audio":
        return this.renderAudio();
      case "settings":
        return this.renderSettings();
      default:
        return this.renderCharacter();
    }
  }

  renderNav() {
    const layout = this.navLayout;
    if (layout === "drawer") return this.renderDrawerNav();
    if (layout === "grouped") return this.renderGroupedNav();
    return this.renderFullNav();
  }

  renderFullNav() {
    return `
      <div class="fmc-nav-row fmc-nav-full">
        ${TABS.map((tab) => this.renderNavButton(tab)).join("")}
      </div>
    `;
  }

  renderDrawerNav() {
    const mainIds = this.navMainTabs;
    const mainTabs = mainIds.map((id) => this.tabById(id)).filter(Boolean);
    const drawerTabs = TABS.filter((tab) => !mainIds.includes(tab.id));
    const drawerActive = drawerTabs.some((tab) => tab.id === this.activeTab);

    return `
      ${this.navDrawerOpen ? `
        <div class="fmc-nav-drawer">
          ${drawerTabs.map((tab) => this.renderNavButton(tab)).join("")}
        </div>
      ` : ""}
      <div class="fmc-nav-row fmc-nav-drawer-main ${mainTabs.length >= 6 ? "compact" : ""}" style="--fmc-nav-count: ${mainTabs.length + 1}">
        ${mainTabs.map((tab) => this.renderNavButton(tab)).join("")}
        <button type="button" class="${drawerActive || this.navDrawerOpen ? "active" : ""}" data-action="toggle-nav-drawer" aria-label="More">
          <i class="fa-solid fa-ellipsis"></i>
          <span>More</span>
        </button>
      </div>
    `;
  }

  renderGroupedNav() {
    const activeGroup = FOUNDRY_TAB_IDS.includes(this.activeTab) ? "foundry" : "character";
    const tabs = (activeGroup === "foundry" ? FOUNDRY_TAB_IDS : CHARACTER_TAB_IDS)
      .map((id) => this.tabById(id))
      .filter(Boolean);

    return `
      <div class="fmc-nav-groups">
        <button type="button" class="${activeGroup === "character" ? "active" : ""}" data-action="set-nav-group" data-group="character">
          <i class="fa-solid fa-user"></i>
          <span>Character</span>
        </button>
        <button type="button" class="${activeGroup === "foundry" ? "active" : ""}" data-action="set-nav-group" data-group="foundry">
          <i class="fa-solid fa-dice-d20"></i>
          <span>Foundry</span>
        </button>
      </div>
      <div class="fmc-nav-row fmc-nav-grouped-row" style="--fmc-nav-count: ${tabs.length}">
        ${tabs.map((tab) => this.renderNavButton(tab)).join("")}
      </div>
    `;
  }

  renderNavButton(tab) {
    return `
      <button type="button" class="${tab.id === this.activeTab ? "active" : ""}" data-tab="${tab.id}" aria-label="${escapeHtml(tab.label)}">
        <i class="${tab.icon}"></i>
        <span>${escapeHtml(tab.label)}</span>
      </button>
    `;
  }

  tabById(id) {
    return TABS.find((tab) => tab.id === id);
  }

  get navLayout() {
    const value = game.settings.get(MODULE_ID, "navLayout");
    return ["full", "drawer", "grouped"].includes(value) ? value : "full";
  }

  get navMainTabs() {
    const value = game.settings.get(MODULE_ID, "navMainTabs");
    const ids = Array.isArray(value) ? value : DEFAULT_DRAWER_MAIN_TABS;
    const valid = ids.filter((id) => this.tabById(id));
    return valid.length ? uniqueStrings(valid).slice(0, TABS.length - 1) : DEFAULT_DRAWER_MAIN_TABS;
  }

  renderActorPicker() {
    return `
      <section class="fmc-panel">
        <h2>Select Character</h2>
        ${this.renderActorSelect()}
      </section>
    `;
  }

  renderCharacter() {
    const actor = this.selectedActor;
    const system = actor.system ?? {};
    const hp = system.attributes?.hp ?? {};
    const ac = system.attributes?.ac?.value ?? "-";
    const prof = system.attributes?.prof ?? "-";
    const speed = this.formatMovement(system.attributes?.movement);

    return `
      <section class="fmc-stack">
        <div class="fmc-stat-grid">
          ${this.renderMiniStat("AC", ac, "fa-solid fa-shield-halved")}
          ${this.renderMiniStat("Prof", formatSigned(prof), "fa-solid fa-certificate")}
          ${this.renderMiniStat("Speed", speed, "fa-solid fa-person-running")}
        </div>

        ${this.renderInspiration()}
        <section class="fmc-panel">
          <h2>Hit Points</h2>
          <div class="fmc-field-row">
            ${this.renderNumberInput("HP", "system.attributes.hp.value", hp.value, this.canEditSelectedActor)}
            ${this.renderNumberInput("Temp", "system.attributes.hp.temp", hp.temp, this.canEditSelectedActor)}
            ${this.renderNumberInput("Max", "system.attributes.hp.max", hp.max, false)}
          </div>
        </section>

        ${this.renderRestActions()}
        ${this.renderDeathSaves()}
        ${this.renderAbilities()}
        ${this.renderSkills()}
        ${this.renderCurrency()}
      </section>
    `;
  }

  renderInspiration() {
    const active = Boolean(this.selectedActor.system?.attributes?.inspiration);
    return `
      <section class="fmc-inspiration-panel">
        <button type="button" class="${active ? "active" : ""}" data-action="toggle-inspiration" ${this.canEditSelectedActor ? "" : "disabled"}>
          <i class="fa-solid fa-sparkles"></i>
          <span>Inspiration</span>
          <strong>${active ? "On" : "Off"}</strong>
        </button>
      </section>
    `;
  }

  renderDeathSaves() {
    const ds = this.selectedActor.system?.attributes?.death ?? {};
    const successes = Number(ds.success ?? 0);
    const failures = Number(ds.failure ?? 0);
    const canEdit = this.canEditSelectedActor;
    return `
      <section class="fmc-panel">
        <h2>Death Saves</h2>
        <div class="fmc-death-saves">
          <div class="fmc-death-track failure" aria-label="Death save failures">
            ${[3, 2, 1].map((index) => this.renderDeathSaveDot("failure", index, failures >= index, canEdit)).join("")}
          </div>
          <button type="button" class="fmc-death-roll" data-action="roll-death-save" ${canEdit ? "" : "disabled"} aria-label="Roll death save">
            <i class="fa-solid fa-dice-d20"></i>
          </button>
          <div class="fmc-death-track success" aria-label="Death save successes">
            ${[1, 2, 3].map((index) => this.renderDeathSaveDot("success", index, successes >= index, canEdit)).join("")}
          </div>
        </div>
      </section>
    `;
  }

  renderRestActions() {
    const enabled = this.canEditSelectedActor;
    return `
      <section class="fmc-rest-actions">
        <button type="button" data-action="short-rest" ${enabled ? "" : "disabled"}>
          <i class="fa-solid fa-mug-hot"></i>
          <span>Short Rest</span>
        </button>
        <button type="button" data-action="long-rest" ${enabled ? "" : "disabled"}>
          <i class="fa-solid fa-bed"></i>
          <span>Long Rest</span>
        </button>
      </section>
    `;
  }

  renderDeathSaveDot(type, index, active, enabled) {
    return `
      <button type="button" class="fmc-death-dot ${type} ${active ? "active" : ""}" data-action="toggle-death-save" data-death-type="${type}" data-death-index="${index}" ${enabled ? "" : "disabled"} aria-label="${type} ${index}">
        <i class="fa-solid ${type === "failure" ? "fa-skull" : "fa-heart"}"></i>
      </button>
    `;
  }

  renderAbilities() {
    const abilities = this.selectedActor.system?.abilities ?? {};
    const rows = Object.entries(abilities).map(([key, ability]) => {
      const mod = ability.mod ?? ability.value ?? 0;
      return `
        <article class="fmc-row">
          <div>
            <strong>${key.toUpperCase()}</strong>
            <span>Score ${ability.value ?? "-"}</span>
          </div>
          <div class="fmc-actions">
            <button type="button" data-roll="ability" data-ability="${key}">${formatSigned(mod)}</button>
            <button type="button" data-roll="save" data-ability="${key}">Save</button>
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="fmc-panel">
        <h2>Abilities</h2>
        <div class="fmc-list">${rows}</div>
      </section>
    `;
  }

  renderSkills() {
    const skills = this.selectedActor.system?.skills ?? {};
    const grouped = groupBy(Object.entries(skills), ([, skill]) => skill.ability || "int");
    const abilityOrder = ["str", "dex", "con", "int", "wis", "cha"];
    const rows = abilityOrder.map((ability) => {
      const entries = grouped[ability] ?? [];
      if (!entries.length) return "";

      return `
        <section class="fmc-skill-group">
          <header>
            <i class="${ABILITY_ICONS[ability] ?? "fa-solid fa-circle"}"></i>
            <strong>${escapeHtml(abilityLabelFor(ability))}</strong>
          </header>
          <div>
            ${entries.map(([key, skill]) => `
              <div class="fmc-skill-pill-wrap">
                <button type="button" class="fmc-skill-pill" data-roll="skill" data-skill="${key}">
                  <span>${escapeHtml(skillLabelFor(key))}</span>
                  <strong>${formatSigned(skill.total ?? skill.mod ?? 0)}</strong>
                </button>
                <button type="button" class="fmc-favorite-toggle ${this.isFavoriteSkill(key) ? "active" : ""}" data-action="toggle-favorite-skill" data-skill="${key}" aria-label="Favorite ${escapeAttribute(skillLabelFor(key))}">
                  <i class="fa-solid fa-star"></i>
                </button>
              </div>
            `).join("")}
          </div>
        </section>
      `;
    }).join("");

    return `
      <section class="fmc-panel">
        <h2>Skills</h2>
        <div class="fmc-skill-groups">${rows}</div>
      </section>
    `;
  }

  renderResources() {
    const resources = this.selectedActor.system?.resources ?? {};
    const rows = Object.entries(resources)
      .filter(([, value]) => value && typeof value === "object")
      .map(([key, value]) => `
        <article class="fmc-row fmc-row-edit">
          <div>
            <strong>${escapeHtml(value.label || key)}</strong>
            <span>Resource</span>
          </div>
          ${this.renderNumberInput("Value", `system.resources.${key}.value`, value.value, this.canEditSelectedActor)}
          ${this.renderNumberInput("Max", `system.resources.${key}.max`, value.max, this.canEditSelectedActor)}
        </article>
      `).join("");

    if (!rows) return "";

    return `
      <section class="fmc-panel">
        <h2>Resources</h2>
        <div class="fmc-list">${rows}</div>
      </section>
    `;
  }

  renderCurrency() {
    const currency = this.selectedActor.system?.currency ?? {};
    const rows = Object.entries(currency).map(([key, value]) => this.renderNumberInput(key.toUpperCase(), `system.currency.${key}`, value, this.canEditSelectedActor)).join("");
    if (!rows) return "";

    return `
      <section class="fmc-panel">
        <h2>Currency</h2>
        <div class="fmc-field-row">${rows}</div>
      </section>
    `;
  }

  renderSpells() {
    const actor = this.selectedActor;
    const spells = actor.items.filter((item) => item.type === "spell");
    const grouped = groupBy(spells, (item) => String(item.system?.level ?? 0));
    const slots = actor.system?.spells ?? {};

    return `
      <section class="fmc-stack fmc-spells-tab">
        ${this.renderSpellSlots(slots)}
        ${Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([level, items]) => this.renderItemGroup(level === "0" ? "Cantrips" : `Level ${level}`, items, "spell"))
          .join("") || this.renderEmptyState("No spells", "This actor has no spell items.")}
      </section>
    `;
  }

  renderFavorites() {
    const items = this.getFavoriteItems();
    const skills = this.getFavoriteSkills();
    const gearItems = items.filter((item) => item.type !== "spell" && !FEATURE_TYPES.has(item.type));
    const spells = items.filter((item) => item.type === "spell");
    const features = items.filter((item) => FEATURE_TYPES.has(item.type));
    const gearRows = gearItems.map((item) => this.renderItemRow(item, item.type === "weapon" ? "favorite-weapon" : "favorite-gear")).join("");
    const spellRows = spells.map((item) => this.renderItemRow(item, "favorite-spell")).join("");
    const featureRows = features.map((item) => this.renderItemRow(item, "favorite-feature")).join("");
    const skillRows = skills.map(([key, skill]) => this.renderFavoriteSkillRow(key, skill)).join("");

    if (!gearRows && !spellRows && !featureRows && !skillRows) {
      return this.renderEmptyState("No favorites", "Add spells, weapons, features, and skills with the star button.");
    }

    return `
      <section class="fmc-stack">
        ${gearRows ? `
          <section class="fmc-panel">
            <h2>Weapons & Items</h2>
            <div class="fmc-list">${gearRows}</div>
          </section>
        ` : ""}
        ${spellRows ? `
          <section class="fmc-panel">
            <h2>Spells</h2>
            ${this.renderSpellSlots(this.selectedActor.system?.spells ?? {})}
            <div class="fmc-list">${spellRows}</div>
          </section>
        ` : ""}
        ${featureRows || skillRows ? `
          <section class="fmc-panel">
            <h2>Skills & Features</h2>
            <div class="fmc-list">${skillRows}${featureRows}</div>
          </section>
        ` : ""}
      </section>
    `;
  }

  renderFavoriteSkillRow(key, skill) {
    const ability = skill.ability || "int";
    return `
      <article class="fmc-row fmc-favorite-skill-row">
        <div>
          <strong>${escapeHtml(skillLabelFor(key))}</strong>
          <span>${escapeHtml(abilityLabelFor(ability))}</span>
        </div>
        <div class="fmc-actions">
          <button type="button" class="fmc-favorite-toggle active" data-action="toggle-favorite-skill" data-skill="${key}" aria-label="Remove favorite">
            <i class="fa-solid fa-star"></i>
          </button>
          <button type="button" data-roll="skill" data-skill="${key}">${formatSigned(skill.total ?? skill.mod ?? 0)}</button>
        </div>
      </article>
    `;
  }

  renderSpellSlots(slots) {
    const rows = Object.entries(slots)
      .filter(([key, value]) => /^spell[1-9]$/.test(key) && value && typeof value === "object")
      .filter(([, value]) => Number(value.max ?? 0) > 0 || Number(value.value ?? 0) > 0)
      .sort(([a], [b]) => Number(a.replace("spell", "")) - Number(b.replace("spell", "")))
      .map(([key, value]) => {
        const level = key.replace("spell", "");
        const current = value.value ?? 0;
        const max = value.max ?? 0;
        return `
          <button type="button" class="fmc-slot-pill" data-action="edit-spell-slot" data-slot="${key}" ${this.canEditSelectedActor ? "" : "disabled"}>
            <span>L${escapeHtml(level)}</span>
            <strong>${escapeHtml(current)}/${escapeHtml(max)}</strong>
          </button>
        `;
      }).join("");

    if (!rows) return "";

    return `
      <section class="fmc-spell-slots-bar" aria-label="Spell slots">
        <span>Slots</span>
        <div>${rows}</div>
      </section>
    `;
  }

  renderInventory() {
    const items = this.selectedActor.items.filter((item) => INVENTORY_TYPES.has(item.type));
    const grouped = groupBy(items, (item) => item.type);
    const groups = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, groupItems]) => this.renderItemGroup(titleCase(type), groupItems, "inventory"))
      .join("");

    return `
      <section class="fmc-stack fmc-inventory-tab">
        ${this.renderCurrencyBar()}
        ${groups || this.renderEmptyState("No inventory", "This actor has no inventory items.")}
      </section>
    `;
  }

  renderCurrencyBar() {
    const currency = this.selectedActor.system?.currency ?? {};
    const order = ["pp", "gp", "ep", "sp", "cp"];
    const rows = order
      .filter((key) => currency[key] !== undefined)
      .map((key) => `
        <label class="fmc-coin-pill editable">
          <small>${key.toUpperCase()}</small>
          <input type="number" inputmode="numeric" value="${escapeAttribute(currency[key] ?? 0)}" data-update-path="system.currency.${key}" ${this.canEditSelectedActor ? "" : "disabled"}>
        </label>
      `).join("");

    if (!rows) return "";

    return `
      <section class="fmc-currency-bar" aria-label="Currency">
        <span>Coins</span>
        <div>${rows}</div>
      </section>
    `;
  }

  renderFeatures() {
    const items = this.selectedActor.items.filter((item) => FEATURE_TYPES.has(item.type));
    const grouped = groupBy(items, (item) => item.type);
    const groups = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, groupItems]) => this.renderItemGroup(titleCase(type), groupItems, "feature"))
      .join("");

    return `<section class="fmc-stack">${groups || this.renderEmptyState("No features", "This actor has no feature items.")}</section>`;
  }

  renderItemGroup(title, items, mode) {
    const rows = items.map((item) => this.renderItemRow(item, mode)).join("");
    return `
      <section class="fmc-panel">
        <h2>${escapeHtml(title)}</h2>
        <div class="fmc-list">${rows}</div>
      </section>
    `;
  }

  renderItemRow(item, mode) {
    const quantity = item.system?.quantity;
    const equipped = item.system?.equipped;
    const attuned = item.system?.attuned;
    const prepared = item.system?.preparation?.prepared;
    const uses = item.system?.uses;
    const showQuantity = !["spell", "favorite-spell", "favorite-weapon"].includes(mode) && quantity !== undefined;
    const showUses = !["spell", "favorite-spell", "favorite-weapon"].includes(mode) && uses?.value !== undefined;
    const showEquipped = !["spell", "favorite-spell", "favorite-weapon"].includes(mode) && equipped !== undefined;
    const showAttuned = !["spell", "favorite-spell", "favorite-weapon"].includes(mode) && attuned !== undefined;

    return `
      <article class="fmc-row fmc-item-row fmc-${escapeAttribute(mode)}-row">
        <div class="fmc-item-main">
          <button type="button" class="fmc-item-summary" data-action="open-item-modal" data-item-id="${item.id}">
            <img src="${escapeAttribute(item.img)}" alt="">
            <span>
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(this.itemSubtitle(item))}</small>
            </span>
          </button>
          ${mode === "inventory" ? `
            <button type="button" class="fmc-favorite-toggle ${this.isFavoriteItem(item.id) ? "active" : ""}" data-action="toggle-favorite-item" data-item-id="${item.id}" aria-label="Favorite ${escapeAttribute(item.name)}">
              <i class="fa-solid fa-star"></i>
            </button>
          ` : ""}
        </div>
        <div class="fmc-actions">
          ${showQuantity ? this.renderMetric("Qty", quantity) : ""}
          ${showUses ? this.renderMetric("Uses", uses.value) : ""}
          ${showEquipped ? this.renderMetric("Equipped", equipped ? "Yes" : "No") : ""}
          ${showAttuned ? this.renderMetric("Attuned", attuned ? "Yes" : "No") : ""}
          <button type="button" class="fmc-use-row" data-action="use-item" data-item-id="${item.id}">Use</button>
          ${mode !== "inventory" ? `
            <button type="button" class="fmc-favorite-toggle ${this.isFavoriteItem(item.id) ? "active" : ""}" data-action="toggle-favorite-item" data-item-id="${item.id}" aria-label="Favorite ${escapeAttribute(item.name)}">
              <i class="fa-solid fa-star"></i>
            </button>
          ` : ""}
        </div>
      </article>
    `;
  }

  renderCombat() {
    const combat = game.combat;
    if (!combat) return this.renderEmptyState("No active combat", "The combat tracker is currently empty.");

    const combatants = combat.turns ?? Array.from(combat.combatants ?? []);
    const rows = combatants.map((combatant, index) => {
      const actor = combatant.actor;
      const owned = actor?.isOwner ?? actor?.testUserPermission?.(game.user, "OWNER");
      const active = combat.turn === index;
      const hidden = combatant.hidden && !game.user.isGM;
      if (hidden) return "";

      return `
        <article class="fmc-combatant ${active ? "active" : ""} ${owned ? "owned" : ""}">
          <img src="${escapeAttribute(combatant.img || actor?.img || "icons/svg/mystery-man.svg")}" alt="">
          <div>
            <strong>${escapeHtml(combatant.name)}</strong>
            <span>${owned ? "Owned" : "Visible"}</span>
          </div>
          <div class="fmc-initiative">
            ${combatant.initiative ?? "-"}
          </div>
          ${owned && combatant.initiative == null ? `<button type="button" data-action="roll-initiative" data-combatant-id="${combatant.id}">Roll</button>` : ""}
        </article>
      `;
    }).join("");

    const current = combat.combatant;
    const canEndTurn = current?.actor?.testUserPermission?.(game.user, "OWNER") ?? false;

    return `
      <section class="fmc-stack">
        <section class="fmc-panel">
          <h2>Encounter</h2>
          <div class="fmc-list">${rows || "<p>No visible combatants.</p>"}</div>
        </section>
        <section class="fmc-panel">
          <button class="fmc-primary" type="button" data-action="end-turn" ${canEndTurn ? "" : "disabled"}>End Turn</button>
        </section>
      </section>
    `;
  }

  renderAudio() {
    const channels = [
      { id: "music", label: "Music", icon: "fa-solid fa-volume-high", setting: "globalPlaylistVolume" },
      { id: "environment", label: "Environment", icon: "fa-solid fa-cloud-sun", setting: "globalAmbientVolume" },
      { id: "interface", label: "Interface", icon: "fa-solid fa-computer-mouse", setting: "globalInterfaceVolume" }
    ];
    const playing = this.getPlayingAudioLabels();

    return `
      <section class="fmc-stack">
        <section class="fmc-panel">
          <h2>Audio</h2>
          <div class="fmc-audio-mixer">
            ${channels.map((channel) => {
              const value = this.getAudioVolume(channel.setting);
              return `
                <label class="fmc-audio-channel">
                  <span>${escapeHtml(channel.label)}</span>
                  <button type="button" data-action="mute-audio-channel" data-setting="${channel.setting}" aria-label="Mute ${escapeAttribute(channel.label)}">
                    <i class="${channel.icon}"></i>
                  </button>
                  <input type="range" min="0" max="1" step="0.01" value="${escapeAttribute(value)}" data-audio-setting="${channel.setting}">
                  <strong>${Math.round(value * 100)}%</strong>
                </label>
              `;
            }).join("")}
          </div>
        </section>
        <section class="fmc-panel">
          <h2>Now Playing</h2>
          <div class="fmc-list">${playing.map((label) => `<p>${escapeHtml(label)}</p>`).join("") || "<p>No active playlist sounds.</p>"}</div>
        </section>
      </section>
    `;
  }

  renderJournal() {
    const entries = game.journal
      .filter((entry) => entry.visible ?? entry.testUserPermission(game.user, "OBSERVER"))
      .filter((entry) => !this.isHiddenJournalEntry(entry))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!entries.length) return this.renderEmptyState("No journal entries", "No readable journal entries are available.");

    return `
      <section class="fmc-stack">
        <section class="fmc-panel">
          <h2>Journal</h2>
          <div class="fmc-list">
            ${entries.map((entry) => `
              <article class="fmc-row">
                <div>
                  <strong>${escapeHtml(entry.name)}</strong>
                  <span>${escapeHtml(this.journalSubtitle(entry))}</span>
                </div>
                <button type="button" data-action="open-journal-entry" data-journal-id="${entry.id}">Open</button>
              </article>
            `).join("")}
          </div>
        </section>
      </section>
    `;
  }

  renderChat() {
    const messages = game.messages.contents
      .filter((message) => message.visible ?? true)
      .slice(-40);

    return `
      <section class="fmc-chat-tab">
        <div class="fmc-chat-messages">
          ${messages.map((message) => this.renderChatMessage(message)).join("") || this.renderEmptyState("No messages", "Chat messages will appear here.")}
        </div>
        <button type="button" class="fmc-chat-jump hidden" data-action="scroll-chat-bottom" aria-label="Scroll to newest message">
          <i class="fa-solid fa-arrow-down"></i>
        </button>
        <form class="fmc-chat-compose" data-action="send-chat">
          <button type="button" class="fmc-chat-dice-toggle" data-action="toggle-chat-dice" aria-label="Dice roller">
            <i class="fa-solid fa-dice-d20"></i>
          </button>
          <input type="text" name="message" autocomplete="off" placeholder="Message">
          <button type="submit" aria-label="Send">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
        ${this.chatDiceMenuOpen ? this.renderChatDiceMenu() : ""}
      </section>
    `;
  }

  renderChatDiceMenu() {
    const dice = [4, 6, 8, 10, 12, 20, 100];
    return `
      <div class="fmc-dice-popover">
        <div class="fmc-dice-window">
          <header>
            <input type="text" name="diceFormula" value="" placeholder="1d20+2" autocomplete="off" spellcheck="false" aria-label="Roll formula">
            <button type="button" data-action="close-chat-dice" aria-label="Close dice roller">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="fmc-dice-grid">
            ${dice.map((faces) => `
              <button type="button" data-action="append-chat-die" data-die="d${faces}">
                <i class="fa-solid fa-dice-d20"></i>
                <span>d${faces}</span>
              </button>
            `).join("")}
          </div>
          <div class="fmc-dice-controls">
            <button type="button" data-action="adjust-chat-bonus" data-delta="-1">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="fmc-dice-bonus-display" aria-label="Flat modifier">+0</span>
            <button type="button" data-action="adjust-chat-bonus" data-delta="1">
              <i class="fa-solid fa-plus"></i>
            </button>
            <button type="button" data-action="set-chat-advantage" data-mode="advantage">Adv</button>
            <button type="button" data-action="set-chat-advantage" data-mode="disadvantage">Dis</button>
            <button type="button" class="fmc-dice-roll" data-action="roll-dice-popover">Roll</button>
          </div>
        </div>
      </div>
    `;
  }

  renderChatMessage(message) {
    const speaker = message.speaker?.alias || message.user?.name || "Chat";
    const info = this.getChatMessageInfo(message, speaker);
    const expanded = this.expandedChatMessages.has(message.id);
    const prepared = this.prepareChatContent(String(message.content ?? ""));
    const tokenbar = this.prepareTokenBarChatCard(String(message.content ?? ""), message);
    const shouldCollapse = !tokenbar && (prepared.content.length > 360 || /<img|<table|dnd5e2|card|description|details/i.test(prepared.content));
    const rolls = !tokenbar && message.rolls?.length ? `
      <div class="fmc-chat-rolls">
        ${message.rolls.map((roll) => `<span>${escapeHtml(roll.formula)} = <strong>${escapeHtml(roll.total)}</strong></span>`).join("")}
      </div>
    ` : "";

    return `
      <article class="fmc-chat-message ${expanded ? "expanded" : ""} ${tokenbar ? "tokenbar" : ""}" data-message-id="${message.id}">
        <header>
          <div class="fmc-chat-heading">
            <strong>${escapeHtml(info.title)}</strong>
            ${info.subtitle ? `<small>${escapeHtml(info.subtitle)}</small>` : ""}
          </div>
          <span>${escapeHtml(message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "")}</span>
        </header>
        ${tokenbar ? tokenbar : `<div class="fmc-chat-content ${shouldCollapse && !expanded ? "collapsed" : ""}">${prepared.content}</div>`}
        ${shouldCollapse ? `<button type="button" class="fmc-chat-expand" data-action="toggle-chat-message" data-message-id="${message.id}">${expanded ? "Collapse" : "Expand"}</button>` : ""}
        ${prepared.actions ? `<div class="fmc-chat-actions">${prepared.actions}</div>` : ""}
        ${rolls}
      </article>
    `;
  }

  getChatMessageInfo(message, speaker) {
    const flavor = htmlToText(message.flavor);
    const rollLabel = this.getDnd5eRollLabel(message);
    const contentTitle = this.getChatContentTitle(message.content);
    const title = flavor || rollLabel || contentTitle || speaker;
    const subtitle = title !== speaker ? speaker : "";
    return { title, subtitle };
  }

  getDnd5eRollLabel(message) {
    const roll = getPropertyValue(message, "flags.dnd5e.roll") ?? {};
    const type = roll.type;
    const ability = roll.ability ? localizeDnd5eLabel(CONFIG.DND5E?.abilities?.[roll.ability]?.label) : "";
    const skill = roll.skill ? localizeDnd5eLabel(CONFIG.DND5E?.skills?.[roll.skill]?.label) : "";

    if (type === "skill" && skill) return ability ? `${ability} (${skill}) Check` : `${skill} Check`;
    if (type === "ability" && ability) return `${ability} Check`;
    if (type === "save" && ability) return `${ability} Save`;
    if (type === "attack") return "Attack Roll";
    if (type === "damage") return "Damage Roll";
    return "";
  }

  getChatContentTitle(content) {
    const template = document.createElement("template");
    template.innerHTML = String(content ?? "");
    const title = template.content.querySelector(".card-title, .item-name, h2, h3, h4, header strong, .name");
    return htmlToText(title?.textContent);
  }

  prepareChatContent(content) {
    const template = document.createElement("template");
    template.innerHTML = content;
    const isTokenBar = this.isTokenBarContent(template.content);

    const actionElements = uniqueElements([
      ...Array.from(template.content.querySelectorAll("button, [role='button'], a[data-action]")),
      ...this.getTokenBarActionElements(template.content)
    ]).filter((element) => !element.closest(".fmc-chat-expand"));
    for (const element of actionElements.filter((element) => this.isSuppressedChatAction(element))) {
      this.removeChatActionElement(element);
    }

    const extractedActions = actionElements
      .filter((element) => element.parentElement && this.isExtractableChatAction(element))
      .filter((element) => !isTokenBar || !element.closest(".actor, .token, .request-token, .roll-row, li, tr"));
    const allTokenBarActions = this.getTokenBarActionElements(template.content);
    const actions = extractedActions.map((element) => this.renderChatActionElement(element, allTokenBarActions.indexOf(element), "fmc-chat-card-action"));

    for (const element of extractedActions) this.removeChatActionElement(element);

    return {
      content: template.innerHTML,
      actions: actions.join("")
    };
  }

  prepareTokenBarChatCard(content, message = null) {
    const template = document.createElement("template");
    template.innerHTML = content;
    const text = htmlToText(template.content.textContent);
    const isTokenBar = this.isTokenBarContent(template.content);
    if (!isTokenBar) return "";

    const title = htmlToText(template.content.querySelector("h2, h3, h4, .card-title, .title")?.textContent) ||
      (/(contested roll)/i.test(text) ? "Contested Roll" : "Roll Request");
    const matchup = htmlToText(template.content.querySelector(".request, .roll-request, .contested, .details, p")?.textContent) ||
      (text.match(/(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Sleight of Hand|Stealth|Survival).+?(?:Check|Save)/i)?.[0] ?? "");
    const rollRequest = this.parseTokenBarRollRequest(matchup || text);
    const rollTotal = message?.rolls?.length ? String(message.rolls[message.rolls.length - 1]?.total ?? "") : "";
    const actions = this.getTokenBarActionElements(template.content);
    const actors = this.extractTokenBarActors(template.content, rollTotal, actions, rollRequest, message);
    const actorResults = this.decorateTokenBarActorResults(actors, template.content, message, rollRequest);
    const result = this.extractTokenBarResult(template.content) || rollTotal;

    return `
      <div class="fmc-tokenbar-card">
        <strong>${escapeHtml(title)}</strong>
        ${matchup ? `<span class="fmc-tokenbar-matchup">${escapeHtml(matchup)}</span>` : ""}
        ${actors.length ? `
          <div class="fmc-tokenbar-actors">
            ${actorResults.map((actor) => `
              <div class="fmc-tokenbar-actor ${actor.outcome ? `fmc-tokenbar-${actor.outcome}` : ""}">
                ${actor.img ? `<img src="${escapeAttribute(actor.img)}" alt="">` : `<i class="fa-solid fa-user"></i>`}
                <span>${escapeHtml(actor.name)}</span>
                ${actor.result ? `<b>${actor.outcome ? `<i class="fa-solid ${actor.outcome === "success" ? "fa-check" : "fa-xmark"}"></i>` : ""}${escapeHtml(actor.result)}</b>` : actor.action}
                ${actor.formula ? `<small>${escapeHtml(actor.formula)}</small>` : ""}
              </div>
            `).join("")}
          </div>
        ` : result ? `<div class="fmc-tokenbar-result">${escapeHtml(result)}</div>` : ""}
      </div>
    `;
  }

  isTokenBarContent(root) {
    const text = htmlToText(root.textContent);
    return Boolean(root.querySelector(".monks-tokenbar, .monks-tokenbar-card, .request-roll, .contested-roll")) ||
      /contested roll|saving throw|ability check|skill check/i.test(text) && Boolean(root.querySelector("button, [role='button'], a, .roll, .rollable, .roll-button, .dice, .dice-icon"));
  }

  getTokenBarActionElements(root) {
    const selectors = [
      ".monks-tokenbar button",
      ".monks-tokenbar [role='button']",
      ".monks-tokenbar a",
      ".monks-tokenbar .roll",
      ".monks-tokenbar .rollable",
      ".monks-tokenbar .roll-button",
      ".monks-tokenbar .dice-roll",
      ".monks-tokenbar .dice",
      ".monks-tokenbar .dice-icon",
      ".monks-tokenbar .roll-icon",
      ".monks-tokenbar [data-request-id]",
      ".monks-tokenbar .actor.rollable",
      ".monks-tokenbar .token.rollable",
      ".monks-tokenbar .request-token.rollable",
      ".monks-tokenbar-card button",
      ".monks-tokenbar-card [role='button']",
      ".monks-tokenbar-card a",
      ".monks-tokenbar-card .roll",
      ".monks-tokenbar-card .rollable",
      ".monks-tokenbar-card .dice-roll",
      ".request-roll button",
      ".request-roll [role='button']",
      ".request-roll a",
      ".request-roll .roll",
      ".request-roll .rollable",
      ".request-roll .dice-roll",
      ".contested-roll button",
      ".contested-roll [role='button']",
      ".contested-roll a",
      ".contested-roll .roll",
      ".contested-roll .rollable",
      ".contested-roll .dice-roll"
    ].join(", ");
    return uniqueElements(Array.from(root.querySelectorAll(selectors)).map((element) => (
      element.closest("button, a, [role='button'], .roll, .rollable, .roll-button, [data-request-id]") ?? element
    ))).filter((element) => this.isTokenBarActionElement(element));
  }

  isTokenBarActionElement(element) {
    if (!element || this.isSuppressedChatAction(element)) return false;
    if (!element.closest(".monks-tokenbar, .monks-tokenbar-card, .request-roll, .contested-roll")) return false;
    const label = htmlToText(element.textContent);
    if (/actors|public roll/i.test(label)) return false;
    return element.matches("button, a, [role='button'], .roll, .rollable, .roll-button, .dice-roll, [data-request-id]") ||
      Boolean(element.dataset?.action || element.dataset?.requestId || element.dataset?.tokenId || element.dataset?.actorId);
  }

  renderChatActionElement(element, sourceIndex = -1, className = "") {
    const clone = element.cloneNode(true);
    clone.classList.add(...className.split(" ").filter(Boolean));
    if (sourceIndex >= 0) clone.dataset.sourceIndex = String(sourceIndex);
    if (className.includes("fmc-tokenbar-roll")) {
      clone.innerHTML = `<i class="fa-solid fa-dice-d20"></i>`;
      clone.setAttribute("aria-label", clone.getAttribute("aria-label") || "Roll");
    } else if (!htmlToText(clone.textContent) && !clone.querySelector("i, svg, img")) {
      clone.innerHTML = `<i class="fa-solid fa-dice-d20"></i>`;
    }
    if (!clone.matches("button, a, [role='button']")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = clone.className;
      for (const [key, value] of Object.entries(clone.dataset ?? {})) button.dataset[key] = value;
      for (const attr of clone.getAttributeNames()) {
        if (attr === "class" || attr.startsWith("data-")) continue;
        button.setAttribute(attr, clone.getAttribute(attr));
      }
      button.innerHTML = className.includes("fmc-tokenbar-roll") ? `<i class="fa-solid fa-dice-d20"></i>` : clone.innerHTML || `<i class="fa-solid fa-dice-d20"></i>`;
      return button.outerHTML;
    }
    return clone.outerHTML;
  }

  extractTokenBarActors(root, fallbackResult = "", actions = [], rollRequest = null, message = null) {
    const rows = Array.from(root.querySelectorAll(".actor, .token, .request-token, .roll-row, li, tr"))
      .map((row) => {
        const actionElement = actions.find((element) => element === row || row.contains(element));
        const rowText = htmlToText(row.textContent);
        const rawResult = htmlToText(row.querySelector(".result, .roll-result, .total, input[value]")?.getAttribute?.("value") || row.querySelector(".result, .roll-result, .total")?.textContent || "");
        const parsedResult = rawResult.match(/\d+/)?.[0] ?? rowText.match(/\b(\d+)\s*(?:…|\.{3})?\s*$/)?.[1] ?? "";
        const name = this.cleanTokenBarActorName(row.querySelector(".name, .actor-name, .token-name, h4, label")?.textContent || rowText, parsedResult)
          .replace(/\s{2,}/g, " ")
          .trim();
        const img = row.querySelector("img")?.getAttribute("src") || "";
        if (!name || /^\d+$/.test(name) || name === parsedResult || /actors|public roll|contested roll/i.test(name)) return null;
        const actor = this.resolveTokenBarActor(name, message);
        const tokenEntry = actor ? this.getMonksTokenBarEntryForActor(message, actor, name) : this.getMonksTokenBarEntryByName(message, name);
        const formula = this.getTokenBarRollFormula(rowText, parsedResult, rollRequest, actor, tokenEntry);
        const outcome = this.getTokenBarOutcome(row, tokenEntry);
        return {
          name,
          img,
          result: parsedResult,
          total: parsedResult ? Number(parsedResult) : null,
          formula,
          outcome,
          action: this.renderTokenBarRollButton(name, rollRequest, actionElement ? actions.indexOf(actionElement) : -1, actor, tokenEntry?.id)
        };
      })
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    for (const row of rows) {
      const key = `${row.name}:${row.result}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }
    if (fallbackResult && unique.length && !unique.some((row) => row.result)) {
      unique[unique.length - 1].result = fallbackResult;
    }
    return unique.slice(0, 6);
  }

  decorateTokenBarActorResults(actors, root, message, rollRequest) {
    if (actors.some((actor) => actor.outcome)) return actors;

    const dc = this.getTokenBarDc(root, message);
    const numeric = actors
      .map((actor) => ({ actor, total: Number(actor.total ?? actor.result) }))
      .filter((entry) => Number.isFinite(entry.total));

    if (Number.isFinite(dc)) {
      return actors.map((actor) => {
        const total = Number(actor.total ?? actor.result);
        return Number.isFinite(total) ? { ...actor, outcome: total >= dc ? "success" : "failure" } : actor;
      });
    }

    const type = message?.getFlag?.("monks-tokenbar", "what") ?? "";
    const isContest = type === "contestedroll" || /contested roll/i.test(htmlToText(root.textContent));
    if (!isContest || numeric.length < 2) return actors;

    const totals = numeric.map((entry) => entry.total);
    const max = Math.max(...totals);
    const winners = numeric.filter((entry) => entry.total === max);
    if (winners.length !== 1) return actors;

    return actors.map((actor) => {
      const total = Number(actor.total ?? actor.result);
      if (!Number.isFinite(total)) return actor;
      return { ...actor, outcome: total === max ? "success" : "failure" };
    });
  }

  getTokenBarOutcome(row, tokenEntry) {
    const flagOutcome = this.getTokenBarFlagOutcome(tokenEntry?.data);
    if (flagOutcome) return flagOutcome;

    const explicit = row.querySelector(".success, .succeeded, .passed, .pass, .failure, .failed, .fail, .fa-check, .fa-check-circle, .fa-xmark, .fa-times, .fa-times-circle, [data-success], [data-passed], [data-failed], [data-outcome], [data-state], [data-result]");
    const classText = [
      row.className,
      explicit?.className,
      explicit ? Array.from(explicit.attributes ?? []).map((attr) => `${attr.name}=${attr.value}`).join(" ") : ""
    ].join(" ");

    const rowText = htmlToText(row.textContent);
    const combined = `${classText} ${rowText}`;
    if (/\b(success|succeeded|passed|pass|win|winner)\b/i.test(combined) || /fa-(?:check|check-circle)/i.test(combined)) return "success";
    if (/\b(failure|failed|fail|lose|loser)\b/i.test(combined) || /fa-(?:xmark|times|times-circle)/i.test(combined)) return "failure";
    return "";
  }

  getTokenBarFlagOutcome(data) {
    if (!data || typeof data !== "object") return "";

    const directKeys = ["passed", "success", "succeeded", "failed", "failure", "fail", "outcome", "state", "result"];
    for (const key of directKeys) {
      if (!(key in data)) continue;
      const value = data[key];
      if (typeof value === "boolean") {
        if (/fail/i.test(key)) return value ? "failure" : "";
        return value ? "success" : "failure";
      }
      const text = String(value ?? "");
      if (/success|succeeded|passed|pass|win|winner/i.test(text)) return "success";
      if (/failure|failed|fail|lose|loser/i.test(text)) return "failure";
    }

    for (const value of Object.values(data)) {
      if (!value || typeof value !== "object") continue;
      const nested = this.getTokenBarFlagOutcome(value);
      if (nested) return nested;
    }

    return "";
  }

  getTokenBarDc(root, message) {
    const text = htmlToText(root.textContent);
    const textDc = text.match(/\b(?:group\s*)?dc\s*:?\s*(\d+)\b/i)?.[1] ??
      text.match(/\bdifficulty\s*:?\s*(\d+)\b/i)?.[1];
    if (textDc) return Number(textDc);

    const flagDc = findNumberByKey(message?.flags?.["monks-tokenbar"], /^(?:dc|difficulty|target)$/i);
    return Number.isFinite(flagDc) ? flagDc : null;
  }

  getTokenBarRollFormula(rowText, result, rollRequest, actor, tokenEntry) {
    const roll = this.getTokenBarEntryRoll(tokenEntry);
    if (roll) return formatRollSummary(roll);

    const parsed = parseRollSummaryText(rowText);
    if (parsed) return parsed;

    const total = Number(result);
    if (!Number.isFinite(total) || !rollRequest || !actor) return "";

    const previousActorId = this.selectedActorId;
    this.selectedActorId = actor.id;
    try {
      const context = this.getRollContext(rollRequest.kind, rollRequest);
      const modifier = Number(context.modifier);
      if (!Number.isFinite(modifier)) return "";
      const die = total - modifier;
      if (!Number.isFinite(die)) return "";
      return `${die}${modifier ? formatCompactSigned(modifier) : ""}=${total}`;
    } finally {
      this.selectedActorId = previousActorId;
    }
  }

  getTokenBarEntryRoll(tokenEntry) {
    const data = tokenEntry?.data;
    const rollData = data?.roll ?? data?.rolls?.[0] ?? data?.result?.roll ?? data?.results?.[0]?.roll;
    if (!rollData) return null;

    try {
      if (rollData instanceof Roll) return rollData;
      return Roll.fromData ? Roll.fromData(rollData) : null;
    } catch (error) {
      return null;
    }
  }

  renderTokenBarRollButton(actorName, rollRequest, sourceIndex = -1, resolvedActor = null, tokenId = "") {
    if (!rollRequest) return sourceIndex >= 0 ? this.renderTokenBarSourceButton(sourceIndex) : "";
    const actor = resolvedActor ?? this.resolveTokenBarActor(actorName);
    const canRoll = actor?.testUserPermission?.(game.user, "OWNER") ?? false;
    if (!canRoll) return "";

    const dataset = [
      `data-action="tokenbar-mobile-roll"`,
      `data-tokenbar-kind="${escapeAttribute(rollRequest.kind)}"`,
      rollRequest.ability ? `data-ability="${escapeAttribute(rollRequest.ability)}"` : "",
      rollRequest.skill ? `data-skill="${escapeAttribute(rollRequest.skill)}"` : "",
      `data-actor-id="${escapeAttribute(actor.id)}"`,
      tokenId ? `data-tokenbar-token-id="${escapeAttribute(tokenId)}"` : "",
      sourceIndex >= 0 ? `data-source-index="${sourceIndex}"` : ""
    ].filter(Boolean).join(" ");

    return `
      <button type="button" class="fmc-tokenbar-roll" ${dataset} aria-label="Roll ${escapeAttribute(rollRequest.label)}">
        <i class="fa-solid fa-dice-d20"></i>
      </button>
    `;
  }

  renderTokenBarSourceButton(sourceIndex) {
    return `
      <button type="button" class="fmc-tokenbar-roll" data-action="tokenbar-mobile-roll" data-source-index="${sourceIndex}" aria-label="Roll">
        <i class="fa-solid fa-dice-d20"></i>
      </button>
    `;
  }

  parseTokenBarRollRequest(text) {
    return this.parseTokenBarRollRequests(text)[0] ?? null;
  }

  parseTokenBarRollRequests(text) {
    const matches = findDnd5eRollRequestMatches(htmlToText(text));
    if (matches.length) return matches;

    const value = htmlToText(text).toLowerCase();
    const ability = findDnd5eAbilityKey(value);
    const skill = findDnd5eSkillKey(value);

    if (skill) return [{ kind: "skill", skill, label: `${skillLabelFor(skill)} Check` }];
    if (ability && /sav|saving throw/.test(value)) return [{ kind: "save", ability, label: `${abilityLabelFor(ability)} Save` }];
    if (ability) return [{ kind: "ability", ability, label: `${abilityLabelFor(ability)} Check` }];
    return [];
  }

  openTokenBarRollChoiceDialog(choices) {
    this.closeModal();

    this.modal = document.createElement("div");
    this.modal.className = "fmc-modal-backdrop fmc-roll-backdrop";
    this.modal.innerHTML = `
      <form class="fmc-modal-card fmc-roll-card fmc-roll-choice-card">
        <header>
          <h2>Please pick a roll</h2>
          <button type="button" class="fmc-icon-button" data-modal-action="close" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="fmc-modal-body fmc-roll-choice-list">
          ${choices.map((choice, index) => {
            const context = this.getRollContext(choice.kind, choice);
            return `
              <button type="button" data-roll-choice-index="${index}">
                ${escapeHtml(choice.label)} <span>(${escapeHtml(formatSigned(context.modifier))})</span>
              </button>
            `;
          }).join("")}
        </div>
      </form>
    `;

    this.shell.appendChild(this.modal);

    return new Promise((resolve) => {
      const finish = (value) => {
        this.closeModal();
        resolve(value);
      };

      this.modal.addEventListener("click", (event) => {
        const close = event.target.closest("[data-modal-action='close']");
        if (close) {
          event.preventDefault();
          event.stopPropagation();
          finish(null);
          return;
        }

        const choiceButton = event.target.closest("[data-roll-choice-index]");
        if (!choiceButton) return;

        event.preventDefault();
        event.stopPropagation();
        finish(choices[Number(choiceButton.dataset.rollChoiceIndex)] ?? null);
      });
    });
  }

  resolveTokenBarActor(actorName, message = null) {
    const name = htmlToText(actorName);
    if (this.selectedActor && (!name || this.selectedActor.name === name)) return this.selectedActor;
    const tokenEntry = this.getMonksTokenBarEntryByName(message, name);
    if (tokenEntry?.data?.actorid) return game.actors.get(tokenEntry.data.actorid) ?? null;
    return game.actors.find((actor) => actor.name === name && actor.testUserPermission?.(game.user, "OWNER")) ?? null;
  }

  cleanTokenBarActorName(value, result = "") {
    let text = htmlToText(value).replace(/\s+/g, " ").trim();
    text = text.replace(/\b\d+d\d+\b.*$/i, "").replace(/\s+\d+\s*(?:…|\.{3})?\s*$/g, "").trim();
    if (result) text = text.replace(new RegExp(`\\s+${escapeRegExp(result)}\\s*(?:…|\\.{3})?\\s*$`), "").trim();

    const words = text.split(" ").filter(Boolean);
    for (let size = Math.floor(words.length / 2); size >= 1; size--) {
      const left = words.slice(0, size).join(" ");
      const right = words.slice(size, size * 2).join(" ");
      if (left && left === right) {
        text = left;
        break;
      }
    }
    return text;
  }

  extractTokenBarResult(root) {
    const result = htmlToText(root.querySelector(".result, .roll-result, .total")?.textContent);
    if (result) return result;
    const text = htmlToText(root.textContent);
    return text.match(/\b\d+d\d+\s*[+-]\s*\d+\s*=\s*\d+\b/i)?.[0] ?? "";
  }

  isExtractableChatAction(element) {
    const action = this.normalizeChatAction(element);
    if (this.isTokenBarActionElement(element)) return true;
    if (!action || this.isSuppressedChatAction(element)) return false;
    if (element.matches(".inline-roll, [data-roll], .damage-button, .dice-button")) return false;

    const label = htmlToText(element.textContent);
    if (/^\s*(?:\d+d\d+|d\d+|[+-]?\d+)/i.test(label)) return false;

    const allowed = new Set([
      "attack",
      "rollattack",
      "damage",
      "rolldamage",
      "save",
      "rollsave",
      "savingthrow",
      "rollsavingthrow",
      "check",
      "rollcheck",
      "healing",
      "rollhealing",
      "request",
      "requestroll",
      "rollrequest",
      "requestsave",
      "requestsavingthrow",
      "savingthrow",
      "contestedroll",
      "contestroll",
      "contest",
      "grabroll",
      "assignroll",
      "use",
      "cast",
      "activate"
    ]);

    if (allowed.has(action)) return true;
    if (/attack|damage|savingthrow|save|check|healing|request|contest|contested|grabroll|assignroll/i.test(action)) return true;
    return Boolean(element.closest(".card-buttons, .activity-buttons, .message-buttons, .card-actions, .chat-buttons, .monks-tokenbar, .monks-tokenbar-card, .request-roll, .contested-roll"));
  }

  isSuppressedChatAction(element) {
    const action = this.normalizeChatAction(element);
    const label = htmlToText(element.textContent);
    return /template|measuredtemplate|placemeasuredtemplate/i.test(`${action} ${label}`);
  }

  removeChatActionElement(element) {
    const parent = element.parentElement;
    element.remove();
    if (parent && !parent.textContent.trim() && !parent.querySelector("img, input, select, textarea, button, a")) {
      parent.remove();
    }
  }

  scrollChatToBottom() {
    const scroll = () => {
      const messages = this.shell?.querySelector(".fmc-chat-messages");
      const main = this.shell?.querySelector(".fmc-main");
      const compose = this.shell?.querySelector(".fmc-chat-compose");
      if (messages) messages.scrollTop = messages.scrollHeight;
      if (main) main.scrollTop = main.scrollHeight;
      compose?.scrollIntoView?.({ block: "end", inline: "nearest" });
      if (main) main.scrollTop = main.scrollHeight;
      this.updateChatJumpButton();
    };

    window.requestAnimationFrame(() => {
      scroll();
      window.requestAnimationFrame(scroll);
    });
    window.setTimeout(scroll, 80);
    window.setTimeout(scroll, 300);
    window.setTimeout(scroll, 800);
  }

  bindChatScrollState() {
    const messages = this.shell?.querySelector(".fmc-chat-messages");
    if (!messages) return;
    messages.addEventListener("scroll", () => this.updateChatJumpButton(), { passive: true });
    this.shell?.querySelector(".fmc-main")?.addEventListener("scroll", () => this.updateChatJumpButton(), { passive: true });
    this.updateChatJumpButton();
  }

  updateChatJumpButton() {
    const messages = this.shell?.querySelector(".fmc-chat-messages");
    const main = this.shell?.querySelector(".fmc-main");
    const button = this.shell?.querySelector(".fmc-chat-jump");
    if (!messages || !button) return;
    const messagesAway = messages.scrollHeight - messages.scrollTop - messages.clientHeight > 96;
    const mainAway = main ? main.scrollHeight - main.scrollTop - main.clientHeight > 16 : false;
    const awayFromBottom = messagesAway || mainAway;
    button.classList.toggle("hidden", !awayFromBottom);
  }

  onChatMessageCreated(message) {
    if (!this.active || this.activeTab === "chat") return;
    if (!(message.visible ?? true) || !message.rolls?.length) return;

    const toast = this.getChatRollToast(message);
    if (!toast) return;
    window.setTimeout(() => this.showChatRollToast(toast), 40);
  }

  getChatRollToast(message) {
    const roll = message.rolls?.[0];
    if (!roll) return null;

    const speaker = message.speaker?.alias || message.user?.name || "Chat";
    const info = this.getChatMessageInfo(message, speaker);
    const diceTotal = getRollDiceTotal(roll);
    const diceText = getRollDiceText(roll);
    const total = Number(roll.total);
    const modifier = Number.isFinite(total) && Number.isFinite(diceTotal) ? total - diceTotal : null;

    return {
      title: info.title || speaker,
      dice: diceText || roll.formula || "Roll",
      modifier,
      total: Number.isFinite(total) ? total : roll.total
    };
  }

  showChatRollToast(toast) {
    const chatButton = this.shell?.querySelector(".fmc-nav [data-tab='chat']");
    if (!chatButton) return;

    this.shell.querySelector(".fmc-chat-toast")?.remove();
    const element = document.createElement("div");
    element.className = "fmc-chat-toast";
    element.innerHTML = `
      <strong>${escapeHtml(toast.title)}</strong>
      <span>${escapeHtml(toast.dice)}${toast.modifier ? ` ${escapeHtml(formatSigned(toast.modifier))}` : ""} = <b>${escapeHtml(toast.total)}</b></span>
    `;
    chatButton.appendChild(element);

    window.clearTimeout(this.chatToastTimer);
    this.chatToastTimer = window.setTimeout(() => element.remove(), 5200);
  }

  showItemUseToast(item) {
    if (!this.active || this.activeTab === "chat" || !item?.name) return;

    const chatButton = this.shell?.querySelector(".fmc-nav [data-tab='chat']");
    if (!chatButton) return;

    this.shell.querySelector(".fmc-chat-toast")?.remove();
    const element = document.createElement("div");
    element.className = "fmc-chat-toast compact";
    element.innerHTML = `<strong>${escapeHtml(item.name)}</strong>`;
    chatButton.appendChild(element);

    window.clearTimeout(this.chatToastTimer);
    this.chatToastTimer = window.setTimeout(() => element.remove(), 3600);
  }

  renderSettings() {
    return `
      <section class="fmc-stack">
        <section class="fmc-panel">
          <h2>Character</h2>
          ${this.renderActorSelect()}
        </section>
        <section class="fmc-panel">
          <h2>Module</h2>
          <dl class="fmc-details">
            <div><dt>Name</dt><dd>Foundry Mobile Companion</dd></div>
            <div><dt>Version</dt><dd>${escapeHtml(game.modules.get(MODULE_ID)?.version ?? "0.3.8")}</dd></div>
            <div><dt>Foundry</dt><dd>${escapeHtml(game.version ?? "Unknown")}</dd></div>
            <div><dt>System</dt><dd>${escapeHtml(game.system?.title ?? game.system?.id ?? "Unknown")}</dd></div>
          </dl>
        </section>
        <section class="fmc-panel">
          <h2>Theme</h2>
          <div class="fmc-theme-grid">
            ${THEME_OPTIONS.map((theme) => `
              <button type="button" class="fmc-theme-swatch ${this.currentTheme === theme.id ? "active" : ""}" data-action="set-theme" data-theme="${theme.id}">
                <span class="fmc-theme-preview ${theme.id}"></span>
                <strong>${escapeHtml(theme.label)}</strong>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="fmc-panel">
          <h2>Navigation</h2>
          <div class="fmc-setting-buttons">
            ${[
              ["full", "Full"],
              ["drawer", "Main + Drawer"],
              ["grouped", "Grouped"]
            ].map(([id, label]) => `
              <button type="button" class="${this.navLayout === id ? "active" : ""}" data-action="set-nav-layout" data-layout="${id}">
                ${escapeHtml(label)}
              </button>
            `).join("")}
          </div>
          ${this.navLayout === "drawer" ? `
            <div class="fmc-nav-config">
              <span>Main Panel Tabs</span>
              ${TABS.map((tab) => `
                <button type="button" class="${this.navMainTabs.includes(tab.id) ? "active" : ""}" data-action="toggle-nav-main-tab" data-tab-id="${tab.id}">
                  <i class="${tab.icon}"></i>
                  <span>${escapeHtml(tab.label)}</span>
                </button>
              `).join("")}
            </div>
          ` : ""}
        </section>
        <section class="fmc-panel fmc-danger-panel">
          <h2>Standard UI</h2>
          <p>This only lasts until the page is reloaded.</p>
          <button class="fmc-danger" type="button" data-action="${this.confirmingExit ? "confirm-exit-standard-ui" : "request-exit-standard-ui"}">
            ${this.confirmingExit ? "Confirm Standard UI" : "Exit to Standard UI"}
          </button>
        </section>
        <section class="fmc-panel fmc-danger-panel">
          <h2>Session</h2>
          <button class="fmc-danger" type="button" data-action="logout">
            Logout
          </button>
        </section>
      </section>
    `;
  }

  renderActorSelect() {
    const actors = this.getActors();
    return `
      <label class="fmc-select-label">
        <span>Active Character</span>
        <select data-action="select-actor">
          ${actors.map((actor) => `<option value="${actor.id}" ${actor.id === this.selectedActorId ? "selected" : ""}>${escapeHtml(actor.name)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  journalSubtitle(entry) {
    const pages = entry.pages?.size ?? entry.pages?.contents?.length ?? 0;
    return `${pages} ${pages === 1 ? "page" : "pages"}`;
  }

  async openJournalEntry(entryId) {
    const entry = game.journal.get(entryId);
    if (!entry || !entry.testUserPermission(game.user, "OBSERVER")) return;

    const pages = Array.from(entry.pages ?? []);
    const canEdit = entry.testUserPermission(game.user, "OWNER");
    const content = `
      <section class="fmc-journal-pages">
        ${pages.length ? pages.map((page) => `
          <button type="button" data-modal-action="open-journal-page" data-entry-id="${entry.id}" data-page-id="${page.id}">
            <i class="${page.type === "image" ? "fa-solid fa-image" : "fa-solid fa-file-lines"}"></i>
            <span>${escapeHtml(page.name || titleCase(page.type ?? "Page"))}</span>
            ${canEdit && page.type === "text" ? `<small>editable</small>` : ""}
          </button>
        `).join("") : `<p>No pages.</p>`}
      </section>
    `;

    this.openFormModal({
      title: entry.name,
      submitLabel: "",
      content: `<section class="fmc-journal-entry">${content}</section>`,
      extraActions: `
        ${canEdit ? `<button type="button" class="fmc-footer-use" data-modal-action="create-journal-page" data-entry-id="${entry.id}">New Page</button>` : ""}
        <button type="button" class="fmc-footer-use" data-modal-action="close">Close</button>
      `
    });
  }

  async openJournalPage(entryId, pageId, edit = false) {
    const entry = game.journal.get(entryId);
    const page = entry?.pages?.get(pageId);
    if (!entry || !page || !entry.testUserPermission(game.user, "OBSERVER")) return;

    const canEdit = page.testUserPermission?.(game.user, "OWNER") ?? entry.testUserPermission(game.user, "OWNER");
    const content = edit && canEdit && page.type === "text" ? this.renderJournalPageEditor(page) : await this.renderJournalPage(page, entry);

    this.openFormModal({
      title: page.name || entry.name,
      submitLabel: edit && canEdit && page.type === "text" ? "Save" : "",
      content,
      extraActions: `
        <button type="button" class="fmc-footer-square" data-modal-action="back-journal" data-entry-id="${entry.id}" aria-label="Back">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        ${!edit && canEdit && page.type === "text" ? `<button type="button" class="fmc-footer-use" data-modal-action="edit-journal-page" data-entry-id="${entry.id}" data-page-id="${page.id}">Edit</button>` : `<button type="button" class="fmc-footer-use" data-modal-action="close">Close</button>`}
      `,
      footerClass: "fmc-item-footer",
      onSubmit: async (formData) => {
        if (!edit || !canEdit || page.type !== "text") return null;
        await page.update({
          name: String(formData.get("journal:name") ?? page.name),
          "text.content": plainTextToHtml(String(formData.get("journal:content") ?? ""))
        });
        this.render();
        return true;
      }
    });
  }

  async createJournalPage(entryId) {
    const entry = game.journal.get(entryId);
    if (!entry || !entry.testUserPermission(game.user, "OWNER")) return;

    const pageData = {
      name: "New Page",
      type: "text",
      text: {
        format: CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1,
        content: ""
      }
    };

    const pages = typeof entry.createEmbeddedDocuments === "function"
      ? await entry.createEmbeddedDocuments("JournalEntryPage", [pageData])
      : [await JournalEntryPage.create(pageData, { parent: entry })];

    const page = pages?.[0];
    if (page) await this.openJournalPage(entry.id, page.id, true);
    else await this.openJournalEntry(entry.id);
  }

  async renderJournalPage(page, entry) {
    const type = page.type ?? "text";
    const title = page.name ? `<h3>${escapeHtml(page.name)}</h3>` : "";
    if (type === "image" && page.src) {
      return `<article class="fmc-journal-page">${title}<img src="${escapeAttribute(page.src)}" alt=""></article>`;
    }

    const raw = page.text?.content || page.system?.text?.content || page.system?.content || page.content || "";
    const body = raw ? await this.enrichDescription(raw, entry) : `<p>${escapeHtml(titleCase(type))} page.</p>`;
    return `<article class="fmc-journal-page">${title}<div class="fmc-description">${body}</div></article>`;
  }

  renderJournalPageEditor(page) {
    const raw = page.text?.content || "";
    const plain = htmlToPlainText(raw);
    return `
      <section class="fmc-journal-editor">
        <label>
          <span>Name</span>
          <input type="text" name="journal:name" value="${escapeAttribute(page.name ?? "")}">
        </label>
        <label>
          <span>Content</span>
          <textarea name="journal:content" rows="14">${escapeHtml(plain)}</textarea>
        </label>
      </section>
    `;
  }

  isHiddenJournalEntry(entry) {
    const name = String(entry.name ?? "").toLowerCase();
    if (name === "sequencerdatabase" || name.includes("sequencer database")) return true;
    return Boolean(entry.flags?.sequencer || entry.getFlag?.("sequencer", "database"));
  }

  getAudioVolume(setting) {
    const value = game.settings.get("core", setting);
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, 0, 1) : 0.5;
  }

  async setAudioVolume(setting, value) {
    if (!["globalPlaylistVolume", "globalAmbientVolume", "globalInterfaceVolume"].includes(setting)) return;
    await game.settings.set("core", setting, clamp(value, 0, 1));
  }

  async toggleNavMainTab(tabId) {
    if (!this.tabById(tabId)) return;

    const current = this.navMainTabs;
    const next = current.includes(tabId)
      ? current.filter((id) => id !== tabId)
      : [...current, tabId];

    if (!next.length) return;

    await game.settings.set(MODULE_ID, "navMainTabs", next);
    this.navDrawerOpen = false;
    this.render();
  }

  async logout() {
    if (typeof game.logOut === "function") {
      await game.logOut();
      return;
    }

    if (typeof game.logout === "function") {
      await game.logout();
      return;
    }

    const route = globalThis.foundry?.utils?.getRoute?.("logout") ?? "/logout";
    window.location.href = new URL(route, window.location.href).href;
  }

  getPlayingAudioLabels() {
    const labels = [];
    for (const playlist of game.playlists ?? []) {
      const sounds = Array.from(playlist.sounds ?? []).filter((sound) => sound.playing || sound.paused === false && sound.path);
      for (const sound of sounds) labels.push(`${playlist.name}: ${sound.name}`);
    }
    return labels;
  }

  get currentTheme() {
    const theme = game.settings.get(MODULE_ID, "theme");
    return THEME_OPTIONS.some((option) => option.id === theme) ? theme : "ember";
  }

  applyTheme() {
    if (!this.shell) return;
    this.shell.dataset.theme = this.currentTheme;
  }

  renderMiniStat(label, value, icon = "fa-solid fa-circle") {
    return `
      <article class="fmc-mini-stat">
        <i class="${icon}" aria-hidden="true"></i>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value ?? "-"))}</strong>
      </article>
    `;
  }

  renderNumberInput(label, path, value, enabled) {
    return `
      <label class="fmc-number-field">
        <span>${escapeHtml(label)}</span>
        <input type="number" inputmode="numeric" value="${escapeAttribute(value ?? 0)}" data-update-path="${escapeAttribute(path)}" ${enabled ? "" : "disabled"}>
      </label>
    `;
  }

  renderCompactNumber(path, value, enabled, label) {
    return `
      <label class="fmc-compact-number" title="${escapeAttribute(label)}">
        <span>${escapeHtml(label)}</span>
        <input type="number" inputmode="numeric" value="${escapeAttribute(value ?? 0)}" data-update-path="${escapeAttribute(path)}" ${enabled ? "" : "disabled"}>
      </label>
    `;
  }

  renderToggle(label, path, checked, enabled) {
    return `
      <label class="fmc-toggle" title="${escapeAttribute(label)}">
        <input type="checkbox" data-update-path="${escapeAttribute(path)}" ${checked ? "checked" : ""} ${enabled ? "" : "disabled"}>
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  renderMetric(label, value) {
    return `
      <span class="fmc-metric">
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
      </span>
    `;
  }

  renderEmptyState(title, body) {
    return `
      <section class="fmc-empty">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
      </section>
    `;
  }

  activeTabLabel() {
    return TABS.find((tab) => tab.id === this.activeTab)?.label ?? "Character";
  }

  formatMovement(movement) {
    if (!movement) return "-";
    const walk = movement.walk ?? movement.value;
    const units = movement.units ?? "ft";
    return walk ? `${walk} ${units}` : "-";
  }

  itemSubtitle(item) {
    if (item.type === "spell") {
      const level = item.system?.level ?? 0;
      return level === 0 ? "Cantrip" : `Level ${level} spell`;
    }
    return titleCase(item.type);
  }

  async onClick(event) {
    const tokenbarRollButton = event.target.closest(".fmc-tokenbar-roll");
    if (tokenbarRollButton && this.shell?.contains(tokenbarRollButton)) {
      await this.handleTokenBarRollInteraction(tokenbarRollButton, event);
      return;
    }

    const chatCardButton = event.target.closest(".fmc-chat-content button, .fmc-chat-content [role='button'], .fmc-chat-content a[data-action], .fmc-chat-actions button, .fmc-chat-actions [role='button'], .fmc-chat-actions a[data-action], .fmc-tokenbar-roll");
    if (chatCardButton && this.shell?.contains(chatCardButton) && !this.isModuleAction(chatCardButton.dataset.action)) {
      event.preventDefault();
      event.stopPropagation();
      await this.handleChatCardAction(chatCardButton, event);
      return;
    }

    const contentLink = event.target.closest(".content-link, a[data-uuid], a[data-id], a[data-link], a.entity-link, a.inline-roll");
    if (contentLink && !contentLink.matches("[data-action], [data-roll]") && this.shell?.contains(contentLink)) {
      event.preventDefault();
      event.stopPropagation();
      await this.openLinkedDocument(contentLink);
      return;
    }

    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      this.activeTab = tabButton.dataset.tab;
      this.confirmingExit = false;
      this.navDrawerOpen = false;
      this.render();
      return;
    }

    const button = event.target.closest("[data-action], [data-roll]");
    if (!button) return;

    const action = button.dataset.action;
    if (button.dataset.roll) {
      await this.rollActor(button.dataset.roll, button.dataset, event);
      return;
    }

    if (action === "toggle-chat-message") {
      const messageId = button.dataset.messageId;
      if (this.expandedChatMessages.has(messageId)) this.expandedChatMessages.delete(messageId);
      else this.expandedChatMessages.add(messageId);
      this.render();
      return;
    }

    if (action === "mobile-roll-choice") {
      this.completeMobileRoll(button);
      return;
    }

    if (action === "roll-death-save") {
      await this.rollDeathSave(event);
      return;
    }

    if (action === "toggle-death-save") {
      await this.toggleDeathSave(button.dataset.deathType, Number(button.dataset.deathIndex));
      return;
    }

    if (action === "toggle-inspiration") {
      await this.toggleInspiration();
      return;
    }

    if (action === "tokenbar-mobile-roll") {
      await this.rollTokenBarRequest(button, event);
      return;
    }

    if (action === "toggle-chat-dice") {
      this.chatDiceMenuOpen = !this.chatDiceMenuOpen;
      this.render();
      return;
    }

    if (action === "roll-chat-die") {
      await this.rollChatFormula(button.dataset.formula);
      return;
    }

    if (action === "append-chat-die") {
      this.appendChatDie(button.dataset.die);
      return;
    }

    if (action === "adjust-chat-bonus") {
      this.adjustChatBonus(Number(button.dataset.delta));
      return;
    }

    if (action === "set-chat-advantage") {
      this.setChatAdvantage(button.dataset.mode);
      return;
    }

    if (action === "roll-dice-popover") {
      await this.rollDicePopover();
      return;
    }

    if (action === "close-chat-dice") {
      this.chatDiceMenuOpen = false;
      this.render();
      return;
    }

    if (action === "scroll-chat-bottom") {
      this.scrollChatToBottom(true);
      return;
    }

    if (action === "short-rest" || action === "long-rest") {
      await this.takeRest(action === "long-rest");
      return;
    }

    if (action === "set-theme") {
      await game.settings.set(MODULE_ID, "theme", button.dataset.theme);
      return;
    }

    if (action === "set-nav-layout") {
      await game.settings.set(MODULE_ID, "navLayout", button.dataset.layout);
      this.navDrawerOpen = false;
      this.render();
      return;
    }

    if (action === "toggle-nav-drawer") {
      this.navDrawerOpen = !this.navDrawerOpen;
      this.render();
      return;
    }

    if (action === "toggle-nav-main-tab") {
      await this.toggleNavMainTab(button.dataset.tabId);
      return;
    }

    if (action === "set-nav-group") {
      const ids = button.dataset.group === "foundry" ? FOUNDRY_TAB_IDS : CHARACTER_TAB_IDS;
      if (!ids.includes(this.activeTab)) this.activeTab = ids[0];
      this.navDrawerOpen = false;
      this.render();
      return;
    }

    if (action === "logout") {
      await this.logout();
      return;
    }

    if (action === "open-journal-entry") {
      await this.openJournalEntry(button.dataset.journalId);
      return;
    }

    if (action === "mute-audio-channel") {
      await this.setAudioVolume(button.dataset.setting, 0);
      this.render();
      return;
    }

    if (action === "toggle-favorite-item") {
      await this.toggleFavoriteItem(button.dataset.itemId);
      this.render();
      return;
    }

    if (action === "toggle-favorite-skill") {
      await this.toggleFavoriteSkill(button.dataset.skill);
      this.render();
      return;
    }

    if (button.closest(".fmc-chat-content, .fmc-chat-actions") && !this.isModuleAction(action)) {
      event.preventDefault();
      event.stopPropagation();
      await this.handleChatCardAction(button, event);
      return;
    }

    switch (action) {
      case "open-actor-sheet":
        this.selectedActor?.sheet?.render(true);
        break;
      case "open-item-sheet":
        await this.openItemModal(button.dataset.itemId);
        break;
      case "open-item-modal":
        await this.openItemModal(button.dataset.itemId);
        break;
      case "use-item":
        await this.useItem(button.dataset.itemId);
        break;
      case "edit-spell-slot":
        await this.editSpellSlot(button.dataset.slot);
        break;
      case "roll-initiative":
        await this.rollInitiative(button.dataset.combatantId);
        break;
      case "end-turn":
        await this.endTurn();
        break;
      case "request-exit-standard-ui":
        this.confirmingExit = true;
        this.render();
        break;
      case "confirm-exit-standard-ui":
        this.exitStandardUi = true;
        this.deactivate();
        break;
      default:
        break;
    }
  }

  isModuleAction(action) {
    return new Set([
      "open-actor-sheet",
      "open-item-sheet",
      "open-item-modal",
      "use-item",
      "edit-spell-slot",
      "roll-initiative",
      "end-turn",
      "request-exit-standard-ui",
      "confirm-exit-standard-ui",
      "select-actor",
      "send-chat",
      "toggle-chat-message",
      "mobile-roll-choice",
      "roll-death-save",
      "toggle-death-save",
      "toggle-inspiration",
      "tokenbar-mobile-roll",
      "toggle-chat-dice",
      "roll-chat-die",
      "append-chat-die",
      "adjust-chat-bonus",
      "set-chat-advantage",
      "roll-dice-popover",
      "close-chat-dice",
      "scroll-chat-bottom",
      "short-rest",
      "long-rest",
      "set-theme",
      "set-nav-layout",
      "toggle-nav-drawer",
      "toggle-nav-main-tab",
      "set-nav-group",
      "logout",
      "open-journal-entry",
      "mute-audio-channel",
      "toggle-favorite-item",
      "toggle-favorite-skill"
    ]).has(action);
  }

  async handleChatCardAction(button, event = undefined) {
    const messageElement = button.closest(".fmc-chat-message");
    const messageId = messageElement?.dataset.messageId;
    if (!messageId) return;

    const message = game.messages.get(messageId);
    if (this.isDnd5eRollCardAction(button) && await this.handleDnd5eChatAction(button, message, event)) return;

    const selector = `[data-message-id="${cssEscape(messageId)}"]`;
    const sourceMessage = document.querySelector(`#chat-log ${selector}, #chat ${selector}, .chat-log ${selector}`);
    if (sourceMessage) {
      const sourceButton = this.findSourceChatButton(button, messageElement, sourceMessage);
      if (sourceButton) {
        this.triggerSourceChatAction(sourceButton);
        return;
      }
    }

    if (await this.handleDnd5eChatAction(button, message, event)) return;

    const uuid = button.dataset.uuid || button.dataset.itemUuid || button.closest("[data-uuid]")?.dataset.uuid;
    if (uuid) {
      const document = await fromUuid(uuid);
      if (document?.use) await this.withFoundryDialogSupport(() => document.use());
      else if (document) await this.openDocumentModal(document);
      return;
    }

    ui.notifications.info("This chat card action is not supported in the mobile view yet.");
  }

  isDnd5eRollCardAction(button) {
    return ["rollattack", "attack", "rolldamage", "damage"].includes(this.normalizeChatAction(button));
  }

  async handleDnd5eChatAction(button, message, event = undefined) {
    if (!message) return false;

    const activity = await this.resolveChatActivity(button, message);
    if (!activity) return false;

    const action = this.normalizeChatAction(button);
    const config = event ? { event } : {};

    try {
      if (["rollattack", "attack"].includes(action) && typeof activity.rollAttack === "function") {
        await this.withFoundryDialogSupport(() => activity.rollAttack(config));
        return true;
      }

      if (["rolldamage", "damage"].includes(action) && typeof activity.rollDamage === "function") {
        const damageConfig = this.getChatDamageConfig(message, event);
        await this.withFoundryDialogSupport(() => activity.rollDamage(damageConfig.config, damageConfig.dialog));
        return true;
      }

      if (["use", "cast", "activate"].includes(action) && typeof activity.use === "function") {
        await this.withFoundryDialogSupport(() => activity.use());
        return true;
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | dnd5e chat action failed`, error);
      ui.notifications.warn("Mobile chat action failed. Try the full chat card.");
      return true;
    }

    return false;
  }

  normalizeChatAction(button) {
    const raw = button.dataset.action || button.getAttribute("data-roll") || button.textContent || "";
    return String(raw).trim().toLowerCase().replace(/\s+/g, "");
  }

  async resolveChatActivity(button, message) {
    const data = this.collectChatCardData(button);
    const flagActivity = getPropertyValue(message, "flags.dnd5e.activity") ?? {};
    const flagItem = getPropertyValue(message, "flags.dnd5e.item") ?? {};
    const activityUuid = data.activityUuid || data.uuid || flagActivity.uuid;

    if (activityUuid) {
      try {
        const activity = await fromUuid(activityUuid);
        if (activity?.item) return activity;
      } catch (error) {
        console.debug(`${MODULE_ID} | Unable to resolve chat activity UUID`, error);
      }
    }

    const item = await this.resolveChatItem(data, flagItem, message);
    if (!item) return null;

    const activityId = data.activityId || data.activity || flagActivity.id;
    const activities = getActivityList(item);
    if (activityId) {
      const activity = activities.find((candidate) => candidate?.id === activityId || candidate?._id === activityId);
      if (activity) return activity;
    }

    const action = this.normalizeChatAction(button);
    if (["rollattack", "attack"].includes(action)) {
      return activities.find((activity) => typeof activity?.rollAttack === "function") ?? null;
    }
    if (["rolldamage", "damage"].includes(action)) {
      return activities.find((activity) => typeof activity?.rollDamage === "function") ?? null;
    }

    return activities.find((activity) => typeof activity?.use === "function") ?? null;
  }

  async resolveChatItem(data, flagItem, message) {
    const itemUuid = data.itemUuid || flagItem.uuid || data.uuid;
    if (itemUuid) {
      try {
        const item = await fromUuid(itemUuid);
        if (item?.type && item?.system) return item;
      } catch (error) {
        console.debug(`${MODULE_ID} | Unable to resolve chat item UUID`, error);
      }
    }

    const actor = this.resolveChatActor(message);
    const itemId = data.itemId || data.item || flagItem.id;
    return itemId ? actor?.items?.get(itemId) ?? null : null;
  }

  resolveChatActor(message) {
    const speaker = message?.speaker ?? {};
    const token = speaker.scene && speaker.token ? game.scenes.get(speaker.scene)?.tokens?.get(speaker.token) : null;
    return token?.actor ?? (speaker.actor ? game.actors.get(speaker.actor) : null) ?? this.selectedActor ?? null;
  }

  collectChatCardData(button) {
    const boundary = button.closest(".fmc-chat-message");
    const data = {};
    for (let element = button; element && element !== boundary; element = element.parentElement) {
      for (const [key, value] of Object.entries(element.dataset ?? {})) {
        data[key] ??= value;
      }
    }
    return data;
  }

  getChatDamageConfig(message, event = undefined) {
    const config = event ? { event } : {};
    const dialog = {};
    const lastAttack = message?.getAssociatedRolls?.("attack")?.pop?.();
    if (!lastAttack) return { config, dialog };

    config.attackMode = lastAttack.getFlag?.("dnd5e", "roll.attackMode");
    config.isCritical = lastAttack.rolls?.[0]?.isCritical;
    if (config.isCritical) dialog.options = { defaultButton: "critical" };

    const actor = lastAttack.getAssociatedActor?.();
    const storedData = lastAttack.getFlag?.("dnd5e", "roll.ammunitionData");
    const ammunitionId = lastAttack.getFlag?.("dnd5e", "roll.ammunition");
    if (storedData && globalThis.Item?.implementation && actor) config.ammunition = new globalThis.Item.implementation(storedData, { parent: actor });
    else if (actor && ammunitionId) config.ammunition = actor.items.get(ammunitionId);

    return { config, dialog };
  }

  findSourceChatButton(button, messageElement, sourceMessage) {
    const sourceIndex = Number(button.dataset.sourceIndex);
    if (Number.isInteger(sourceIndex) && sourceIndex >= 0) {
      const tokenbarSourceButtons = this.getTokenBarActionElements(sourceMessage);
      if (tokenbarSourceButtons[sourceIndex]) return tokenbarSourceButtons[sourceIndex];
    }

    const sourceButtons = uniqueElements(Array.from(sourceMessage.querySelectorAll("button, [role='button'], a, .roll, .rollable, .roll-button, [data-request-id]")));

    const action = button.dataset.action;

    if (action) {
      const exact = sourceButtons.find((candidate) => {
        if (candidate.dataset.action !== action) return false;

        for (const [key, value] of Object.entries(button.dataset)) {
          if (key === "action") continue;
          if (candidate.dataset[key] !== undefined && candidate.dataset[key] !== value) return false;
        }

        return true;
      });
      if (exact) return exact;
    }

    const label = button.textContent?.trim();
    if (label) {
      const byLabel = sourceButtons.find((candidate) => candidate.textContent?.trim() === label);
      if (byLabel) return byLabel;
    }

    const mobileButtons = Array.from(messageElement.querySelectorAll(".fmc-chat-content button, .fmc-chat-content [role='button'], .fmc-chat-content a, .fmc-chat-actions button, .fmc-chat-actions [role='button'], .fmc-chat-actions a, .fmc-tokenbar-roll"));
    const index = mobileButtons.indexOf(button);
    return sourceButtons[index] ?? null;
  }

  triggerSourceChatAction(sourceElement) {
    const Pointer = globalThis.PointerEvent ?? MouseEvent;
    const events = [
      ["pointerdown", Pointer],
      ["mousedown", MouseEvent],
      ["pointerup", Pointer],
      ["mouseup", MouseEvent],
      ["click", MouseEvent]
    ];

    for (const [type, EventClass] of events) {
      try {
        sourceElement.dispatchEvent(new EventClass(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          pointerType: "touch",
          button: 0,
          buttons: type.endsWith("down") ? 1 : 0
        }));
      } catch (error) {
        sourceElement.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
    }
  }

  async onChange(event) {
    const target = event.target;

    if (target.matches("[data-action='select-actor']")) {
      this.selectedActorId = target.value;
      this.render();
      return;
    }

    const audioSetting = target.dataset.audioSetting;
    if (audioSetting) {
      await this.setAudioVolume(audioSetting, Number(target.value));
      this.render();
      return;
    }

    const path = target.dataset.updatePath;
    if (!path) return;

    await this.updatePath(path, target.type === "checkbox" ? target.checked : Number(target.value));
  }

  async onSubmit(event) {
    const form = event.target.closest("[data-action='send-chat']");
    if (!form) return;

    event.preventDefault();
    const input = form.elements.message;
    const content = String(input?.value ?? "").trim();
    if (!content) return;

    if (isRollCommand(content)) {
      await this.rollChatFormula(content.replace(/^\/(?:r|roll)\s+/i, ""));
    } else {
      await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.selectedActor ?? undefined }),
        content
      });
    }

    input.value = "";
    this.render();
  }

  async rollChatFormula(formula) {
    const cleanFormula = String(formula ?? "").trim();
    if (!cleanFormula) return;

    try {
      const roll = await evaluateRollFormula(cleanFormula);
      await this.createRollMessage(roll, this.selectedActor, cleanFormula, game.settings.get("core", "rollMode") ?? "publicroll");
      this.chatDiceMenuOpen = false;
      this.render();
    } catch (error) {
      console.warn(`${MODULE_ID} | Chat formula roll failed`, error);
      ui.notifications.warn("Mobile dice roll failed. Check the formula.");
    }
  }

  appendChatDie(die) {
    const input = this.shell?.querySelector(".fmc-dice-popover input[name='diceFormula']");
    if (!input || !die) return;
    const current = String(input.value || "").trim();
    input.value = current ? `${current} + 1${die}` : `1${die}`;
    input.focus();
  }

  adjustChatBonus(delta) {
    const input = this.shell?.querySelector(".fmc-dice-popover input[name='diceFormula']");
    if (!input || !Number.isFinite(delta)) return;
    input.value = adjustFormulaBonus(input.value, delta);
    this.updateDiceBonusDisplay();
    input.focus();
  }

  setChatAdvantage(mode) {
    const input = this.shell?.querySelector(".fmc-dice-popover input[name='diceFormula']");
    if (!input) return;
    input.value = mode === "disadvantage" ? "2d20kl" : "2d20kh";
    this.updateDiceBonusDisplay();
  }

  updateDiceBonusDisplay() {
    const popup = this.shell?.querySelector(".fmc-dice-popover");
    const formula = popup?.querySelector("input[name='diceFormula']");
    const display = popup?.querySelector(".fmc-dice-bonus-display");
    if (!formula || !display) return;
    display.textContent = formatSigned(getFormulaBonus(formula.value));
  }

  async rollDicePopover() {
    const popup = this.shell?.querySelector(".fmc-dice-popover");
    const formula = String(popup?.querySelector("input[name='diceFormula']")?.value ?? "").trim();
    await this.rollChatFormula(formula);
  }

  async rollDeathSave(event = undefined) {
    const actor = this.selectedActor;
    if (!actor || !this.canEditSelectedActor) return;

    try {
      if (typeof actor.rollDeathSave === "function") {
        await this.withFoundryDialogSupport(() => actor.rollDeathSave({ event }, {}, {}));
        return;
      }
    } catch (error) {
      console.debug(`${MODULE_ID} | Native death save failed`, error);
    }

    ui.notifications.warn("Death save roll is not supported for this actor.");
  }

  async toggleDeathSave(type, index) {
    if (!this.selectedActor || !this.canEditSelectedActor || !["failure", "success"].includes(type)) return;

    const current = Number(this.selectedActor.system?.attributes?.death?.[type] ?? 0);
    const next = current >= index ? index - 1 : index;
    await this.selectedActor.update({ [`system.attributes.death.${type}`]: clamp(next, 0, 3) });
  }

  async toggleInspiration() {
    if (!this.canEditSelectedActor) return;
    const active = Boolean(this.selectedActor.system?.attributes?.inspiration);
    await this.selectedActor.update({ "system.attributes.inspiration": !active });
  }

  async rollTokenBarRequest(button, event = undefined) {
    const messageElement = button.closest(".fmc-chat-message");
    const messageId = messageElement?.dataset.messageId;
    const message = messageId ? game.messages.get(messageId) : null;
    const tokenbarFlags = message?.flags?.["monks-tokenbar"] ?? {};
    const tokenbarFlagText = (() => {
      try {
        return JSON.stringify(tokenbarFlags);
      } catch (error) {
        return "";
      }
    })();
    const tokenbarText = htmlToText(`${messageElement?.querySelector(".fmc-tokenbar-card")?.textContent || ""} ${message?.content || ""} ${tokenbarFlagText}`);
    const rollChoices = this.parseTokenBarRollRequests(tokenbarText);
    const inferredRequest = rollChoices[0] ?? this.parseTokenBarRollRequest(tokenbarText);
    let kind = button.dataset.tokenbarKind || inferredRequest?.kind;
    const dataset = {
      ability: button.dataset.ability || inferredRequest?.ability,
      skill: button.dataset.skill || inferredRequest?.skill
    };

    const actorName = htmlToText(button.closest(".fmc-tokenbar-actor")?.querySelector("span")?.textContent || "");
    let tokenEntry = button.dataset.tokenbarTokenId
      ? { id: button.dataset.tokenbarTokenId, data: message?.flags?.["monks-tokenbar"]?.[`token${button.dataset.tokenbarTokenId}`] }
      : null;
    let actor = button.dataset.actorId ? game.actors.get(button.dataset.actorId) : null;
    if (!actor && tokenEntry?.data?.actorid) actor = game.actors.get(tokenEntry.data.actorid);
    if (!actor && tokenEntry?.data?.actorId) actor = game.actors.get(tokenEntry.data.actorId);
    if (!actor && actorName) actor = this.resolveTokenBarActor(actorName, message);
    if (!actor) actor = this.selectedActor;
    if (!tokenEntry && actor) tokenEntry = this.getMonksTokenBarEntryForActor(message, actor, actorName);
    if (!tokenEntry && actorName) tokenEntry = this.getMonksTokenBarEntryByName(message, actorName);
    if (!tokenEntry && actor) tokenEntry = this.getMonksTokenBarEntryByName(message, actor.name);

    if (!actor?.testUserPermission?.(game.user, "OWNER")) actor = this.selectedActor;
    if (!actor?.testUserPermission?.(game.user, "OWNER")) {
      ui.notifications.warn("You do not own this actor.");
      return;
    }

    const previousActorId = this.selectedActorId;
    this.selectedActorId = actor.id;
    try {
      if (rollChoices.length > 1) {
        const choice = await this.openTokenBarRollChoiceDialog(rollChoices);
        if (!choice) return;
        kind = choice.kind;
        dataset.ability = choice.ability;
        dataset.skill = choice.skill;
      }

      if (!["ability", "save", "skill"].includes(kind) || (kind === "skill" ? !dataset.skill : !dataset.ability)) {
        kind = "ability";
        dataset.ability = dataset.ability || "str";
        dataset.skill = "";
      }

      const options = await this.openActorRollDialog(kind, dataset);
      if (options === null) return;

      const { roll, context } = await this.buildActorRoll(kind, dataset, options);
      const requestType = message?.getFlag?.("monks-tokenbar", "what");

      if (message && tokenEntry && ["savingthrow", "contestedroll"].includes(requestType)) {
        await this.sendMonksTokenBarRoll(message, requestType, tokenEntry.id, roll);
      } else {
        await this.createRollMessage(roll, actor, context.title, options.rollMode);
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | TokenBar mobile roll failed`, error);
      this.trySourceTokenBarRoll(button, event);
      ui.notifications.warn("TokenBar roll failed. Check the browser console for details.");
    } finally {
      this.selectedActorId = previousActorId;
    }
  }

  trySourceTokenBarRoll(button, event = undefined) {
    const messageElement = button.closest(".fmc-chat-message");
    const messageId = messageElement?.dataset.messageId;
    if (!messageElement || !messageId) return false;

    const selector = `[data-message-id="${cssEscape(messageId)}"]`;
    const sourceMessage = document.querySelector(`#chat-log ${selector}, #chat ${selector}, .chat-log ${selector}`);
    if (!sourceMessage) return false;

    const sourceButton = this.findSourceChatButton(button, messageElement, sourceMessage);
    if (!sourceButton) return false;

    this.triggerSourceChatAction(sourceButton);
    return true;
  }

  getMonksTokenBarEntryForActor(message, actor, fallbackName = "") {
    const flags = message?.flags?.["monks-tokenbar"] ?? {};
    for (const [key, value] of Object.entries(flags)) {
      if (!key.startsWith("token") || !value) continue;
      const tokenId = value.id ?? key.slice(5);
      if (value.actorid === actor.id || value.actorId === actor.id || value.name === actor.name || value.realname === actor.name || value.name === fallbackName || value.realname === fallbackName) {
        return { id: tokenId, data: value };
      }
    }
    return null;
  }

  getMonksTokenBarEntryByName(message, name) {
    const cleanName = htmlToText(name);
    if (!cleanName) return null;
    const flags = message?.flags?.["monks-tokenbar"] ?? {};
    for (const [key, value] of Object.entries(flags)) {
      if (!key.startsWith("token") || !value) continue;
      if (value.name === cleanName || value.realname === cleanName) {
        return { id: value.id ?? key.slice(5), data: value };
      }
    }
    return null;
  }

  async sendMonksTokenBarRoll(message, type, tokenId, roll) {
    const response = [{
      id: tokenId,
      roll: roll.toJSON(),
      reveal: true,
      userid: game.userId
    }];

    game.socket.emit("module.monks-tokenbar", {
      action: "rollability",
      type,
      msgid: message.id,
      response,
      senderId: game.user.id
    });

    window.setTimeout(() => this.render(), 150);
  }

  async takeRest(longRest) {
    const actor = this.selectedActor;
    if (!actor || !this.canEditSelectedActor) return;

    const methods = longRest ? ["longRest", "rest"] : ["shortRest", "rest"];
    for (const method of methods) {
      if (typeof actor[method] !== "function") continue;
      try {
        if (method === "rest") await this.withFoundryDialogSupport(() => actor.rest({ longRest }));
        else await this.withFoundryDialogSupport(() => actor[method]());
        return;
      } catch (error) {
        console.debug(`${MODULE_ID} | ${method} failed`, error);
      }
    }

    ui.notifications.warn(`${longRest ? "Long" : "Short"} rest is not supported for this actor.`);
  }

  async updatePath(path, value) {
    if (!this.selectedActor || !this.canEditSelectedActor) return;

    if (path.startsWith("item:")) {
      const [, itemId, ...itemPathParts] = path.split(":");
      const itemPath = itemPathParts.join(":");
      const item = this.selectedActor.items.get(itemId);
      if (!item) return;
      await item.update({ [itemPath]: value });
      return;
    }

    await this.selectedActor.update({ [path]: value });
  }

  async editSpellSlot(slotKey) {
    if (!this.selectedActor || !this.canEditSelectedActor || !slotKey) return;

    const slot = this.selectedActor.system?.spells?.[slotKey];
    if (!slot) return;

    const level = slotKey.replace("spell", "");
    await this.openFormModal({
      title: `Level ${level} Slots`,
      submitLabel: "Save",
      content: `
        <div class="fmc-modal-fields">
          ${this.renderModalNumber("Current", "value", slot.value, true)}
          ${this.renderModalNumber("Max", "max", slot.max, true)}
        </div>
      `,
      onSubmit: async (formData) => {
        await this.selectedActor.update({
          [`system.spells.${slotKey}.value`]: parseInputValue(formData.get("field:value")),
          [`system.spells.${slotKey}.max`]: parseInputValue(formData.get("field:max"))
        });
        return null;
      }
    });
  }

  async rollActor(kind, dataset, event = undefined) {
    const actor = this.selectedActor;
    if (!actor) return;

    try {
      if (await this.rollActorNative(kind, dataset, event)) return;
    } catch (error) {
      console.debug(`${MODULE_ID} | Native actor roll failed, trying mobile fallback`, error);
    }

    const options = await this.openActorRollDialog(kind, dataset);
    if (options === null) return;

    try {
      await this.rollActorFallback(kind, dataset, options);
    } catch (error) {
      console.warn(`${MODULE_ID} | Fallback roll failed`, error);
      ui.notifications.warn("Mobile roll failed. Check the browser console for details.");
    }
  }

  getRollContext(kind, dataset) {
    const actor = this.selectedActor;
    const abilityKey = dataset.ability;
    const skillKey = dataset.skill;

    if (kind === "skill") {
      const skill = actor.system?.skills?.[skillKey] ?? {};
      const ability = skill.ability || "int";
      const abilityLabel = abilityLabelFor(ability);
      const skillLabel = skill.label || titleCase(skillKey);
      const modifier = getRollModifier(skill.total ?? skill.mod ?? skill.value ?? 0);
      return {
        title: `${abilityLabel} (${skillLabel}) Check`,
        flavor: `${skillLabel} Check`,
        ability,
        abilityLabel,
        modifier
      };
    }

    const ability = actor.system?.abilities?.[abilityKey] ?? {};
    const abilityLabel = ability.label || abilityLabelFor(abilityKey);
    const modifier = getRollModifier(kind === "save" ? ability.save : ability.mod);
    return {
      title: `${abilityLabel} ${kind === "save" ? "Save" : "Check"}`,
      flavor: `${abilityKey.toUpperCase()} ${kind === "save" ? "Save" : "Check"}`,
      ability: abilityKey,
      abilityLabel,
      modifier: Number.isFinite(modifier) ? modifier : getRollModifier(ability.value ?? 0)
    };
  }

  openActorRollDialog(kind, dataset) {
    this.closeModal();
    const context = this.getRollContext(kind, dataset);
    const baseFormula = `1d20 ${formatFormulaPart(context.modifier)}`.trim();
    const rollModes = Object.entries(CONFIG.Dice.rollModes ?? {})
      .map(([key, mode]) => `<option value="${key}" ${key === (game.settings.get("core", "rollMode") ?? "publicroll") ? "selected" : ""}>${escapeHtml(rollModeLabel(key, mode))}</option>`)
      .join("");

    this.modal = document.createElement("div");
    this.modal.className = "fmc-modal-backdrop fmc-roll-backdrop";
    this.modal.innerHTML = `
      <form class="fmc-modal-card fmc-roll-card">
        <header>
          <h2>${escapeHtml(context.title)}</h2>
          <button type="button" class="fmc-icon-button" data-modal-action="close" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="fmc-modal-body fmc-roll-body">
          <div class="fmc-roll-icon">
            <i class="fa-solid fa-dice-d20"></i>
            <span>d20</span>
          </div>
          <div class="fmc-roll-formula">
            <strong>${escapeHtml(baseFormula)}</strong>
            <span>Formula</span>
          </div>
          <input type="text" name="bonus" placeholder="Situational Bonus?">
          <fieldset>
            <legend>Configuration</legend>
            <label>
              <span>Abilities</span>
              <select name="ability" disabled>
                <option>${escapeHtml(context.abilityLabel)}</option>
              </select>
            </label>
            <label>
              <span>Roll Mode</span>
              <select name="rollMode">${rollModes}</select>
            </label>
          </fieldset>
        </div>
        <footer class="fmc-roll-footer">
          <button type="button" data-action="mobile-roll-choice" data-roll-state="advantage">Advantage</button>
          <button type="button" data-action="mobile-roll-choice" data-roll-state="normal">Normal</button>
          <button type="button" data-action="mobile-roll-choice" data-roll-state="disadvantage">Disadvantage</button>
        </footer>
      </form>
    `;

    this.shell.appendChild(this.modal);

    return new Promise((resolve) => {
      const finish = (value) => {
        this.pendingRollDialogResolve = null;
        this.closeModal();
        resolve(value);
      };

      this.pendingRollDialogResolve = finish;

      this.modal.addEventListener("click", (event) => {
        const close = event.target.closest("[data-modal-action='close']");
        if (close) {
          finish(null);
          event.preventDefault();
          event.stopPropagation();
        }
      });
    });
  }

  completeMobileRoll(button) {
    if (!this.pendingRollDialogResolve) return;

    const form = button.closest("form");
    const formData = new FormData(form);
    const rollState = button.dataset.rollState;
    const bonus = String(formData.get("bonus") || "").trim();
    this.pendingRollDialogResolve({
      fastForward: true,
      advantage: rollState === "advantage",
      disadvantage: rollState === "disadvantage",
      rollMode: formData.get("rollMode"),
      parts: bonus ? [bonus] : []
    });
  }

  async rollActorNative(kind, dataset, event = undefined) {
    const actor = this.selectedActor;
    if (!actor) return false;

    if (kind === "ability") {
      return this.trySystemRoll(actor, [
        { method: "rollAbilityCheck", args: [{ ability: dataset.ability, event }, {}, {}] },
        { method: "rollAbilityTest", args: [dataset.ability, { event }] }
      ]);
    }

    if (kind === "save") {
      return this.trySystemRoll(actor, [
        { method: "rollSavingThrow", args: [{ ability: dataset.ability, event }, {}, {}] },
        { method: "rollAbilitySave", args: [dataset.ability, { event }] }
      ]);
    }

    if (kind === "skill") {
      return this.trySystemRoll(actor, [
        { method: "rollSkill", args: [{ skill: dataset.skill, event }, {}, {}] },
        { method: "rollSkill", args: [dataset.skill, { event }] }
      ]);
    }

    return false;
  }

  async trySystemRoll(actor, attempts) {
    for (const { method, args } of attempts) {
      if (typeof actor[method] !== "function") continue;
      try {
        await this.withFoundryDialogSupport(() => actor[method](...(args ?? [])));
        return true;
      } catch (error) {
        console.debug(`${MODULE_ID} | ${method} failed, trying fallback`, error);
      }
    }

    return false;
  }

  async getRollOptions() {
    return this.openFormModal({
      title: "Mobile Roll",
      submitLabel: "Roll",
      content: `
        <label>
          <span>Mode</span>
          <select name="rollState">
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
        </label>
        <label>
          <span>Bonus</span>
          <input type="text" name="bonus" placeholder="+0">
        </label>
        <label>
          <span>Roll Mode</span>
          <select name="rollMode">
            ${Object.entries(CONFIG.Dice.rollModes ?? {}).map(([key, mode]) => `<option value="${key}">${escapeHtml(rollModeLabel(key, mode))}</option>`).join("")}
          </select>
        </label>
      `,
      onSubmit: (formData) => {
        const rollState = formData.get("rollState");
        const bonus = String(formData.get("bonus") || "").trim();

        return {
          fastForward: true,
          advantage: rollState === "advantage",
          disadvantage: rollState === "disadvantage",
          rollMode: formData.get("rollMode"),
          parts: bonus ? [bonus] : []
        };
      }
    });
  }

  defaultRollOptions() {
    return {
      fastForward: true,
      advantage: false,
      disadvantage: false,
      rollMode: game.settings.get("core", "rollMode") ?? "publicroll",
      parts: []
    };
  }

  async rollActorFallback(kind, dataset, options) {
    const actor = this.selectedActor;
    const { roll, context } = await this.buildActorRoll(kind, dataset, options);
    await this.createRollMessage(roll, actor, context.title, options.rollMode);
  }

  async buildActorRoll(kind, dataset, options) {
    const context = this.getRollContext(kind, dataset);
    const die = options.advantage ? "2d20kh" : options.disadvantage ? "2d20kl" : "1d20";
    const parts = [die, formatFormulaPart(context.modifier), ...(options.parts ?? []).map(formatBonusPart)].filter(Boolean);
    const roll = await evaluateRollFormula(parts.join(" "));
    return { roll, context };
  }

  async createRollMessage(roll, actor, flavor, rollMode) {
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>${escapeHtml(flavor)}</strong>`
    };

    try {
      await roll.toMessage(messageData, { messageMode: rollMode });
      return;
    } catch (error) {
      console.debug(`${MODULE_ID} | roll.toMessage options call failed`, error);
    }

    try {
      await roll.toMessage(messageData);
      return;
    } catch (error) {
      console.debug(`${MODULE_ID} | roll.toMessage data call failed, using ChatMessage.create`, error);
    }

    const fallbackData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<strong>${escapeHtml(flavor)}</strong>`,
      rolls: [roll]
    };

    if (CONST.CHAT_MESSAGE_TYPES?.ROLL !== undefined) fallbackData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    if (ChatMessage.applyRollMode) ChatMessage.applyRollMode(fallbackData, rollMode);
    else fallbackData.rollMode = rollMode;

    await ChatMessage.create(fallbackData);
  }

  async useItem(itemId) {
    const item = this.selectedActor?.items.get(itemId);
    if (!item) return;

    try {
      if (typeof item.use === "function") {
        const attempts = [
          () => this.withFoundryDialogSupport(() => item.use()),
          () => this.withFoundryDialogSupport(() => item.use({}, { configure: true }, {})),
          () => item.use({ configureDialog: false }),
          () => item.use({}, { configure: false }, {})
        ];

        for (const attempt of attempts) {
          try {
            await attempt();
            this.showItemUseToast(item);
            return;
          } catch (error) {
            console.debug(`${MODULE_ID} | item.use attempt failed`, error);
          }
        }
      }

      if (await this.tryItemActivity(item)) {
        this.showItemUseToast(item);
        return;
      }

      if (typeof item.roll === "function") {
        await item.roll();
        this.showItemUseToast(item);
        return;
      }

      item.sheet?.render(true);
    } catch (error) {
      console.warn(`${MODULE_ID} | Item use failed`, error);
      ui.notifications.warn("Mobile item use failed. Try the full item sheet.");
    }
  }

  async tryItemActivity(item) {
    const activities = getActivityList(item);
    for (const activity of activities) {
      for (const method of ["use", "roll"]) {
        if (typeof activity?.[method] !== "function") continue;
        try {
          await this.withFoundryDialogSupport(() => activity[method]());
          return true;
        } catch (error) {
          console.debug(`${MODULE_ID} | activity.${method} failed`, error);
        }
        try {
          await activity[method]({ configureDialog: false });
          return true;
        } catch (error) {
          console.debug(`${MODULE_ID} | activity.${method} fallback failed`, error);
        }
      }
    }

    return false;
  }

  async withFoundryDialogSupport(callback) {
    this.closeModal();
    document.body.classList.add("fmc-foundry-dialog-open");

    try {
      return await callback();
    } finally {
      window.setTimeout(() => {
        if (!document.querySelector(".application, .app, .dialog, .window-app")) {
          document.body.classList.remove("fmc-foundry-dialog-open");
        }
      }, 750);
    }
  }

  async interceptRenderedApplication(app) {
    if (!this.active) return;
    if (document.body.classList.contains("fmc-foundry-dialog-open")) return;

    const document = app?.document ?? app?.object;
    if (!document?.uuid) return;
    if (document === this.selectedActor) return;

    window.setTimeout(() => app.close?.(), 0);
    await this.openDocumentModal(document);
  }

  async openItemModal(itemId) {
    const item = this.selectedActor?.items.get(itemId);
    if (!item) return;

    const canEdit = this.canEditSelectedActor;
    const favorite = this.isFavoriteItem(item.id);
    const quantity = item.system?.quantity;
    const equipped = item.system?.equipped;
    const attuned = item.system?.attuned;
    const prepared = item.system?.preparation?.prepared;
    const uses = item.system?.uses;
    const description = await this.enrichDescription(item.system?.description?.value || item.system?.description?.chat || "<p>No description.</p>", item);

    this.openFormModal({
      title: item.name,
      submitLabel: "",
      headerClose: false,
      footerClass: "fmc-item-footer",
      extraActions: `
        <button type="button" class="fmc-footer-square ${favorite ? "active" : ""}" data-modal-action="toggle-favorite" data-item-id="${item.id}" aria-label="Favorite">
          <i class="fa-solid fa-star"></i>
        </button>
        <button type="button" class="fmc-footer-use" data-modal-action="use-item" data-item-id="${item.id}">Use</button>
        <button type="button" class="fmc-footer-square" data-modal-action="close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `,
      content: `
        <div class="fmc-item-modal-head">
          <img src="${escapeAttribute(item.img)}" alt="">
          <div>
            <strong>${escapeHtml(this.itemSubtitle(item))}</strong>
            <span>${escapeHtml(item.type)}</span>
          </div>
        </div>
        <div class="fmc-modal-fields">
          ${prepared !== undefined ? this.renderModalToggle("Prepared", "system.preparation.prepared", prepared, canEdit) : ""}
          ${quantity !== undefined ? this.renderModalNumber("Quantity", "system.quantity", quantity, canEdit) : ""}
          ${equipped !== undefined ? this.renderModalToggle("Equipped", "system.equipped", equipped, canEdit) : ""}
          ${attuned !== undefined ? this.renderModalToggle("Attuned", "system.attuned", attuned, canEdit) : ""}
          ${uses?.value !== undefined ? this.renderModalNumber("Uses", "system.uses.value", uses.value, canEdit) : ""}
        </div>
        <section class="fmc-description">
          ${description}
        </section>
      `,
      onChange: async (formData) => {
        if (!canEdit) return null;

        const update = {};
        for (const [key, value] of formData.entries()) {
          if (!key.startsWith("field:")) continue;
          const path = key.slice(6);
          update[path] = value === "on" ? true : parseInputValue(value);
        }

        for (const checkbox of this.modal.querySelectorAll("input[type='checkbox'][name^='field:']")) {
          const path = checkbox.name.slice(6);
          update[path] = checkbox.checked;
        }

        if (Object.keys(update).length) await item.update(update);
        return null;
      }
    });
  }

  renderModalNumber(label, path, value, enabled) {
    return `
      <label>
        <span>${escapeHtml(label)}</span>
        <input type="number" inputmode="numeric" name="field:${escapeAttribute(path)}" value="${escapeAttribute(value ?? 0)}" ${enabled ? "" : "disabled"}>
      </label>
    `;
  }

  renderModalToggle(label, path, checked, enabled) {
    return `
      <label class="fmc-modal-check">
        <input type="checkbox" name="field:${escapeAttribute(path)}" ${checked ? "checked" : ""} ${enabled ? "" : "disabled"}>
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  openFormModal({ title, content, submitLabel = "Save", extraActions = "", footerClass = "", headerClose = true, onSubmit, onChange }) {
    this.closeModal();

    this.modal = document.createElement("div");
    this.modal.className = "fmc-modal-backdrop";
    this.modal.innerHTML = `
      <form class="fmc-modal-card">
        <header>
          <h2>${escapeHtml(title)}</h2>
          ${headerClose ? `
            <button type="button" class="fmc-icon-button" data-modal-action="close" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ""}
        </header>
        <div class="fmc-modal-body">${content}</div>
        <footer class="${escapeAttribute(footerClass)}">
          ${extraActions}
          ${submitLabel ? `<button type="submit" class="fmc-primary">${escapeHtml(submitLabel)}</button>` : ""}
        </footer>
      </form>
    `;

    this.shell.appendChild(this.modal);

    return new Promise((resolve) => {
      const finish = (value) => {
        this.closeModal();
        resolve(value);
      };

      this.modal.addEventListener("click", async (event) => {
        const actionButton = event.target.closest("[data-modal-action]");
        if (!actionButton) return;

        const action = actionButton.dataset.modalAction;
        if (action === "close") finish(null);
        if (action === "toggle-favorite") {
          await this.toggleFavoriteItem(actionButton.dataset.itemId);
          actionButton.classList.toggle("active", this.isFavoriteItem(actionButton.dataset.itemId));
        }
        if (action === "use-item") {
          const itemId = actionButton.dataset.itemId;
          finish(null);
          await this.useItem(itemId);
        }
        if (action === "open-journal-page") {
          finish(null);
          await this.openJournalPage(actionButton.dataset.entryId, actionButton.dataset.pageId);
        }
        if (action === "edit-journal-page") {
          finish(null);
          await this.openJournalPage(actionButton.dataset.entryId, actionButton.dataset.pageId, true);
        }
        if (action === "back-journal") {
          finish(null);
          await this.openJournalEntry(actionButton.dataset.entryId);
        }
        if (action === "create-journal-page") {
          finish(null);
          await this.createJournalPage(actionButton.dataset.entryId);
        }
      });

      this.modal.addEventListener("click", async (event) => {
        const link = event.target.closest(".content-link[data-uuid], .content-link[data-id], a[data-uuid]");
        if (!link || !this.modal?.contains(link)) return;
        event.preventDefault();
        event.stopPropagation();
        await this.openLinkedDocument(link);
      });

      this.modal.querySelector("form").addEventListener("change", async (event) => {
        if (!onChange) return;
        const field = event.target.closest("[name^='field:']");
        if (!field) return;
        const formData = new FormData(event.currentTarget);
        await onChange(formData);
      });

      this.modal.querySelector("form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const value = await onSubmit?.(formData);
        finish(value ?? null);
      });
    });
  }

  closeModal() {
    this.modal?.remove();
    this.modal = null;
    this.pendingRollDialogResolve = null;
  }

  isFavoriteItem(itemId) {
    const legacyItems = game.settings.get(MODULE_ID, "favoriteItems") ?? {};
    return this.isFavoriteEntry(this.favoriteItemKey(itemId)) || Boolean(legacyItems[this.legacyFavoriteItemKey(itemId)]);
  }

  async toggleFavoriteItem(itemId) {
    if (!itemId) return;

    const key = this.favoriteItemKey(itemId);
    const legacyKey = this.legacyFavoriteItemKey(itemId);
    const entries = foundry.utils.deepClone(game.settings.get(MODULE_ID, "favoriteEntries") ?? {});
    const legacyItems = foundry.utils.deepClone(game.settings.get(MODULE_ID, "favoriteItems") ?? {});
    const active = Boolean(entries[key] || legacyItems[legacyKey]);

    if (active) {
      delete entries[key];
      delete legacyItems[legacyKey];
    } else {
      entries[key] = true;
    }

    await game.settings.set(MODULE_ID, "favoriteEntries", entries);
    await game.settings.set(MODULE_ID, "favoriteItems", legacyItems);
  }

  isFavoriteSkill(skillId) {
    return this.isFavoriteEntry(this.favoriteSkillKey(skillId));
  }

  async toggleFavoriteSkill(skillId) {
    await this.toggleFavoriteEntry(this.favoriteSkillKey(skillId));
  }

  isFavoriteEntry(key) {
    const entries = game.settings.get(MODULE_ID, "favoriteEntries") ?? {};
    if (entries[key]) return true;

    const legacyItems = game.settings.get(MODULE_ID, "favoriteItems") ?? {};
    return Boolean(legacyItems[key]);
  }

  async toggleFavoriteEntry(key) {
    if (!key) return;
    const entries = foundry.utils.deepClone(game.settings.get(MODULE_ID, "favoriteEntries") ?? {});
    if (entries[key]) delete entries[key];
    else entries[key] = true;
    await game.settings.set(MODULE_ID, "favoriteEntries", entries);
  }

  getFavoriteItems() {
    const actor = this.selectedActor;
    if (!actor) return [];

    const keys = this.getFavoriteKeys();
    const legacy = game.settings.get(MODULE_ID, "favoriteItems") ?? {};
    return actor.items.filter((item) => keys.has(this.favoriteItemKey(item.id)) || legacy[this.legacyFavoriteItemKey(item.id)]);
  }

  getFavoriteSkills() {
    const actor = this.selectedActor;
    if (!actor) return [];

    const keys = this.getFavoriteKeys();
    return Object.entries(actor.system?.skills ?? {}).filter(([key]) => keys.has(this.favoriteSkillKey(key)));
  }

  getFavoriteKeys() {
    const entries = game.settings.get(MODULE_ID, "favoriteEntries") ?? {};
    const legacy = game.settings.get(MODULE_ID, "favoriteItems") ?? {};
    return new Set([...Object.keys(legacy), ...Object.keys(entries)].filter((key) => legacy[key] || entries[key]));
  }

  favoriteItemKey(itemId) {
    return this.favoriteKey(`item:${itemId}`);
  }

  legacyFavoriteItemKey(itemId) {
    return this.favoriteKey(itemId);
  }

  favoriteSkillKey(skillId) {
    return this.favoriteKey(`skill:${skillId}`);
  }

  favoriteKey(entryId) {
    return `${this.selectedActorId ?? "world"}:${entryId}`;
  }

  async enrichDescription(html, relativeTo = null) {
    try {
      if (!globalThis.TextEditor?.enrichHTML) return html;
      return await TextEditor.enrichHTML(html, {
        async: true,
        documents: true,
        links: true,
        rolls: true,
        secrets: false,
        relativeTo,
        rollData: relativeTo?.getRollData?.()
      });
    } catch (error) {
      console.debug(`${MODULE_ID} | Description enrichment failed`, error);
      return html;
    }
  }

  async openLinkedDocument(link) {
    const uuid = link.dataset.uuid || link.dataset.documentUuid || link.dataset.link;
    const id = link.dataset.id;
    const type = link.dataset.type || link.dataset.documentClass;
    const pack = link.dataset.pack;
    let document = null;

    try {
      if (uuid) document = await fromUuid(uuid);
      if (!document && pack && id) document = await game.packs.get(pack)?.getDocument(id);
      if (!document && type && id) document = game.collections?.get(type)?.get(id) ?? game[type]?.get?.(id);
    } catch (error) {
      console.debug(`${MODULE_ID} | Linked document lookup failed`, error);
    }

    if (!document) {
      ui.notifications.info("Linked content is not available to this user.");
      return;
    }

    await this.openDocumentModal(document, link.textContent);
  }

  async openDocumentModal(document, fallbackTitle = "Linked Content") {
    const description = await this.enrichDescription(
      document.system?.description?.value ||
      document.system?.description?.chat ||
      document.text?.content ||
      document.pages?.contents?.[0]?.text?.content ||
      "<p>No description.</p>",
      document
    );

    this.openFormModal({
      title: document.name ?? fallbackTitle,
      submitLabel: "",
      footerClass: "fmc-item-footer",
      extraActions: `
        <span></span>
        <button type="button" class="fmc-footer-use" data-modal-action="close">Close</button>
        <span></span>
      `,
      content: `
        <div class="fmc-item-modal-head">
          <img src="${escapeAttribute(document.img || document.texture?.src || "icons/svg/book.svg")}" alt="">
          <div>
            <strong>${escapeHtml(document.documentName ?? document.type ?? "Document")}</strong>
            <span>${escapeHtml(document.uuid ?? "")}</span>
          </div>
        </div>
        <section class="fmc-description">
          ${description}
        </section>
      `
    });
  }

  patchViewportWarning() {
    const patch = () => {
      if (!ui?.notifications || ui.notifications._fmcPatched) return;
      for (const method of ["notify", "info", "warn", "error"]) {
        const original = ui.notifications[method]?.bind(ui.notifications);
        if (!original) continue;
        ui.notifications[method] = (message, ...args) => {
          if (this.active && this.isViewportWarningText(message)) return null;
          return original(message, ...args);
        };
      }
      ui.notifications._fmcPatched = true;
      this.startViewportWarningObserver();
    };

    Hooks.once("ready", patch);
    Hooks.on("renderNotifications", this.boundSuppressViewportWarning);
  }

  startViewportWarningObserver() {
    if (this.viewportWarningObserver || !document.body) return;
    this.viewportWarningObserver = new MutationObserver(() => this.suppressViewportWarning());
    this.viewportWarningObserver.observe(document.body, { childList: true, subtree: true });
  }

  isViewportWarningText(value) {
    const text = typeof value === "string" ? value : value?.message ?? value?.textContent ?? String(value ?? "");
    return /requires a usable window dimensions|usable window dimensions of 1024px by 768px|current dimensions of this window/i.test(text);
  }

  suppressViewportWarning() {
    if (!this.active) return;
    const notifications = document.querySelectorAll("#notifications .notification, .notification");
    for (const notification of notifications) {
      if (this.isViewportWarningText(notification.textContent ?? "")) {
        notification.remove();
      }
    }
  }

  async rollInitiative(combatantId) {
    const combat = game.combat;
    const combatant = combat?.combatants.get(combatantId);
    if (!combat || !combatant?.actor?.testUserPermission(game.user, "OWNER")) return;

    await combat.rollInitiative([combatantId]);
  }

  async endTurn() {
    const combat = game.combat;
    const current = combat?.combatant;
    if (!combat || !current?.actor?.testUserPermission(game.user, "OWNER")) return;

    await combat.nextTurn();
  }
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function getActivityList(item) {
  const activities = item.system?.activities;
  if (!activities) return [];
  if (Array.isArray(activities)) return activities;
  if (Array.isArray(activities.contents)) return activities.contents;
  if (typeof activities.values === "function") return Array.from(activities.values());
  if (typeof activities === "object") return Object.values(activities);
  return [];
}

function parseInputValue(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : trimmed;
}

function formatFormulaPart(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "";
  return number > 0 ? `+ ${number}` : `- ${Math.abs(number)}`;
}

function formatCompactSigned(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "";
  return number > 0 ? `+${number}` : `${number}`;
}

function parseRollSummaryText(text) {
  const match = String(text ?? "").match(/\b(\d+)\s*([+-])\s*(\d+)\s*=\s*(\d+)\b/);
  if (!match) return "";
  return `${match[1]}${match[2]}${match[3]}=${match[4]}`;
}

function formatRollSummary(roll) {
  const total = Number(roll?.total);
  if (!Number.isFinite(total)) return "";

  const diceTotal = getRollDiceTotal(roll);
  if (!Number.isFinite(diceTotal)) {
    return roll?.formula ? `${roll.formula}=${total}` : String(total);
  }

  const modifier = total - diceTotal;
  return `${diceTotal}${modifier ? formatCompactSigned(modifier) : ""}=${total}`;
}

function findNumberByKey(value, keyPattern, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (keyPattern.test(key)) {
      const number = Number(child);
      if (Number.isFinite(number)) return number;
    }

    const nested = findNumberByKey(child, keyPattern, seen);
    if (Number.isFinite(nested)) return nested;
  }

  return null;
}

function rollModeLabel(key, mode) {
  const label = typeof mode === "string" ? mode : mode?.label ?? mode?.name ?? key;
  return game.i18n?.localize?.(label) ?? String(label);
}

async function evaluateRollFormula(formula) {
  const roll = typeof Roll.create === "function" ? Roll.create(formula) : new Roll(formula);
  const evaluated = roll.evaluate({ allowInteractive: false });
  return evaluated instanceof Promise ? await evaluated : evaluated;
}

function formatBonusPart(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^[+-]/.test(text)) return `${text[0]} ${text.slice(1).trim()}`;
  return `+ ${text}`;
}

function adjustFormulaBonus(value, delta) {
  const formula = String(value ?? "").trim() || "1d20";
  const match = formula.match(/^(.*?)(?:\s*([+-])\s*(\d+))?\s*$/);
  const base = (match?.[1] || "1d20").trim() || "1d20";
  const current = match?.[2] ? Number(`${match[2]}${match[3]}`) : 0;
  const next = current + delta;
  if (next === 0) return base;
  return `${base}${next > 0 ? "+" : ""}${next}`;
}

function getFormulaBonus(value) {
  const match = String(value ?? "").trim().match(/[+-]\s*\d+\s*$/);
  return match ? Number(match[0].replace(/\s/g, "")) : 0;
}

function getRollModifier(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\s/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object") {
    for (const key of ["total", "value", "mod", "bonus"]) {
      if (value[key] !== undefined) {
        const parsed = getRollModifier(value[key]);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }

  return 0;
}

function abilityLabelFor(key) {
  const labels = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma"
  };

  return labels[key] ?? titleCase(key);
}

function skillLabelFor(key) {
  const systemLabel = CONFIG.DND5E?.skills?.[key]?.label;
  if (systemLabel) return localizeDnd5eLabel(systemLabel);
  return DND5E_SKILL_LABELS[key] ?? (game.i18n?.localize?.(`DND5E.Skill${titleCase(key).replace(/\s/g, "")}`) || titleCase(key));
}

function findDnd5eRollRequestMatches(text) {
  const value = String(text ?? "");
  const matches = [];

  for (const key of dnd5eSkillKeys()) {
    for (const label of dnd5eSkillSearchLabels(key)) {
      collectRollRequestMatches(matches, value, label, {
        kind: "skill",
        skill: key,
        label: `${skillLabelFor(key)} Check`
      }, /check/i);
    }
  }

  for (const key of ["str", "dex", "con", "int", "wis", "cha"]) {
    for (const label of dnd5eAbilitySearchLabels(key)) {
      collectRollRequestMatches(matches, value, label, {
        kind: "save",
        ability: key,
        label: `${abilityLabelFor(key)} Save`
      }, /saving throw|save/i);
      collectRollRequestMatches(matches, value, label, {
        kind: "ability",
        ability: key,
        label: `${abilityLabelFor(key)} Check`
      }, /ability check|check/i);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const match of matches.sort((a, b) => a.index - b.index)) {
    const key = `${match.kind}:${match.skill ?? match.ability}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(match);
  }
  return unique.map(({ index, ...match }) => match);
}

function collectRollRequestMatches(matches, text, label, request, suffixPattern) {
  const cleanLabel = String(label ?? "").trim();
  if (!cleanLabel || cleanLabel.length < 3) return;

  const regex = new RegExp(`\\b${escapeRegExp(cleanLabel)}\\b\\s*(?:ability\\s*)?(?:check|saving\\s+throw|save)?`, "gi");
  for (const match of text.matchAll(regex)) {
    const phrase = match[0] ?? "";
    const after = text.slice(match.index + phrase.length, match.index + phrase.length + 24);
    if (!suffixPattern.test(phrase) && !suffixPattern.test(after)) continue;
    matches.push({ ...request, index: match.index });
  }
}

function dnd5eSkillKeys() {
  const skills = CONFIG.DND5E?.skills ?? {};
  const keys = Object.keys(skills);
  return keys.length ? keys : Object.keys(DND5E_SKILL_LABELS);
}

function dnd5eSkillSearchLabels(key) {
  const skills = CONFIG.DND5E?.skills ?? {};
  return uniqueStrings([
    DND5E_SKILL_LABELS[key],
    skillLabelFor(key),
    localizeDnd5eLabel(skills[key]?.label)
  ]);
}

function dnd5eAbilitySearchLabels(key) {
  const abilities = CONFIG.DND5E?.abilities ?? {};
  return uniqueStrings([
    key.length > 3 ? key : "",
    abilityLabelFor(key),
    localizeDnd5eLabel(abilities[key]?.label)
  ]);
}

function findDnd5eAbilityKey(text) {
  const value = String(text ?? "").toLowerCase();
  const abilities = CONFIG.DND5E?.abilities ?? {};
  for (const key of ["str", "dex", "con", "int", "wis", "cha"]) {
    const labels = [
      key,
      abilityLabelFor(key),
      localizeDnd5eLabel(abilities[key]?.label),
      localizeDnd5eLabel(abilities[key]?.abbreviation)
    ].filter(Boolean).map((label) => String(label).toLowerCase());
    if (labels.some((label) => new RegExp(`\\b${escapeRegExp(label)}\\b`, "i").test(value))) return key;
  }
  return "";
}

function findDnd5eSkillKey(text) {
  const value = String(text ?? "").toLowerCase();
  const skills = CONFIG.DND5E?.skills ?? {};
  const keys = Object.keys(skills).length ? Object.keys(skills) : [
    "acr", "ani", "arc", "ath", "dec", "his", "ins", "itm", "inv", "med", "nat", "prc", "prf", "per", "rel", "slt", "ste", "sur"
  ];

  for (const key of keys) {
    const labels = [
      key,
      skillLabelFor(key),
      localizeDnd5eLabel(skills[key]?.label)
    ].filter(Boolean).map((label) => String(label).toLowerCase());
    if (labels.some((label) => new RegExp(`\\b${escapeRegExp(label)}\\b`, "i").test(value))) return key;
  }
  return "";
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function getPropertyValue(object, path) {
  if (!object || !path) return undefined;
  if (globalThis.foundry?.utils?.getProperty) return foundry.utils.getProperty(object, path);
  return String(path).split(".").reduce((value, key) => value?.[key], object);
}

function uniqueElements(elements) {
  return Array.from(new Set(elements.filter(Boolean)));
}

function uniqueStrings(values) {
  return Array.from(new Set(values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)));
}

function htmlToText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const div = document.createElement("div");
  div.innerHTML = text;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function htmlToPlainText(value) {
  const html = String(value ?? "");
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n");
  return (div.textContent || div.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
}

function plainTextToHtml(value) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  return text.split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function localizeDnd5eLabel(value) {
  if (!value) return "";
  return game.i18n?.localize?.(value) ?? value;
}

function getRollDiceResults(roll) {
  const dice = Array.isArray(roll?.dice) ? roll.dice : [];
  return dice.flatMap((die) => Array.from(die.results ?? [])
    .filter((result) => result.active !== false && !result.discarded && !result.rerolled)
    .map((result) => Number(result.result ?? result.count ?? 0))
    .filter(Number.isFinite));
}

function getRollDiceTotal(roll) {
  const results = getRollDiceResults(roll);
  if (!results.length) return null;
  return results.reduce((total, value) => total + value, 0);
}

function getRollDiceText(roll) {
  const results = getRollDiceResults(roll);
  if (!results.length) return "";
  const die = roll?.dice?.[0];
  const faces = die?.faces ? `d${die.faces}` : "dice";
  return `${faces} ${results.join("/")}`;
}

function isRollCommand(content) {
  return /^\/(?:r|roll)\s+/i.test(String(content ?? "").trim());
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSigned(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "-");
  return number >= 0 ? `+${number}` : String(number);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const companion = new FoundryMobileCompanion();

Hooks.once("init", () => companion.init());
Hooks.once("ready", () => companion.ready());

window.foundryMobileCompanion = companion;
