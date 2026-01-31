import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { createRef, ref } from "lit/directives/ref.js";

import AppSettings, {
  Station,
  knownJjyKhz,
  knownStations,
} from "@shared/appsettings";
import BaseElement, { registerEventHandler } from "@shared/element";
import {
  ReadyBusyEvent,
  ServerOffsetEvent,
  TimeSignalStateChangeEvent,
} from "@shared/events";
import { svgIcons } from "@shared/icons";
import RadioTimeSignal from "@shared/radiotimesignal";

const kStartStopButtonText = {
  stopped: "Start",
  starting: "Stop",
  started: "Stop",
  stopping: "Stopping",
} as const;

type StartStopButtonState = keyof typeof kStartStopButtonText;

@customElement("start-stop-button")
export class StartStopButton extends BaseElement {
  #serverOffset = 0;

  @state()
  private accessor ready = false;

  @state()
  private accessor station!: Station;

  get #state(): StartStopButtonState {
    switch (RadioTimeSignal.state) {
      case "idle":
        return "stopped";

      case "startup":
      case "reqparams":
      case "loadparams":
        return "starting";

      case "fadein":
      case "running":
      case "fadeout":
        return "started";

      case "suspend":
      default:
        return "stopping";
    }
  }

  #warningDialogRef = createRef<HTMLDialogElement>();

  #warningCheckboxRef = createRef<HTMLInputElement>();

  #advisoryDialogRef = createRef<HTMLDialogElement>();

  #advisoryCheckboxRef = createRef<HTMLInputElement>();

  forceShowWarning = true;

  forceShowAdvisory = true;

  #showWarningModal() {
    this.#warningDialogRef.value?.showModal();
  }

  #closeWarningModal() {
    const checkbox = this.#warningCheckboxRef.value;
    if (checkbox != null) AppSettings.set("nanny", checkbox.checked);
    this.forceShowWarning = false;
    this.#startRadioTimeSignal();
  }

  #showAdvisoryModal() {
    this.#advisoryDialogRef.value?.showModal();
  }

  #closeAdvisoryModal() {
    const checkbox = this.#advisoryCheckboxRef.value;
    if (checkbox != null) AppSettings.set("advisory", checkbox.checked);
    this.forceShowAdvisory = false;
    this.#startRadioTimeSignal();
  }

  #start() {
    const isAudible = AppSettings.get("audible");

    if (isAudible && (this.forceShowAdvisory || AppSettings.get("advisory")))
      this.#showAdvisoryModal();
    else if (!isAudible && (this.forceShowWarning || AppSettings.get("nanny")))
      this.#showWarningModal();
    else this.#startRadioTimeSignal();
  }

  #startRadioTimeSignal() {
    RadioTimeSignal.start({
      stationIndex: knownStations.indexOf(AppSettings.get("station")),
      jjyKhzIndex: knownJjyKhz.indexOf(AppSettings.get("jjyKhz")),
      offset: AppSettings.get("offset") + this.#serverOffset,
      dut1: AppSettings.get("dut1"),
      audible: AppSettings.get("audible"),
      noclip: AppSettings.get("noclip"),
    });
  }

  #stop() {
    RadioTimeSignal.stop();
  }

  #click() {
    if (this.#state === "stopped") this.#start();
    else this.#stop();
  }

  #getSettings() {
    this.station = AppSettings.get("station");
  }

  @registerEventHandler(ReadyBusyEvent)
  handleReadyBusy(ready: boolean) {
    if (ready) this.#getSettings();
    else this.#stop();
    this.ready = ready;
  }

  @registerEventHandler(TimeSignalStateChangeEvent)
  handleTimeSignalStateChange() {
    this.requestUpdate();
  }

  @registerEventHandler(ServerOffsetEvent)
  handleServerOffset(serverOffset: number) {
    this.#serverOffset = serverOffset;
  }

  protected render() {
    const classes = classMap({
      "btn-success": this.ready && this.#state === "stopped",
      "btn-error":
        this.ready && (this.#state === "starting" || this.#state === "started"),
      "btn-disabled": !this.ready || this.#state === "stopping",
    });

    let buttonText = "loading";
    if (this.ready) {
      const stateText = kStartStopButtonText[this.#state];
      const station =
        this.station === "JJY" ?
          `${this.station}${AppSettings.get("jjyKhz")}`
        : this.station;
      buttonText = `${stateText} ${station}`;
    }

    return html`
      <button
        class="${classes} btn btn-md btn-wide drop-shadow sm:btn-lg sm:w-[24rem]"
        @click=${this.#click}
      >
        ${buttonText}
      </button>

      <dialog
        ${ref(this.#warningDialogRef)}
        class="modal"
        @close=${this.#closeWarningModal}
      >
        <div
          class="modal-box flex max-h-[calc(100dvh-2rem)] w-[90%] max-w-[calc(100dvw-2rem)] flex-col gap-4"
        >
          <form class="flex items-center" method="dialog">
            <h3 class="grow text-xl font-bold sm:text-2xl">Safety Warning</h3>

            <!-- Invisible dummy button takes autofocus when modal is opened -->
            <button></button>

            <button class="btn btn-circle btn-ghost btn-sm p-0">
              <span class="size-6 sm:size-8">${svgIcons.close}</span>
            </button>
          </form>

          <div
            class="alert alert-warning grid-flow-col items-start text-start"
            role="alert"
          >
            <span class="size-6 sm:size-8">${svgIcons.warning}</span>
            <span class="flex min-w-0 flex-col gap-2">
              <p>
                <span class="font-bold">
                  DO NOT PLACE YOUR EARS NEAR THE SPEAKER TO DETERMINE VOLUME.
                </span>
              </p>
              <p>Use a visual volume indicator instead.</p>
              <p>
                The waveform that will be generated when you close this dialog
                has full dynamic range, but is pitched high enough to be
                difficult to perceive.
              </p>
              <p>
                <span class="font-bold">
                  Even if you &ldquo;can&rsquo;t hear anything&rdquo;,
                </span>
                many common devices are capable of playing it back loud enough
                to potentially cause
                <span class="font-bold">permanent hearing damage!</span>
              </p>
            </span>
          </div>

          <span class="flex">
            <span class="grow font-semibold">Show this warning next time</span>
            <input
              ${ref(this.#warningCheckboxRef)}
              class="checkbox"
              type="checkbox"
              name="nanny"
              .checked=${AppSettings.get("nanny")}
            />
          </span>
        </div>
      </dialog>

      <dialog
        ${ref(this.#advisoryDialogRef)}
        class="modal"
        @close=${this.#closeAdvisoryModal}
      >
        <div
          class="modal-box flex max-h-[calc(100dvh-2rem)] w-[90%] max-w-[calc(100dvw-2rem)] flex-col gap-4"
        >
          <form class="flex items-center" method="dialog">
            <h3 class="grow text-xl font-bold sm:text-2xl">Notice</h3>

            <!-- Invisible dummy button takes autofocus when modal is opened -->
            <button></button>

            <button class="btn btn-circle btn-ghost btn-sm p-0">
              <span class="size-6 sm:size-8">${svgIcons.close}</span>
            </button>
          </form>

          <div class="alert grid-flow-col items-start text-start" role="alert">
            <span class="size-6 sm:size-8">${svgIcons.info}</span>
            <span class="flex min-w-0 flex-col gap-2">
              <p>
                <span class="font-bold">
                  Emulated time signal will be audible.
                </span>
              </p>
              <p>
                The loud sound you will hear when you close this dialog is the
                emulated radio time signal that
                <span class="font-semibold">Time Station Emulator</span>
                would normally transmit, pitch-shifted down to be easily
                audible.
              </p>
              <p>
                It may be mildly entertaining, but it will not set any clocks.
              </p>
              <p>
                Turn the <span class="font-semibold">Audible</span> setting off
                in
                <span class="font-semibold">Settings &rsaquo; Advanced</span> if
                you want
                <span class="font-semibold">Time Station Emulator</span> to be
                able to set clocks again.
              </p>
            </span>
          </div>

          <span class="flex">
            <span class="grow font-semibold">Show this notice next time</span>
            <input
              ${ref(this.#advisoryCheckboxRef)}
              class="checkbox"
              type="checkbox"
              name="advisory"
              .checked=${AppSettings.get("advisory")}
            />
          </span>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "start-stop-button": StartStopButton;
  }
}
