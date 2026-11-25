import AVFoundation
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift add_reminder_sfx.swift <input.mp4> <output.mp4>\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let tempWavURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("pg-hub-reminder-sfx.wav")
let source = AVURLAsset(url: inputURL)
let duration = CMTimeGetSeconds(source.duration)

guard duration.isFinite, duration > 0, let sourceVideo = source.tracks(withMediaType: .video).first else {
    fputs("Input does not contain a readable video track.\n", stderr)
    exit(1)
}

// A quiet, original sound bed for the seven PG Hub scenes. These are deliberately
// understated so the supplied voice-over remains the lead track.
let sampleRate = 44_100
let frameCount = Int(ceil(duration * Double(sampleRate)))
var samples = Array(repeating: Float(0), count: frameCount)

func addTone(start: Double, length: Double, from: Double, to: Double, volume: Float) {
    let startIndex = max(0, Int(start * Double(sampleRate)))
    let count = min(Int(length * Double(sampleRate)), frameCount - startIndex)
    guard count > 0 else { return }
    var phase = 0.0
    for index in 0..<count {
        let progress = Double(index) / Double(max(count - 1, 1))
        let frequency = from + (to - from) * progress
        phase += 2.0 * Double.pi * frequency / Double(sampleRate)
        let attack = min(1.0, progress / 0.08)
        let release = min(1.0, (1.0 - progress) / 0.20)
        samples[startIndex + index] += Float(sin(phase) * attack * release) * volume
    }
}

func addSwoosh(start: Double, length: Double, volume: Float) {
    let startIndex = max(0, Int(start * Double(sampleRate)))
    let count = min(Int(length * Double(sampleRate)), frameCount - startIndex)
    guard count > 0 else { return }
    var seed: UInt32 = 0xBEEFCAFE
    for index in 0..<count {
        seed = 1_664_525 &* seed &+ 1_013_904_223
        let noise = (Float(seed & 0xffff) / 32_767.5) - 1.0
        let progress = Double(index) / Double(max(count - 1, 1))
        let envelope = sin(Double.pi * progress)
        let wave = sin(2.0 * Double.pi * (280.0 + 1_050.0 * progress) * Double(index) / Double(sampleRate))
        samples[startIndex + index] += (noise * 0.20 + Float(wave) * 0.80) * Float(envelope) * volume
    }
}

// 0–5s: rent collection problem — paperwork, notification, relief.
addSwoosh(start: 0.45, length: 0.36, volume: 0.026)
addTone(start: 2.05, length: 0.12, from: 340, to: 460, volume: 0.060)
addTone(start: 4.10, length: 0.30, from: 680, to: 980, volume: 0.055)

// 5–10s: payment-status dashboard — four cards land, then payment confirmation.
addTone(start: 5.38, length: 0.09, from: 220, to: 170, volume: 0.045)
addTone(start: 5.82, length: 0.09, from: 250, to: 190, volume: 0.045)
addTone(start: 6.26, length: 0.09, from: 280, to: 210, volume: 0.045)
addTone(start: 6.70, length: 0.09, from: 310, to: 230, volume: 0.045)
addTone(start: 8.15, length: 0.22, from: 880, to: 1_130, volume: 0.070)
addTone(start: 8.43, length: 0.30, from: 1_120, to: 1_460, volume: 0.060)

// 10–15s: WhatsApp reminder — tap, message flight, delivered note.
addTone(start: 10.48, length: 0.10, from: 260, to: 170, volume: 0.075)
addSwoosh(start: 11.05, length: 0.78, volume: 0.045)
addTone(start: 12.82, length: 0.20, from: 900, to: 1_080, volume: 0.065)
addTone(start: 13.08, length: 0.28, from: 1_240, to: 1_520, volume: 0.050)

// 15–20s: digital receipt — tap, receipt reveal, payment-confirmed chime.
addTone(start: 15.42, length: 0.10, from: 260, to: 175, volume: 0.065)
addSwoosh(start: 15.88, length: 0.58, volume: 0.040)
addTone(start: 17.05, length: 0.22, from: 980, to: 1_220, volume: 0.070)
addTone(start: 17.31, length: 0.34, from: 1_260, to: 1_590, volume: 0.050)

