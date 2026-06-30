<h1 align="center"><!-- HTML4, but GitHub strips inline styles -->
  Time Station Emulator
  <br>
  <br>
  <img src="timestation.svg" alt="Logo" width="128" height="128">
  <br>
  <br>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
  </a>
  <a href="https://github.com/kangtastic/timestation/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/kangtastic/timestation/deploy.yml" alt="GitHub Actions Workflow Status">
  </a>
  <a href="https://codecov.io/gh/kangtastic/timestation">
    <img src="https://codecov.io/gh/kangtastic/timestation/graph/badge.svg?token=6VVYW8WBLG" alt="Codecov">
  </a>
  <br>
  <img src="https://img.shields.io/badge/C-A8B9CC.svg?style=for-the-badge&logo=C&logoColor=black" alt="C">
  <img src="https://img.shields.io/badge/Lit-324FFF.svg?style=for-the-badge&logo=Lit&logoColor=white" alt="Lit">
  <img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/WebAssembly-654FF0.svg?style=for-the-badge&logo=WebAssembly&logoColor=white" alt="WebAssembly">
</h1>

## Overview

**Time Station Emulator** turns almost any phone or tablet into a low-frequency
radio transmitter broadcasting a time signal that can synchronize most
radio-controlled (&ldquo;atomic&rdquo;) clocks and watches.

Real time signal broadcasts are limited in geographic range and notoriously
prone to interference in urban areas, so many such clocks end up never actually
using their self-setting functionality. **Time Station Emulator** may allow
setting such clocks when/where a suitable signal is not otherwise available.

## Features

