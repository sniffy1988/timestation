import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import "@components/infodropdown";
import "@components/navbar";
import "@components/startstopbutton";
import "@components/toastmanager";
import "@components/transmitclock";
import "@components/visualizericon";

import AppSettings from "@shared/appsettings";
import BaseElement, { registerEventHandler } from "@shared/element";
import {
  EditDistanceReadyEvent,
  ReadyBusyEvent,
  ServerTimeReadyEvent,
  SettingsReadyEvent,
  TimeSignalReadyEvent,
  ToastEvent,
} from "@shared/events";
import { svgIcons, svgLogo } from "@shared/icons";
import serverTimeTask from "@shared/servertime";
import "@shared/styles.css";

type MainState = "loading" | "normal" | "error";

function registerServiceWorker() {
  navigator.serviceWorker
    .register("/sw.js", { scope: "/", type: "module" })
    .then((registration) => {
      if (registration.installing) {
        registration.installing.addEventListener("statechange", () => {
          window.location.reload();
        });
      }
    });
}

function checkBrowserSupport() {
  /*
   * Feature            Preconditions for availability  Required?
   * -----------------  ------------------------------  ---------
   * WebAssembly        N/A, always available           Yes
   *
   * Audio Worklet      Secure context                  Yes
   *
   * SharedArrayBuffer  Secure context                  Yes
   *                    Cross-origin isolation headers
   *
   * Service worker     Secure context                  No
   */

  let hasWasm: boolean;
  try {
    /* cf. https://stackoverflow.com/a/47880734 */
    const bytes = Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
    const module = new WebAssembly.Module(bytes);
    const instance = new WebAssembly.Instance(module);
    hasWasm = instance instanceof WebAssembly.Instance;
  } catch {
    hasWasm = false;
  }
  if (!hasWasm) return "WebAssembly is not available.";

  const hasSecureContext = window.isSecureContext;
  if (!hasSecureContext) return "Page was not loaded in a secure context.";

  const hasAudioWorklet = typeof AudioWorklet !== "undefined";
  if (!hasAudioWorklet) return "Audio Worklet is not available.";

  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  if (!hasSharedArrayBuffer) {
    /*
     * If we're in prod and service workers are available, our service worker
     * is not installed yet. It will patch in COI headers when installed, and
     * SharedArrayBuffer will then be available.
     */
    const hasServiceWorker =
      import.meta.env.MODE === "production" &&
      typeof navigator.serviceWorker !== "undefined";
    if (!hasServiceWorker) return "SharedArrayBuffer is not available.";
  }

  return "";
}

const kBrowserDelayMs = 3000 as const;
const kDelayMs = 1000 as const;

@customElement("time-station-emulator")
export class TimeStationEmulator extends BaseElement {
  @state()
  accessor mainState: MainState = "loading";

  #timeoutId?: ReturnType<typeof setTimeout>;

  #editDistanceReady = false;

  #serverTimeReady = false;

  #settingsReady = true;

  #timeSignalReady = false;

  @registerEventHandler(EditDistanceReadyEvent)
  handleEditDistanceReady() {
    this.#editDistanceReady = true;
    this.#notifyReadyBusy();
  }

  @registerEventHandler(ServerTimeReadyEvent)
  handleServerTimeReady() {
    this.#serverTimeReady = true;
    this.#notifyReadyBusy();
  }

  @registerEventHandler(SettingsReadyEvent)
  handleSettingsReady(ready: boolean) {
    this.#settingsReady = ready;
    this.#notifyReadyBusy();
  }

  @registerEventHandler(TimeSignalReadyEvent)
  handleTimeSignalReady() {
    this.#timeSignalReady = true;
    this.#notifyReadyBusy();
  }

  #notifyReadyBusy() {
    const wasmReady = this.#editDistanceReady && this.#timeSignalReady;
    const prereqsReady = wasmReady && this.#serverTimeReady;
    if (prereqsReady) {
      if (this.mainState === "loading") this.mainState = "normal";
      this.publish(ReadyBusyEvent, this.#settingsReady);
      clearTimeout(this.#timeoutId);
    }
  }

  connectedCallback() {
    super.connectedCallback();

    /*
     * Loading screen would otherwise show forever if we lack browser support.
     * Also, pretending browser checks take time turns out to be good UX.
     */
    this.#timeoutId = setTimeout(() => {
      const supportMessage = checkBrowserSupport();
      const hasBrowserSupport = supportMessage === "";

      if (!hasBrowserSupport) {
        this.publish(
          ToastEvent,
          "error",
          `${supportMessage} Your browser is probably unsupported. Sorry!`,
        );
        this.mainState = "error";
      }
    }, kBrowserDelayMs);