// 20–25s: rooms and tenants — door, suitcase movement, rooms coming online.
addTone(start: 20.54, length: 0.12, from: 180, to: 120, volume: 0.050)
addSwoosh(start: 21.16, length: 0.48, volume: 0.025)
addTone(start: 22.12, length: 0.12, from: 640, to: 760, volume: 0.045)
addTone(start: 22.70, length: 0.12, from: 720, to: 860, volume: 0.045)
addTone(start: 23.28, length: 0.12, from: 800, to: 950, volume: 0.045)

// 25–30s: utility billing and PayFlow AI — activation, data pulses, answer.
addTone(start: 25.32, length: 0.16, from: 360, to: 620, volume: 0.060)
addTone(start: 26.05, length: 0.18, from: 510, to: 730, volume: 0.040)
addTone(start: 26.48, length: 0.18, from: 610, to: 850, volume: 0.040)
addTone(start: 26.91, length: 0.18, from: 710, to: 970, volume: 0.040)
addTone(start: 28.12, length: 0.34, from: 760, to: 1_180, volume: 0.065)

// 30–35s: final brand card — rise, restrained celebration, logo resolve.
addSwoosh(start: 30.30, length: 0.72, volume: 0.040)
addTone(start: 31.26, length: 0.26, from: 720, to: 1_020, volume: 0.050)
addTone(start: 32.10, length: 0.20, from: 920, to: 1_250, volume: 0.050)
addTone(start: 33.56, length: 0.48, from: 620, to: 1_050, volume: 0.070)

let pcm = samples.map { Int16(max(-1, min(1, $0)) * Float(Int16.max)) }
var wav = Data()
func appendASCII(_ value: String) { wav.append(value.data(using: .ascii)!) }
func appendLE<T: FixedWidthInteger>(_ value: T) {
    var littleEndian = value.littleEndian
    withUnsafeBytes(of: &littleEndian) { wav.append(contentsOf: $0) }
}
let dataBytes = UInt32(pcm.count * MemoryLayout<Int16>.size)
appendASCII("RIFF")
appendLE(UInt32(36) + dataBytes)
appendASCII("WAVEfmt ")
appendLE(UInt32(16))
appendLE(UInt16(1))
appendLE(UInt16(1))
appendLE(UInt32(sampleRate))
appendLE(UInt32(sampleRate * 2))
appendLE(UInt16(2))
appendLE(UInt16(16))
appendASCII("data")
appendLE(dataBytes)
for sample in pcm { appendLE(sample) }
try wav.write(to: tempWavURL, options: .atomic)

let composition = AVMutableComposition()
let compositionVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try compositionVideo.insertTimeRange(CMTimeRange(start: .zero, duration: source.duration), of: sourceVideo, at: .zero)
compositionVideo.preferredTransform = sourceVideo.preferredTransform

var mixParameters: [AVAudioMixInputParameters] = []
if let originalAudio = source.tracks(withMediaType: .audio).first,
   let compositionAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try compositionAudio.insertTimeRange(CMTimeRange(start: .zero, duration: source.duration), of: originalAudio, at: .zero)
    let originalMix = AVMutableAudioMixInputParameters(track: compositionAudio)
    originalMix.setVolume(1.0, at: .zero)
    mixParameters.append(originalMix)
}

let sfxAsset = AVURLAsset(url: tempWavURL)
if let sfxAudio = sfxAsset.tracks(withMediaType: .audio).first,
   let compositionSfx = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try compositionSfx.insertTimeRange(CMTimeRange(start: .zero, duration: source.duration), of: sfxAudio, at: .zero)
    let sfxMix = AVMutableAudioMixInputParameters(track: compositionSfx)
    sfxMix.setVolume(1.0, at: .zero)
    mixParameters.append(sfxMix)
}

try? FileManager.default.removeItem(at: outputURL)
guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    fputs("Could not prepare the video export.\n", stderr)
    exit(1)
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
let audioMix = AVMutableAudioMix()
audioMix.inputParameters = mixParameters
exporter.audioMix = audioMix
let finished = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { finished.signal() }
finished.wait()

guard exporter.status == .completed else {
    fputs("Export failed: \(exporter.error?.localizedDescription ?? "unknown error")\n", stderr)
    exit(1)
}
try? FileManager.default.removeItem(at: tempWavURL)
print("Added original reminder UI effects to \(outputURL.path) (\(String(format: "%.2f", duration)) seconds).")
