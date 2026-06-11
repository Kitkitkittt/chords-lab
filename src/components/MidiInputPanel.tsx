import { Music4, Plug, PlugZap } from "lucide-react";
import { useState } from "react";
import { useMidiInput } from "../hooks/useMidiInput";
import { triggerNote } from "../lib/audioEngine";
import { useProgress } from "../state/progress";

/**
 * Opt-in Web MIDI keyboard panel.
 *
 * Off by default: nothing happens until the learner presses "Connect a
 * keyboard". When connected, incoming note-on messages play the shared keys
 * voice so a physical MIDI keyboard sounds through the app. Disconnecting fully
 * detaches the listeners. Web MIDI is Chromium-only; unsupported browsers show
 * a calm note instead.
 */
export function MidiInputPanel() {
  const { progress } = useProgress();
  const [lastNote, setLastNote] = useState("");
  const { status, deviceNames, isSupported, connect, disconnect } = useMidiInput({
    onNoteOn: (note, velocity) => {
      setLastNote(note);
      void triggerNote(note, {
        voiceId: "keys",
        velocity,
        audioEnabled: progress.settings.audioEnabled
      });
    }
  });

  const isConnected = status === "connected";

  return (
    <section className="tool-panel" aria-labelledby="midi-input-title">
      <h2 id="midi-input-title">
        <Music4 size={18} aria-hidden="true" /> MIDI keyboard
      </h2>
      <p>
        Optional. Connect a USB or Bluetooth MIDI keyboard to play the on-screen
        instruments with real keys. Connection is requested only when you ask,
        and nothing is recorded.
      </p>

      {!isSupported ? (
        <p role="status">
          This browser does not support Web MIDI. Chromium-based browsers
          (Chrome, Edge) support it.
        </p>
      ) : (
        <div className="tool-panel__controls">
          {isConnected ? (
            <button
              className="button button--secondary"
              type="button"
              onClick={disconnect}
            >
              <PlugZap size={17} aria-hidden="true" />
              Disconnect
            </button>
          ) : (
            <button className="button" type="button" onClick={connect}>
              <Plug size={17} aria-hidden="true" />
              {status === "connecting" ? "Connecting…" : "Connect a keyboard"}
            </button>
          )}
        </div>
      )}

      {status === "denied" ? (
        <p role="status">
          MIDI access was blocked. The keyboard stays off until you allow it.
        </p>
      ) : null}

      {isConnected ? (
        <p role="status" aria-live="polite">
          {deviceNames.length > 0
            ? `Connected: ${deviceNames.join(", ")}.`
            : "Connected. Play a key."}
          {lastNote ? ` Last note: ${lastNote}.` : ""}
        </p>
      ) : null}
    </section>
  );
}
