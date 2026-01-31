import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@components/startstopbutton";
import { StartStopButton } from "@components/startstopbutton";

import EventBus from "@shared/eventbus";
import {
  ReadyBusyEvent,
  ServerOffsetEvent,
  TimeSignalStateChangeEvent,
} from "@shared/events";
import RadioTimeSignal, { TimeSignalState } from "@shared/radiotimesignal";
import "@shared/styles.css";

import { FakeAppSettings, delay } from "@test/utils";

const FakeRadioTimeSignal = {
  start: vi.spyOn(RadioTimeSignal, "start"),
  stop: vi.spyOn(RadioTimeSignal, "stop"),
  state: vi.spyOn(RadioTimeSignal, "state", "get").mockReturnValue("idle"),
} as const;

describe("Start-stop button", () => {
  let startStopButton: StartStopButton;
  let innerButton: HTMLButtonElement;
  let innerWarningDialog: HTMLDialogElement;
  let innerAdvisoryDialog: HTMLDialogElement;

  beforeEach(async () => {
    startStopButton = document.createElement("start-stop-button");
    startStopButton.setAttribute("classes", "foo bar");
    startStopButton.forceShowWarning = false;
    startStopButton.forceShowAdvisory = false;
    document.body.appendChild(startStopButton);
    await delay();
    innerButton = startStopButton.querySelector("button.btn")!;
    [innerWarningDialog, innerAdvisoryDialog] =
      startStopButton.querySelectorAll("dialog")!;
  });

  afterEach(() => {
    startStopButton.remove();
    FakeAppSettings.get.mockClear();
    FakeRadioTimeSignal.start.mockReset();
    FakeRadioTimeSignal.stop.mockReset();
  });

  it("renders with defaults", () => {
    expect(innerButton.textContent).toMatch("loading");
    expect(innerButton.classList).toContain("btn-disabled");
  });

  describe("renders according to waveform generator state", async () => {
    beforeEach(async () => {
      EventBus.publish(ReadyBusyEvent, true);
      await delay();
    });

    afterEach(() => {
      FakeRadioTimeSignal.state.mockReturnValue("idle");
    });

    it("idle", () => {
      expect(innerButton.textContent).toMatch("Start JJY60");
      expect(innerButton.classList).toContain("btn-success");
      expect(innerButton.classList).not.toContain("btn-error");
      expect(innerButton.classList).not.toContain("btn-disabled");
    });

    it("startup, reqparams, loadparams", async () => {
      const states: TimeSignalState[] = ["startup", "reqparams", "loadparams"];
      for (let i = 0; i < states.length; i++) {
        /* eslint-disable no-await-in-loop */
        FakeRadioTimeSignal.state.mockReturnValue(states[i]);
        EventBus.publish(TimeSignalStateChangeEvent);
        await delay();
        expect(innerButton.textContent).toMatch("Stop JJY60");
        expect(innerButton.classList).not.toContain("btn-success");
        expect(innerButton.classList).toContain("btn-error");
        expect(innerButton.classList).not.toContain("btn-disabled");
      }
    });

    it("fadein, running, fadeout", async () => {
      const states: TimeSignalState[] = ["fadein", "running", "fadeout"];
      for (let i = 0; i < states.length; i++) {
        /* eslint-disable no-await-in-loop */
        FakeRadioTimeSignal.state.mockReturnValue(states[i]);
        EventBus.publish(TimeSignalStateChangeEvent);
        await delay();
        expect(innerButton.textContent).toMatch("Stop JJY60");
        expect(innerButton.classList).not.toContain("btn-success");
        expect(innerButton.classList).toContain("btn-error");
        expect(innerButton.classList).not.toContain("btn-disabled");
      }
    });

    it("suspend", async () => {
      FakeRadioTimeSignal.state.mockReturnValue("suspend");
      EventBus.publish(TimeSignalStateChangeEvent);
      await delay();
      expect(innerButton.textContent).toMatch("Stopping JJY60");
      expect(innerButton.classList).not.toContain("btn-success");
      expect(innerButton.classList).not.toContain("btn-error");
      expect(innerButton.classList).toContain("btn-disabled");
    });
  });

  describe("handles ReadyBusyEvent", () => {
    it("gets settings upon true", async () => {
      EventBus.publish(ReadyBusyEvent, true);
      await delay();
      expect(innerButton.textContent).toMatch("Start JJY60");
    });

    it("stops playback upon false", () => {
      EventBus.publish(ReadyBusyEvent, false);
      expect(FakeRadioTimeSignal.stop).toHaveBeenCalled();
    });
  });

  describe("handles TimeSignalStateChangeEvent", () => {
    it("always rerenders", () => {
      const spy = vi.spyOn(startStopButton, "requestUpdate");
      EventBus.publish(TimeSignalStateChangeEvent);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("handles ServerOffsetEvent", () => {
    it("saves server offset", () => {
      EventBus.publish(ServerOffsetEvent, -1234);
      FakeAppSettings.get.mockReturnValueOnce(false); /* audible == false */
      FakeAppSettings.get.mockReturnValueOnce(false); /* nanny == false */
      innerButton.click();
      expect(FakeRadioTimeSignal.start).toHaveBeenCalled();
      const { offset } = FakeRadioTimeSignal.start.mock.lastCall![0];
      expect(offset).toBe(-2468);
    });
  });

  describe("toggles playback upon click", () => {
    beforeEach(() => {
      FakeAppSettings.get.mockReturnValueOnce(false); /* audible == false */
      FakeAppSettings.get.mockReturnValueOnce(false); /* nanny == false */
      innerButton.click();
    });

    it("starts playback if currently stopped", () => {
      expect(FakeRadioTimeSignal.start).toHaveBeenCalled();
      expect(FakeRadioTimeSignal.stop).not.toHaveBeenCalled();
    });

    it("passes params to waveform generator", () => {
      const { stationIndex, jjyKhzIndex, offset, dut1, audible, noclip } =
        FakeRadioTimeSignal.start.mock.lastCall![0];
      expect(stationIndex).toBe(2);
      expect(jjyKhzIndex).toBe(1);
      expect(offset).toBe(-1234);
      expect(dut1).toBe(123);
      expect(audible).toBe(false);
      expect(noclip).toBe(false);
    });

    it("stops playback if currently started", () => {
      FakeRadioTimeSignal.state.mockReturnValueOnce("running");
      innerButton.click();
      expect(FakeRadioTimeSignal.stop).toHaveBeenCalled();
    });
  });

  describe("can show a safety warning", () => {
    it("shows forced warning on first start of session", () => {
      const spy = vi.spyOn(innerWarningDialog, "showModal");
      startStopButton.forceShowWarning = true;
      FakeAppSettings.get.mockReturnValueOnce(false); /* audible == false */
      innerButton.click();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("shows warning by default", () => {
      const spy = vi.spyOn(innerWarningDialog, "showModal");
      FakeAppSettings.get.mockReturnValueOnce(false); /* audible == false */
      FakeAppSettings.get.mockReturnValueOnce(true); /* nanny == true */
      innerButton.click();
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it("saves app setting according to checkbox", async () => {
      const input = innerWarningDialog.querySelector("input")!;
      const button: HTMLButtonElement =
        innerWarningDialog.querySelector("button.btn")!;
      innerWarningDialog.showModal();
      input.checked = false;
      button.click();
      await delay(100);
      expect(FakeAppSettings.set).toHaveBeenCalledWith("nanny", false);
    });

    it("does not show warning according to app setting", () => {
      const spy = vi.spyOn(innerWarningDialog, "showModal");
      FakeAppSettings.get.mockReturnValueOnce(false); /* audible == false */
      FakeAppSettings.get.mockReturnValueOnce(false); /* nanny == false */
      innerButton.click();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("starts playback upon warning close", async () => {
      const button: HTMLButtonElement =
        innerWarningDialog.querySelector("button.btn")!;
      innerWarningDialog.showModal();
      button.click();
      await delay(100);
      expect(FakeRadioTimeSignal.start).toHaveBeenCalled();
      expect(FakeRadioTimeSignal.stop).not.toHaveBeenCalled();
    });
  });

  describe("can show an advisory", () => {
    it("shows forced advisory on first start of session", () => {
      const spy = vi.spyOn(innerAdvisoryDialog, "showModal");
      FakeAppSettings.get.mockReturnValueOnce(true); /* audible == true */
      startStopButton.forceShowAdvisory = true;
      innerButton.click();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
    it("does not show advisory by default", () => {
      const spy = vi.spyOn(innerAdvisoryDialog, "showModal");
      FakeAppSettings.get.mockReturnValueOnce(false); /* audible == false */
      innerButton.click();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("saves app setting according to checkbox", async () => {
      const input = innerAdvisoryDialog.querySelector("input")!;
      const button: HTMLButtonElement =
        innerAdvisoryDialog.querySelector("button.btn")!;
      innerAdvisoryDialog.showModal();
      input.checked = false;
      button.click();
      await delay(100);
      expect(FakeAppSettings.set).toHaveBeenCalledWith("advisory", false);
    });

    it("shows advisory according to app setting", () => {
      const spy = vi.spyOn(innerAdvisoryDialog, "showModal");
      FakeAppSettings.get.mockReturnValueOnce(true); /* audible == true */
      FakeAppSettings.get.mockReturnValueOnce(true); /* advisory == true */
      innerButton.click();
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it("starts playback upon advisory close", async () => {
      const button: HTMLButtonElement =
        innerAdvisoryDialog.querySelector("button.btn")!;
      innerAdvisoryDialog.showModal();
      button.click();
      await delay(100);
      expect(FakeRadioTimeSignal.start).toHaveBeenCalled();
      expect(FakeRadioTimeSignal.stop).not.toHaveBeenCalled();
    });
  });
});