    /* User-Agent warnings should not fail to display if WASM loads. */
    setTimeout(() => {
      const { userAgent } = navigator;
      const isMobileSafari = /iPad|iPhone|iPod|Watch/.test(userAgent);
      const isMobileFirefox =
        /Firefox/.test(userAgent) && /Android/.test(userAgent);

      if (isMobileSafari) {
        this.publish(
          ToastEvent,
          "warning",
          "Your browser is Mobile Safari, which may not work. Good luck!",
        );
      } else if (isMobileFirefox) {
        this.publish(
          ToastEvent,
          "warning",
          "Your browser is Mobile Firefox, which may not work. Good luck!",
        );
      }
    }, kDelayMs);

    const hasServiceWorker =
      import.meta.env.MODE === "production" &&
      typeof navigator.serviceWorker !== "undefined";
    if (hasServiceWorker) registerServiceWorker();

    if (AppSettings.get("sync")) serverTimeTask();
    else this.#serverTimeReady = true;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timeoutId);
  }

  protected render() {
    const showIfLoading = classMap({ hidden: this.mainState !== "loading" });
    const showIfNormal = classMap({ hidden: this.mainState !== "normal" });
    const showIfError = classMap({ hidden: this.mainState !== "error" });

    /*
     * Unfortunately, adding a custom screen variant to Tailwind for the height
     * media query necessary for small widescreen breaks min-* and max-*, and
     * we are forced to make the query an arbitrary CSS value.
     * cf. https://github.com/tailwindlabs/tailwindcss/pull/9558#restrictions
     */

    return html`
      <div class="absolute flex size-full flex-col">
        <div
          class="${showIfLoading} m-auto w-1/3 fill-current drop-shadow-aura"
        >
          ${svgLogo}
        </div>

        <div
          class="${showIfNormal} m-auto grid h-3/4 max-h-[960px] min-h-[408px] grid-cols-1 place-items-center sm:min-h-[600px] [@media((min-width:640px)_and_(max-height:600px))]:min-h-[400px] [@media((min-width:640px)_and_(max-height:600px))]:auto-cols-min [@media((min-width:640px)_and_(max-height:600px))]:grid-cols-fit"
        >
          <span
            class="text-center align-text-bottom text-2xl font-semibold min-[480px]:text-3xl sm:text-4xl [@media((min-width:640px)_and_(max-height:600px))]:col-span-3"
          >
            Time Station Emulator
          </span>

          <transmit-clock
            class="[@media((min-width:640px)_and_(max-height:600px))]:col-span-3"
          ></transmit-clock>

          <!-- spacer -->
          <span
            class="[@media((max-width:639px)_or_(min-height:601px))]:hidden [@media((min-width:640px)_and_(max-height:600px))]:my-auto [@media((min-width:640px)_and_(max-height:600px))]:mr-4 [@media((min-width:640px)_and_(max-height:600px))]:size-16"
          ></span>

          <visualizer-icon
            class="[@media((min-width:640px)_and_(max-height:600px))]:col-start-3 [@media((min-width:640px)_and_(max-height:600px))]:my-auto [@media((min-width:640px)_and_(max-height:600px))]:ml-4 [@media((min-width:640px)_and_(max-height:600px))]:place-self-start"
          ></visualizer-icon>

          <start-stop-button
            class="[@media((min-width:640px)_and_(max-height:600px))]:col-start-2 [@media((min-width:640px)_and_(max-height:600px))]:row-start-3"
          ></start-stop-button>
        </div>

        <div
          class="${showIfError} m-auto grid h-1/2 min-h-[360px] place-items-center"
        >
          <span class="text-center text-lg font-bold sm:text-2xl">
            Browser may be unsupported!
          </span>
          <span class="size-36 drop-shadow-aura sm:size-48">
            ${svgIcons.sad}
          </span>
          <span class="text-center text-lg font-bold sm:text-2xl">
            Try reloading this page.
          </span>
        </div>
      </div>

      <nav-bar></nav-bar>

      <toast-manager></toast-manager>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "time-station-emulator": TimeStationEmulator;
  }
}
