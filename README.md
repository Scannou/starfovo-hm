# starfovo

Personal tech blog. Static site built with [Zola](https://www.getzola.org/) and the
[zola-quiet](https://github.com/johnnybravo-xyz/zola-quiet) theme.

Live at <https://scannou.github.io/starfovo-hm/>.

&nbsp;

## Preview

Needs Zola 0.23.6 or newer (`brew install zola`). Run `zola serve` and open
<http://127.0.0.1:1111>; pages reload as you edit. In a fresh clone, run
`git submodule update --init` first to fetch the theme.

## Write a post

1. Create a folder in `content/posts/` named after the post's URL, e.g.
   `content/posts/my-post/`.
2. Add `index.md` with this header:

   ```toml
   +++
   title = "My post"
   date = 2026-10-31
   description = "One sentence for link previews and the feed."
   draft = true
   [taxonomies]
   tags = ["macos"]
   +++
   ```

3. Put images and videos in the same folder and link them by file name,
   e.g. `![Screenshot](screenshot.png)`.
4. Preview drafts with `zola serve --drafts`.
5. Delete `draft = true` to publish, then commit and push.

Posts with `##` headings get an "on this page" list in the sidebar.

## Layout

| Path | What it is |
|---|---|
| `config.toml` | Site title, URL, author, profile links, visitor counter, feed and highlighting settings |
| `content/` | Home intro (`_index.md`), about page, and posts |
| `templates/base.html` | Copy of the theme's base template with site changes (see below) |
| `templates/index.html` | Copy of the theme's home page template with SoundCloud and Last.fm links |
| `static/site.css` | Site styles loaded after the theme's stylesheet |
| `static/destroy.js` | Easter egg, loaded only when triggered (see below) |
| `themes/zola-quiet/` | The theme, as a git submodule |
| `.github/workflows/deploy.yml` | Builds and deploys to GitHub Pages |

## Theme changes

The theme is used as-is, except for `templates/base.html` and
`templates/index.html`, which override the theme's copies. The `base.html`
override:

- uses only the terminal (TUI) skin and removes the skin toggle (the
  light/dark toggle stays)
- always renders the sidebar, without the ASCII signature box
- adds the `❯ starfovo` title above the content, styled in `static/site.css`
- adds SoundCloud and Last.fm icons to the footer icons
- loads the [GoatCounter](https://www.goatcounter.com/) visitor counter script
  from `gc.zgo.at`, as hosted GoatCounter needs (`goatcounter_domain` in
  `config.toml`'s `[extra]` turns the counter on)
- adds the easter egg loader and the ☺ trigger in the footer

The `index.html` override adds SoundCloud and Last.fm links (`soundcloud`
and `lastfm` in `config.toml`'s `[extra]`) to the home page's connect section.

Because of the overrides, changes to the theme's own copies of these files
don't apply automatically. Each file's header comment names the theme commit
it was copied from.

To update the theme:

```sh
git -C themes/zola-quiet pull origin main
diff themes/zola-quiet/templates/base.html templates/base.html   # port any changes
diff themes/zola-quiet/templates/index.html templates/index.html
zola serve                                                       # check it
git add themes/zola-quiet templates/base.html templates/index.html
```

## Easter egg

Type `boom` on any page, or click the faint ☺ in the footer, to load
`static/destroy.js`. A stick figure appears and shoots the page apart:

- ←/→ or A/D to run, ↑ or W to jump, ↓ or S to drop down, the mouse to aim,
  click (hold) or Space to shoot
- the figure can stand on words, images and other elements, jump up through
  them, and falls when the one under it is shot
- on touch screens, tap to shoot (the figure doesn't move)
- Esc or the `[x]` box quits and restores the page; nothing is saved

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and
publishes it to GitHub Pages. The repo's Settings → Pages → Source must be set to
**GitHub Actions**.

The workflow downloads a fixed Zola release and checks it against a SHA-256
checksum. To upgrade Zola, update `ZOLA_VERSION` and `ZOLA_SHA256` in the workflow.
The checksum for each file is listed on the
[Zola releases page](https://github.com/getzola/zola/releases). The GitHub Actions
are pinned to commit SHAs for the same reason.

The site URL comes from GitHub Pages at build time, so adding a custom domain later
only needs the domain set in Settings → Pages; `base_url` in `config.toml` is used
for local builds.
