# Buddy design system

## Product surface

Buddy is an Operate-mode budgeting and shared-expense app. Its visual treatment may evoke motorsport, but the job stays practical: make budgets, balances, and settlement states easy to understand at a glance.

## Visual worlds

Users choose from one appearance dropdown containing six visual themes in both light and dark modes. Buddy Classic is the restrained, motorsport-neutral option; Pit Wall Precision remains the first-run default. English UI across themes uses locally bundled Quicksand, an independently licensed close visual match to the supplied specimen; the image did not identify an exact font family. Thai text retains the existing Thai font stack. `data-theme` selects the visual world and `data-color-mode` selects its color scheme. The existing preference keys remain separate for compatibility, while the dropdown updates both together.

The shared dashboard layout uses a Pit Wall information hierarchy across the original four themes: a compact dark control bar groups Buddy, language and appearance controls; primary navigation sits directly below it; finance summaries emphasize key totals and clearly distinguish settled from outstanding items. Decision Cockpit adds a dark vertical navigation rail, a restrained orange action accent, a light or dark workspace, and a compact local-data breadcrumb while keeping the same Buddy finance data and controls. Once a profile is active, profile management stays compact and backup tools are tucked into a disclosure so the selected finance task stays prominent. This is an original Buddy layout informed by general dashboard conventions, not a reproduction of any racing team's or series' branding or proprietary interface.

| Theme | Light palette | Dark palette | Material and composition |
|---|---|---|---|
| Buddy Classic | Neutral `#F5F6F7`, charcoal `#252B30`, Buddy evergreen `#356B54`, slate accent `#65727D` | Charcoal `#171A1D` / `#22272B`, evergreen actions, neutral slate accent | Plain surfaces, understated borders, standard control radii |
| Pit Wall Precision | Graphite `#20272D`, warm white `#F4F5F2`, Buddy evergreen `#356B54`, lap red `#D62828` | Graphite `#151B21` / `#20272D`, evergreen actions, muted red accent | Crisp dividers, tabular figures, restrained red markers, compact corners |
| British Racing Heritage | Deep green `#174B3B`, ivory `#F2EFE6`, cream `#FFFCF5`, brass `#A68C5E` | Forest-charcoal `#171D19` / `#222B25`, warm ivory, brass details | Softer edges, editorial headings, quiet and durable surfaces |
| Telemetry Sprint | Ink `#18232D`, cool light `#F3F6F8`, telemetry blue `#2869A6`, electric lime `#C2E812` | Deep blue-charcoal `#101A23` / `#192734`, blue actions, lime markers | Tighter geometry, aligned tabular numbers, bright non-status emphasis |
| Decision Cockpit | Cool light `#F1F3F5`, dark rail `#191D21`, warm orange `#B5431D` | Charcoal `#14171A` / `#202428`, warm orange `#FF9A70` | Workspace-style layout with a persistent sidebar, breadcrumb, compact panels, and factual budget summaries |
| Editorial | Warm stone `#F3F1EC`, ink `#25232A`, muted plum `#62404F`, copper `#A36F58` | Near-black `#18171A` / `#242227`, deep plum `#81566A`, warm copper `#D1A286` | Calm finance surfaces, clean Quicksand typography, and restrained editorial accents |

The selected theme preference is stored as `buddy-visual-theme`. The existing `buddy-theme` preference continues to store `light` or `dark`, preserving existing users' choices.

## Shared rules

- The in-app Buddy mark uses the Figma-authored racing B monogram, adapting to the selected theme's primary color in light mode and its high-contrast foreground in dark mode; the dark control bar uses its dashboard foreground. The installable app icon uses the green mark on a dark `#1E1E1E` square background. Avoid gradients, gloss, highlights, and glass effects in the logo.
- Use the bundled, SIL OFL Quicksand font throughout the English interface. Keep the existing Thai font stack and theme-specific Thai heading styles for readability.
- Keep financial amounts and all important copy readable in both modes; color never carries success, debt, or settlement meaning alone.
- Reserve semantic green and red for financial states. Telemetry lime and heritage brass are decorative or navigational accents, not status colors.
- Keep the established finance layout, data, and controls intact across themes. Do not add team or driver marks, checkerboard wallpaper, faux speedometers, or decorative data that resembles real account information.
- Keep the combined theme and color-mode dropdown keyboard accessible with a visible label, visible focus, and a touch target of at least 44px.
- On narrow screens, keep the full-width dropdown within the dashboard header without horizontal overflow.
- In Decision Cockpit, collapse the desktop sidebar into a compact top navigation on narrow screens; keep profile, budget, expense, category, and backup workflows intact.
