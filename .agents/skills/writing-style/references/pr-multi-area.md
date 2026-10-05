Moves the Marketplace pages from `hass` to Lit contexts, and lets the shared page layouts work without `hass` so other panels can follow.

**Shared layouts**

- `hass-tabs-subpage` reads config and translations from `configContext` and `internationalizationContext`.
- Each keeps an optional, unread `hass` property so the existing callers keep working. It can go once they have moved over.

**Marketplace**

- The router stops setting `hass` on its pages. The panel and router still use `hass` for now.
