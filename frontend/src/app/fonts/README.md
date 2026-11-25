# Local typefaces

These eight typefaces come from the [Google Fonts repository](https://github.com/google/fonts/tree/83c62e30d87daa70216dab6b984d00d20d96d585/ofl) at revision `83c62e30d87daa70216dab6b984d00d20d96d585`. Each WOFF2 file is a format conversion of the corresponding upright variable TTF. The conversion retains the original glyph coverage, font names, and variation axes. Each family’s original SIL Open Font License is included alongside the font.

`layout.tsx` loads the files through `next/font/local`. Only DM Sans and Vollkorn are preloaded because CampusKit is the default theme. The browser loads the other families as needed.
