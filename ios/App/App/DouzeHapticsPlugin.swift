import Capacitor
import CoreHaptics
import Foundation

/// The app's own haptics engine (docs/haptics.md §2): plays the patterns
/// `src/native/haptics` renders, as Core Haptics transient and continuous
/// events, plus a live continuous player whose intensity JS keeps updating
/// (the final televote reveal's rumble). Registered in `SceneDelegate.swift`.
///
/// Every engine call runs on one serial queue. The engine stays running
/// while the app is active (no auto shutdown, so a tap is felt on the frame
/// it is sent); the system stops it in the background and it restarts on the
/// next call.
@objc(DouzeHapticsPlugin)
public class DouzeHapticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DouzeHapticsPlugin"
    public let jsName = "DouzeHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startLive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateLive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopLive", returnType: CAPPluginReturnPromise)
    ]

    /// The longest a continuous event may be; the live player loops it.
    private static let liveEventDuration: TimeInterval = 30

    private let supportsHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    private let queue = DispatchQueue(label: "app.douzepoints.haptics")
    private var engine: CHHapticEngine?
    private var engineNeedsStart = true
    private var players: [(player: CHHapticPatternPlayer, endsAt: TimeInterval)] = []
    private var livePlayer: CHHapticAdvancedPatternPlayer?

    @objc func getCapabilities(_ call: CAPPluginCall) {
        call.resolve(["supportsHaptics": supportsHaptics])
    }

    @objc func prepare(_ call: CAPPluginCall) {
        queue.async { _ = self.readyEngine() }
        call.resolve()
    }

    @objc func play(_ call: CAPPluginCall) {
        let rawEvents = call.getArray("events", JSObject.self) ?? []
        let interrupt = call.getBool("interrupt") ?? false

        queue.async {
            guard let engine = self.readyEngine() else { return }

            let events = rawEvents.compactMap(Self.makeEvent)

            guard !events.isEmpty else { return }

            if interrupt { self.stopPlayers() }

            do {
                let pattern = try CHHapticPattern(events: events, parameters: [])
                let player = try engine.makePlayer(with: pattern)

                try player.start(atTime: CHHapticTimeImmediate)
                self.track(player, duration: pattern.duration)
            } catch {
                self.engineNeedsStart = true
            }
        }
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        queue.async {
            self.stopPlayers()
            self.stopLivePlayer()
        }
        call.resolve()
    }

    @objc func startLive(_ call: CAPPluginCall) {
        let intensity = Float(call.getDouble("intensity") ?? 0.1)
        let sharpness = Float(call.getDouble("sharpness") ?? 0.2)

        queue.async {
            self.stopLivePlayer()

            guard let engine = self.readyEngine() else { return }

            do {
                let event = CHHapticEvent(
                    eventType: .hapticContinuous,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 1),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: Self.unit(sharpness))
                    ],
                    relativeTime: 0,
                    duration: Self.liveEventDuration
                )
                let pattern = try CHHapticPattern(events: [event], parameters: [])
                let player = try engine.makeAdvancedPlayer(with: pattern)

                player.loopEnabled = true
                try player.start(atTime: CHHapticTimeImmediate)
                try player.sendParameters(
                    [CHHapticDynamicParameter(parameterID: .hapticIntensityControl, value: Self.unit(intensity), relativeTime: 0)],
                    atTime: CHHapticTimeImmediate
                )
                self.livePlayer = player
            } catch {
                self.engineNeedsStart = true
            }
        }
        call.resolve()
    }

    @objc func updateLive(_ call: CAPPluginCall) {
        let intensity = Float(call.getDouble("intensity") ?? 0)

        queue.async {
            guard let player = self.livePlayer else { return }

            try? player.sendParameters(
                [CHHapticDynamicParameter(parameterID: .hapticIntensityControl, value: Self.unit(intensity), relativeTime: 0)],
                atTime: CHHapticTimeImmediate
            )
        }
        call.resolve()
    }

    @objc func stopLive(_ call: CAPPluginCall) {
        queue.async { self.stopLivePlayer() }
        call.resolve()
    }

    // MARK: - Engine (on `queue`)

    private func readyEngine() -> CHHapticEngine? {
        guard supportsHaptics else { return nil }

        if engine == nil {
            do {
                let newEngine = try CHHapticEngine()

                newEngine.playsHapticsOnly = true
                newEngine.isAutoShutdownEnabled = false
                newEngine.stoppedHandler = { [weak self] _ in
                    self?.queue.async { self?.forgetPlayers() }
                }
                newEngine.resetHandler = { [weak self] in
                    self?.queue.async { self?.forgetPlayers() }
                }
                engine = newEngine
                engineNeedsStart = true
            } catch {
                return nil
            }
        }

        if engineNeedsStart {
            do {
                try engine?.start()
                engineNeedsStart = false
            } catch {
                return nil
            }
        }

        return engine
    }

    /// The engine stopped (background, audio interruption) or reset: its
    /// players are gone and it must start again before the next pattern.
    private func forgetPlayers() {
        engineNeedsStart = true
        players.removeAll()
        livePlayer = nil
    }

    private func track(_ player: CHHapticPatternPlayer, duration: TimeInterval) {
        let now = ProcessInfo.processInfo.systemUptime

        players.removeAll { $0.endsAt < now }
        players.append((player: player, endsAt: now + duration))
    }

    private func stopPlayers() {
        for entry in players {
            try? entry.player.stop(atTime: CHHapticTimeImmediate)
        }
        players.removeAll()
    }

    private func stopLivePlayer() {
        try? livePlayer?.stop(atTime: CHHapticTimeImmediate)
        livePlayer = nil
    }

    // MARK: - Pattern parsing

    private static func unit(_ value: Float) -> Float {
        min(1, max(0, value))
    }

    private static func number(_ value: Any?) -> Double? {
        (value as? NSNumber)?.doubleValue
    }

    /// `{ k: "t" | "c", time, dur?, i, s }` (seconds, 0–1), as `renderIos` writes it.
    private static func makeEvent(_ raw: JSObject) -> CHHapticEvent? {
        guard
            let time = number(raw["time"]),
            let intensity = number(raw["i"]),
            let sharpness = number(raw["s"])
        else { return nil }

        let parameters = [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: unit(Float(intensity))),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: unit(Float(sharpness)))
        ]

        if (raw["k"] as? String) == "c" {
            guard let duration = number(raw["dur"]), duration > 0 else { return nil }

            return CHHapticEvent(
                eventType: .hapticContinuous,
                parameters: parameters,
                relativeTime: max(0, time),
                duration: min(duration, liveEventDuration)
            )
        }

        return CHHapticEvent(eventType: .hapticTransient, parameters: parameters, relativeTime: max(0, time))
    }
}
