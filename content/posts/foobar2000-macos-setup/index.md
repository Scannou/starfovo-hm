+++
title = "foobar2000 on macOS: from the bare window to a proper setup"
date = 2026-10-31
description = "A beginner's guide to foobar2000 on macOS: the layout editor, installing components, and five that make it feel like home."
[taxonomies]
tags = ["foobar2000", "macos", "audio"]
+++

foobar2000 on macOS is a great player, but out of the box it's a bare window with a plain track list. The Windows version has decades of components and tutorials. The Mac version has neither the tutorials nor most of the components.

This post (and the video below, under 3 minutes) takes you from a fresh install to this:

<video controls preload="metadata" playsinline width="1920" height="1080" poster="fb2k-macos-tutorial-poster.jpg">
  <source src="fb2k-macos-tutorial.mp4" type="video/mp4">
  Your browser can't play this video. <a href="fb2k-macos-tutorial.mp4">Download it</a> instead.
</video>

You'll set up five components from the [fb2k-components-mac-suite](https://github.com/JendaT/fb2k-components-mac-suite), a set of Mac components Jenda and I have been building:

- **SimPlaylist**: a playlist grouped by album, with cover art
- **Waveform Seekbar**: shows the whole track as a waveform, and you click to seek
- **Spectrum Analyzer**: a real-time frequency display
- **Queue Manager**: a visible, reorderable playback queue
- **Last.fm Scrobbler**: logs what you listen to on Last.fm

> Fair warning: the components are a work in progress. They're tested daily, but things can still break.

## 1. Install foobar2000 *(0:07)*

Download the latest stable version (2.26 at the time of writing) from [foobar2000.org/mac](https://www.foobar2000.org/mac). Open the `.dmg` and drag foobar2000 into Applications.

foobar2000 itself runs on macOS 11 Big Sur or newer, on Intel and Apple Silicon. **The components need macOS 12 Monterey or newer.**

## 2. The layout editor *(0:17)*

This is the part most newcomers never find. foobar2000's window isn't fixed: it's built from **UI elements** described in a short text file.

Open it from the macOS menu bar: **View → Layout → Edit Layout**.

A fresh layout looks roughly like this:

```
splitter horizontal style=thin
  (the stock playlist view)
  playback-controls
```

The rules are simple:

- **Each line is one element.**
- **Indentation means nesting.** Two spaces put an element inside the splitter or tabs above it.
- `splitter horizontal` stacks its children **top to bottom**.
- `splitter vertical` puts them **side by side**.
- `tabs` turns its children into tabs, and `tab-name="…"` sets each tab's title.

Copy your current layout somewhere before experimenting, so you can always paste it back.

## 3. Install the components *(0:37)*

1. Download the `.fb2k-component` files from the repo's [Releases page](https://github.com/JendaT/fb2k-components-mac-suite/releases).
2. Open **Preferences → Components** and add the downloaded files.
3. Restart foobar2000.

That's it. The new elements are now available in the layout editor.

## 4. SimPlaylist *(0:49)*

Replace the stock playlist view in your layout with:

```
simplaylist
```

You get:

- tracks grouped by album, with the cover art next to each group
- the columns you choose
- smooth scrolling, even on huge playlists

Change grouping and columns in **Preferences → Display → SimPlaylist**.

## 5. Waveform Seekbar *(1:11)*

Add `waveform-seekbar` at the top of the layout. It draws the entire track, not just what's playing right now, so you can see the quiet intro, the build-up and the drop at a glance. **Click anywhere to jump there.**

All styling is in **Preferences → Display → Waveform Seekbar**:

- **Style:** Layered, Two-tone (the default), Glow, Heat, Heat map, Rainbow or Solid.
- **Channels:** Stereo, Mono or Split.
- **Colours:** theme presets shared with the Spectrum Analyzer (P31/P3/P4/P7 phosphors, Nord, Dracula and more), or your own.
- **Extras:** shading of the part already played, a hover readout (time, loudness, peak), and red clip markers where a track hits full scale.

Each track is analysed once and cached, so it loads instantly the next time.

## 6. Spectrum Analyzer *(1:29)*

Add `spectrum` right under the seekbar. It reads foobar2000's own FFT stream and shows how loud each frequency is, live.

The default is **Curve** mode with "line + color bars", where vertical stripes brighten wherever a frequency is louder. Again, everything else is in **Preferences → Display → Spectrum Analyzer**:

- **Draw mode:** Curve or Bars. Bars mode fits as many bars as the panel allows, up to 2048.
- **Frequency scale:** logarithmic, compact-bass logarithmic or linear.
- **Theme:** 14 presets, the same ones the seekbar uses. Pick P31 green in both and they match, like in the video.

Two handy tricks inside the panel itself:

- **Click and hold** to read the exact frequency under the cursor.
- **Double-click** to go full-screen.

## 7. Queue Manager *(1:51)*

Windows foobar2000 always had a visible queue. Now the Mac has one too. Put it next to SimPlaylist:

```
splitter vertical style=thin
  simplaylist
  tabs
    queue_manager tab-name="Queue"
    albumart tab-name="Now Playing"
```

How to use it:

- **Drag tracks** from SimPlaylist into the queue, and drag within it to reorder.
- **Double-click or Enter** plays a track; **Delete** removes it.
- The queue **survives a restart**.
- **Stop After Queue** stops playback once the queue runs out. It's in the Playback menu, the queue's right-click menu and Preferences.

## 8. Last.fm Scrobbler *(2:09)*

This one has no panel. Open **Preferences → Tools → Last.fm Scrobbler** and sign in. Authorisation happens in your browser, so foobar2000 never sees your password.

- A track is scrobbled after **50% of it or 4 minutes**, whichever comes first.
- **Now Playing** updates show your profile what's playing right now.
- Offline? Scrobbles wait in a queue and are sent automatically later.
- Options: scrobble only tracks in your Media Library, and whether streams like radio count.

## 9. The whole layout *(2:26)*

Here's the full layout from the video. Paste it into **View → Layout → Edit Layout**:

```
splitter horizontal style=thin
  waveform-seekbar
  spectrum
  splitter vertical style=thin
    simplaylist
    tabs
      queue_manager tab-name="Queue"
      albumart tab-name="Now Playing"
  playback-controls
```

From top to bottom: waveform seekbar, spectrum, then SimPlaylist with a Queue / Now Playing tab panel beside it, and the playback controls at the bottom.

## Where next

The suite has more than these five. **Playlist Organizer** gives you folders for your playlists, **Album Art (Extended)** shows back covers and disc art, and **Effects DSP** adds echo, reverb, pitch shift and more. You'll find them all in the [repo](https://github.com/JendaT/fb2k-components-mac-suite).

Found a bug or missing a component you loved on Windows? [Open an issue](https://github.com/JendaT/fb2k-components-mac-suite/issues).
