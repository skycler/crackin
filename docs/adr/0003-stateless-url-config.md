# Stateless design with URL-param session config

The app holds no server state, no user accounts, and no persistent storage. All session parameters (active drawers, active modes, challenge types, difficulty) are encoded as URL query parameters. A parent configures a session via an in-app settings screen; the screen generates a shareable URL. Handing a child a link is the entire onboarding flow. This keeps the app deployable as a static GitHub Pages site with zero backend, and makes per-child configuration trivial without requiring accounts or login.