- **Compatible with most radio-controlled clocks**: Emulates the five
  operational radio time signal stations
  ([&#127464;&#127475; BPC](<https://en.wikipedia.org/wiki/BPC_(time_signal)>),
  [&#127465;&#127466; DCF77](https://en.wikipedia.org/wiki/DCF77),
  [&#127471;&#127477; JJY](https://en.wikipedia.org/wiki/JJY),
  [&#127468;&#127463; MSF](<https://en.wikipedia.org/wiki/Time_from_NPL_(MSF)>),
  and [&#127482;&#127480; WWVB](https://en.wikipedia.org/wiki/WWVB)).
- **Network time**: Derives the current time from the network using an NTP-like
  algorithm.
- **Location-agnostic**: Supports applying an offset to the transmitted time of
  &pm;24 hours from the present.
- **BST/CEST/DST-aware**: Transmits daylight saving time information for DCF77,
  MSF, and WWVB.
- **Leap second-aware**: Transmits a DUT1 offset for MSF and WWVB.
- **Client-side, browser-based**: Runs entirely in the browser; no
  installation, no signup, no data collection.

## Requirements

The hard requirements of note are browser WebAssembly support and DAC support
for &ge;44.1 KHz PCM. Almost any device running a browser from &ge;2019 should
work.

In general, **Time Station Emulator** works best with a
**built-in speaker** of a **phone or tablet**. See
[Technical Details](#technical-details) for an explanation.

As of early 2024, **Safari on iOS** and **Firefox on Android** had multiple
breaking issues that prevented them from working. As of early 2026, these
issues appear to have been resolved for at least some users. Good luck!

## Usage

Open **Time Station Emulator** in a browser after [self-hosting](#self-hosting):

- **Phone/tablet on LAN:** `https://<host>:356` (accept the self-signed certificate warning)
- **On the Mac itself:** `http://localhost:357`

<details>
  <summary>click to expand/hide</summary>

1. **Choose emulator settings.**

   The most important setting is which time station to emulate. Certain settings
   are only available for certain stations.

   Clocks (or watches) that support more than one station may prefer one of them
   over the others.

2. **Choose any clock settings and place the clock into sync mode.**

   If your clock has them, try to choose station and/or time zone settings that
   make sense for your location.

   Most clocks provide a way to force a synchronization attempt. You will
   probably have to navigate menus and/or press physical buttons.

3. **Position the speaker as close as possible to the clock’s antenna.**

   The transmission range is quite short, so positioning is crucial. Some
   experimentation will probably be required, especially if you’re unsure where
   the antenna is.

   The volume should be set so that the clock picks up the cleanest signal.
   Usually, this occurs at or near the maximum possible volume.

   | WARNING |
   | --- |
   | **DO NOT PLACE YOUR EARS NEAR THE SPEAKER TO DETERMINE VOLUME.**<br><br>Use a visual volume indicator instead.<br><br>The generated waveform has full dynamic range, but is pitched high enough to be difficult to perceive.<br><br>**Even if you &ldquo;can&rsquo;t hear anything&rdquo;,** many common devices are capable of playing it back loud enough to potentially cause **permanent hearing damage!** |

4. **Start transmitting and hold the speaker in position.**

   If all goes well, the clock will set itself within three minutes.

</details>

## Self-hosting

The app is packaged as a multi-arch Docker image (`linux/amd64` and
`linux/arm64`) published to GitHub Container Registry on every push to `main`.

### Mikrotik NTP

Enable the NTP server on your Mikrotik router:

```routeros
/system ntp client set enabled=yes mode=unicast
/system ntp client servers add address=time.google.com
/system ntp server set enabled=yes
```

Your Mikrotik LAN IP is the NTP server for the network (e.g. `10.10.20.20`).

### Mac host time (recommended for Portainer on Mac)

Portainer does not configure NTP. On Docker Desktop for Mac, containers inherit
the clock from the Mac host — sync the **Mac** to Mikrotik instead of chrony
inside each container.

**Terminal on the Mac Mini:**

```sh
sudo systemsetup -setusingnetworktime on
sudo systemsetup -setnetworktimeserver 10.10.20.20
```

Verify:

```sh
sntp -s 10.10.20.20
systemsetup -getnetworktimeserver
```

**System Settings:** General → Date & Time → enable automatic date and time.

With the host clock correct, set `CHRONY_DISABLE=true` in the stack (default in
[`docker-compose.yml`](docker-compose.yml)) and skip per-container NTP.

### Portainer (Mac Mini / Apple Silicon)

1. Make the GHCR package public, or add registry credentials in Portainer
   (`ghcr.io`, your GitHub username, and a personal access token with
   `read:packages`).
2. In Portainer: **Stacks → Add stack → Web editor**.
3. Paste the contents of [`docker-compose.yml`](docker-compose.yml).
4. Set `TLS_SAN` to include your server IP, e.g.
   `DNS:localhost,IP:127.0.0.1,IP:10.10.20.22`.
5. Deploy the stack.

**URLs:**

| Device | URL |
| --- | --- |
| Phone/tablet on Wi‑Fi | `https://<server-ip>:356` |
| Mac browser (local test) | `http://localhost:357` |

Browsers require a **secure context** (HTTPS or localhost). Plain
`http://<ip>:356` will not work.

On first visit via HTTPS, accept the self-signed certificate warning.

The stack pulls `ghcr.io/sniffy1988/timestation:latest` (built by this fork's
GitHub Actions on push to `main`).

On Apple Silicon, Portainer pulls the `linux/arm64` manifest automatically from
the multi-arch `:latest` tag.

### Local build

To build and run without pulling from GHCR:

```sh
NTP_SERVER=192.168.88.1 docker compose -f docker-compose.build.yml up --build
```

### Verify time sync

- On the Mac: `sntp -s 10.10.20.20` should return a small offset (e.g. `+0.08`).
- In browser devtools, confirm `HEAD` requests to `serverTime.*` return a
  `Date` header and COI headers (`Cross-Origin-Opener-Policy`,
  `Cross-Origin-Embedder-Policy`).

### NTP troubleshooting (Linux host only)

If you run Docker on **Linux** (not Mac), you can enable in-container chrony
instead of host sync:

```yaml
environment:
  NTP_SERVER: 10.10.20.20
  CHRONY_DISABLE: "false"
```

Add `cap_add: [SYS_TIME, SYS_NICE]` on a **standalone** Docker endpoint.

## Technical Details

<details>
  <summary>click to expand/hide</summary>

**Time Station Emulator** generates an audio waveform intentionally crafted to
create, when played back through consumer-grade audio hardware, the right kind
of RF noise to be mistaken for a time station broadcast.

Specifically, given a fundamental carrier frequency used by a real time station,
it generates and modulates the highest odd-numbered subharmonic that also falls
below the Nyquist frequencies of common playback sample rates.

One of the higher-frequency harmonics inevitably created by any real-world DAC
during playback will then be the original fundamental, which should leak to the
environment as a short-range radio transmission via the ad-hoc antenna formed by
the physical wires and circuit traces in the audio output path.

| NOTE |
| --- |
| Because it relies upon this leakage, **Time Station Emulator** works best with a **built-in speaker** of a **phone or tablet**.<br><br>In some cases, **wired headphones or earbuds** may also be suitable.<br><br>Higher-frequency harmonics are considered artifacts beyond the range of human hearing, so they are routinely suppressed by audio compression algorithms and better equipment.<br><br> Bluetooth devices and audiophile-grade equipment are therefore less likely to work. |

</details>

## License

`src/shared/casefoldingmap.ts` derives from a
[data file](https://unicode.org/Public/UCD/latest/ucd/CaseFolding.txt)
published by the Unicode Consortium, and is
[Unicode licensed](https://unicode.org/license.txt).

`src/shared/icons.ts` derives from SVG icons originally part of
[ionicons v5.0.0](https://ionic.io/ionicons/) and
[Flagpack](https://flagpack.xyz/), and is MIT licensed by way of those projects.

All other files are also [MIT licensed](LICENSE).
