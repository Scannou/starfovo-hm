+++
title = "foobar2000 on macOS: from the bare window to a proper setup"
date = 2026-10-31
updated = 2026-11-14
description = "A beginner's guide to foobar2000 on macOS: the layout editor, installing components, and five that make it feel like home."
[taxonomies]
tags = ["foobar2000", "macos", "audio"]
+++

foobar2000 on macOS is a great player, but out of the box it's a bare window with a plain track list. The Windows version has decades of components and tutorials. The Mac version has neither the tutorials nor most of the components.

This post (and the two-minute video below) takes you from a fresh install to this:

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

## 1. Install foobar2000 *(0:05)*

Download the latest stable version (2.26.2 at the time of writing) from [foobar2000.org/mac](https://www.foobar2000.org/mac). Open the `.dmg` and drag foobar2000 into Applications.

You'll need **macOS 12 Monterey or newer**, on Intel or Apple Silicon.

## 2. The layout editor *(0:12)*

This is the part most newcomers never find. foobar2000's window isn't fixed: it's built from **UI elements** described in a short text file.

Open it from the macOS menu bar: **View → Layout → Edit Layout…**. There's no drag-and-drop or right-click editing: you type element names into the text and click **Apply**.

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

## 3. Install the components *(0:26)*

1. Download the `.fb2k-component` files from the repo's [Releases page](https://github.com/JendaT/fb2k-components-mac-suite/releases).
2. Open **Preferences** (⌘,) **→ Components**, click **+** and choose the downloaded files.
3. Restart foobar2000 when it asks.

Double-clicking a `.fb2k-component` file doesn't install it, and neither does copying it into the components folder. After the restart, the new elements are available by name in the layout editor.

## 4. SimPlaylist *(0:35)*

Replace the stock playlist view in your layout with `simplaylist`. Click **Apply**, and you get:

- tracks grouped by album, with the cover art next to each group
- the columns you choose
- smooth scrolling, even on huge playlists

Change grouping and columns in **Preferences → Display → SimPlaylist**.

## 5. Waveform Seekbar *(0:50)*

Add `waveform-seekbar` at the top of the layout. It draws the entire track, not just what's playing right now, so you can see the quiet intro, the build-up and the drop at a glance. **Click anywhere to jump there.**

All styling is in **Preferences → Display → Waveform Seekbar**:

- **Style:** Layered, Two-tone (the default), Glow, Heat, Heat map, Rainbow or Solid.
- **Channels:** Stereo, Mono or Split.
- **Colours:** theme presets shared with the Spectrum Analyzer (P31/P3/P4/P7 phosphors, Nord, Dracula and more), or your own.
- **Extras:** shading of the part already played, and red clip markers where a track hits full scale.

For the numbers, hover the seekbar, click the cog at the bottom right and choose **Analytics**. You get a readout under the mouse (time, loudness, peak, crest, stereo correlation) and a loudness summary for the whole track.

Each track is analysed once and cached, so it loads instantly the next time.

## 6. Spectrum Analyzer *(1:04)*

Add `spectrum` right under the seekbar. It runs its own FFT on the audio foobar2000 plays and shows how loud each frequency is, live.

The default is **Curve** mode with "line + color bars", where vertical stripes brighten wherever a frequency is louder. Again, everything else is in **Preferences → Display → Spectrum Analyzer**:

- **Draw mode:** Curve or Bars. Bars mode shows 96 bars by default; set **Bars** to **Auto** to fit as many as the panel allows, up to 2048.
- **Frequency scale:** logarithmic, compact-bass logarithmic or linear.
- **Theme:** 14 presets, the same ones the seekbar uses. Pick P31 green in both and they match, like in the video.

Two handy tricks inside the panel itself:

- **Hover** to read the frequency, the nearest note and the level under the cursor.
- **Double-click** to go full-screen.

## 7. Queue Manager *(1:20)*

Windows foobar2000 always had a visible queue. Now the Mac has one too. Put it next to SimPlaylist:

```
splitter vertical style=thin
  simplaylist
  tabs
    queue_manager tab-name="Queue"
    selection-properties tab-name="Now Playing"
```

`selection-properties` is foobar2000's built-in track info panel, so the second tab shows details of the selected track.

How to use it:

- **Add tracks** by selecting them in SimPlaylist and pressing **Q**, or with right-click → **Playback → Add to playback queue**.
- **Drag** tracks in from SimPlaylist, or within the queue to reorder.
- **Enter** or a double-click plays a track; **Delete** removes it.
- The queue **comes back after a restart** (you can turn that off in **Preferences → Display → Queue Manager**).
- **Stop After Queue** stops playback once the queue runs out. It's in the Playback menu, the queue's right-click menu and Preferences.

## 8. Last.fm Scrobbler *(1:34)*

Open **Preferences → Tools → Last.fm Scrobbler** and sign in. Authorisation happens in your browser, so foobar2000 never sees your password.

- A track is scrobbled after **50% of it or 4 minutes**, whichever comes first.
- **Now Playing** updates show your profile what's playing right now.
- Offline? Scrobbles wait in a queue and are sent automatically later.
- Options: scrobble only tracks in your Media Library, and whether streams like radio count.
- Optional: add `lastfm_scrobbler` to your layout for a stats panel with your top artists, albums and tracks, recent plays and listening streak.

## 9. The whole layout *(1:46)*

Here's the full layout from the video. Paste it into **View → Layout → Edit Layout…** and click **Apply**:

```
splitter horizontal style=thin
  waveform-seekbar
  spectrum
  splitter vertical style=thin
    simplaylist
    tabs
      queue_manager tab-name="Queue"
      selection-properties tab-name="Now Playing"
  playback-controls
```

From top to bottom: waveform seekbar, spectrum, then SimPlaylist with a Queue / Now Playing tab panel beside it, and the playback controls at the bottom.

## Where next

The suite has more than these five. **Playlist Organizer** gives you folders for your playlists, **Album Art (Extended)** shows back covers and disc art, and **Effects DSP** adds echo, reverb, pitch shift and more. You'll find them all in the [repo](https://github.com/JendaT/fb2k-components-mac-suite).

Found a bug or missing a component you loved on Windows? [Open an issue](https://github.com/JendaT/fb2k-components-mac-suite/issues).

&nbsp;

*Music in the video: Repulsive Force – Everything can levitate.*
