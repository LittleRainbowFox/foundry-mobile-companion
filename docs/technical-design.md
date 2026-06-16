# Technical Design

## Module Goal

The module provides a mobile-only player shell that sits inside the normal Foundry browser session. It does not create a separate server, proxy, or external client.

When a player or trusted player joins a world from a phone, the module:

1. Detects the mobile context.
2. Hides the standard Foundry UI locally.
3. Renders a portrait-first mobile interface.
4. Uses normal Foundry documents, permissions, hooks, and update methods.

## Activation Rules

The MVP activates only when all of the following are true:

- The world setting `Enable mobile companion` is enabled.
- The current user is a Player or Trusted Player.
- The system is DnD5e.
- The client is detected as mobile, or the client setting `Force mobile interface on this client` is enabled.
- The user has not chosen to exit to the standard UI in the current page session.

Mobile detection combines:

- Android/iOS user-agent checks
- touch capability
- portrait orientation
- narrow viewport

The result is intentionally conservative and will be tuned after real Android/iPhone tests.

## UI Architecture

The first implementation avoids deep dependency on Foundry's ApplicationV2 lifecycle and renders a single fixed DOM shell. This keeps the module resilient while Foundry v14 details are validated.

Main pieces:

- `scripts/main.js`
  - module settings
  - mobile detection
  - UI shell rendering
  - actor selection
  - tab rendering
  - DnD5e roll/update adapters
- `styles/mobile.css`
  - Foundry-like dark mobile theme
  - standard UI hiding
  - bottom navigation
  - touch-friendly controls

Later, once behavior is stable, the UI can be split into smaller files/components.

## State

The MVP state is session-local:

- selected actor id
- current tab
- standard UI exit flag
- roll dialog state

The selected actor and active tab are not persisted in MVP.

## Permission Model

The module uses Foundry's own permission checks:

- Actors shown in the picker require at least Observer permission.
- Edits require Owner permission.
- Combat actions require ownership of the combatant actor and normal Foundry combat state.
- Future Journal work will rely on Foundry Journal permissions.

The module should not bypass campaign permissions.

## DnD5e Integration

The MVP reads commonly used DnD5e actor paths:

- `system.abilities`
- `system.skills`
- `system.attributes.hp`
- `system.attributes.ac`
- `system.attributes.prof`
- `system.attributes.movement`
- `system.resources`
- `system.currency`
- item collections for spells, inventory, and features

Rolls call DnD5e actor/item methods when available:

- `actor.rollAbilityTest`
- `actor.rollAbilitySave`
- `actor.rollSkill`
- `item.use`
- `item.roll`

Because DnD5e method signatures can change, roll calls are wrapped with fallbacks and user-facing warnings.

## MVP Tabs

### Character

Displays core stats, HP, temp HP, death saves, abilities, saves, skills, and currency.

Editable fields:

- HP
- temp HP
- death saves
- resources
- currency

### Spells

Displays spell items grouped by level.

Editable fields/actions:

- prepared state when available
- spell slot values through the compact sticky slot bar
- existing spell item sheet access
- item use/roll

### Inventory

Displays inventory-like items grouped by item type.

Editable fields/actions:

- quantity
- equipped
- attuned
- existing item sheet access
- item use/roll

### Features

Displays feats, class features, race/background/subclass items, and actions where represented as items.

Editable fields/actions:

- uses/charges where available
- existing item sheet access
- item use/roll

### Combat

Displays the active encounter.

Actions:

- roll initiative for owned combatants without initiative
- end turn only when the active combatant is owned by the current user

### Audio

Placeholder in MVP.

### Chat

Placeholder in MVP.

### Settings

Contains:

- actor switcher
- module/runtime information
- double-confirm exit to standard Foundry UI until reload

## Future Phases

1. Chat tab with mobile-adapted roll cards and message composer.
2. Journal tab with JournalEntry and page creation/editing.
3. Full local audio controls for Music, Environment, and Interface.
4. Refined mobile detection and manual debug tools.
5. Android APK wrapper.
6. Optional system adapters beyond DnD5e.
