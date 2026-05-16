import assert from "node:assert/strict";
import { VoiceLevelMeterController } from "../src/views/controllers/VoiceLevelMeterController";

class FakeElement {
  classes = new Set<string>();
  styleValues = new Map<string, string>();
  style = {
    transform: "",
    opacity: "",
    setProperty: (name: string, value: string) => {
      this.styleValues.set(name, value);
    },
    removeProperty: (name: string) => {
      this.styleValues.delete(name);
    }
  };

  addClass(name: string) {
    this.classes.add(name);
  }

  removeClass(name: string) {
    this.classes.delete(name);
  }

  setCssStyles(styles: Record<string, string>) {
    Object.entries(styles).forEach(([name, value]) => {
      if (name === "opacity" || name === "transform") {
        this.style[name] = value;
      }
    });
  }

  setCssProps(props: Record<string, string>) {
    Object.entries(props).forEach(([name, value]) => {
      if (value) {
        this.styleValues.set(name, value);
      } else {
        this.styleValues.delete(name);
      }
    });
  }
}

function createHarness() {
  const waveform = new FakeElement();
  const orb = new FakeElement();
  const bars = [new FakeElement(), new FakeElement(), new FakeElement()];
  const calls: string[] = [];
  const analyser = {
    frequencyBinCount: 4,
    fftSize: 0,
    getByteTimeDomainData: () => calls.push("read-level")
  };
  const source = {
    connect: () => calls.push("connect")
  };
  const audioContext = {
    createAnalyser: () => analyser,
    createMediaStreamSource: () => source,
    close: () => {
      calls.push("close");
    }
  };
  let frame = 0;
  const controller = new VoiceLevelMeterController({
    createAudioContext: () => audioContext as unknown as AudioContext,
    requestAnimationFrame: (callback) => {
      calls.push("raf");
      frame += 1;
      return frame;
    },
    cancelAnimationFrame: (id) => calls.push(`cancel:${id}`),
    getNormalizedLevel: () => 0.5,
    onLevel: (level) => calls.push(`level:${level}`),
    warn: (label, error) => calls.push(`${label}:${String(error)}`)
  });

  return {
    analyser,
    bars,
    calls,
    controller,
    orb,
    waveform
  };
}

async function run() {
  {
    const { bars, calls, controller, orb, waveform } = createHarness();

    controller.start({
      stream: {} as MediaStream,
      waveformEl: waveform as unknown as HTMLElement,
      bars: bars as unknown as HTMLElement[],
      orbEl: orb as unknown as HTMLElement
    });

    assert.equal(waveform.classes.has("is-active"), true);
    assert.equal(calls.includes("connect"), true);
    assert.equal(calls.includes("read-level"), true);
    assert.equal(calls.includes("level:0.5"), true);
    assert.equal(calls.includes("raf"), true);
    assert.equal(orb.styleValues.has("--contex-live-scale"), true);
    assert.ok(bars.every((bar) => bar.style.transform.startsWith("scaleY(")));
  }

  {
    const { bars, calls, controller, orb, waveform } = createHarness();

    controller.start({
      stream: {} as MediaStream,
      waveformEl: waveform as unknown as HTMLElement,
      bars: bars as unknown as HTMLElement[],
      orbEl: orb as unknown as HTMLElement
    });
    controller.stop();

    assert.equal(waveform.classes.has("is-active"), false);
    assert.ok(calls.some((call) => call.startsWith("cancel:")));
    assert.equal(calls.includes("close"), true);
    assert.ok(bars.every((bar) => !bar.style.transform && !bar.style.opacity));
    assert.equal(orb.styleValues.has("--contex-live-scale"), false);
    assert.equal(orb.styleValues.has("--contex-live-glow"), false);
  }
}

void run()
  .then(() => {
    console.log("voiceLevelMeterController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
