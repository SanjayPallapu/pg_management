import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

let args = CommandLine.arguments
guard args.count == 3 else {
    fputs("Usage: swift encode.swift <frames-dir> <output.mp4>\n", stderr)
    exit(1)
}

let framesDirectory = URL(fileURLWithPath: args[1], isDirectory: true)
let outputURL = URL(fileURLWithPath: args[2])
let fileManager = FileManager.default
try? fileManager.removeItem(at: outputURL)

let width = 1080
let height = 1920
let fps: Int32 = 24
let frameFiles = try fileManager.contentsOfDirectory(at: framesDirectory, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension.lowercased() == "jpg" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

guard !frameFiles.isEmpty else {
    fputs("No JPEG frames found.\n", stderr)
    exit(1)
}

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 8_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: 48
    ]
]

let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let attributes: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attributes)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

for (index, url) in frameFiles.enumerated() {
    autoreleasepool {
        while !input.isReadyForMoreMediaData { usleep(1_000) }
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
              let pool = adaptor.pixelBufferPool else {
            fatalError("Could not decode \(url.path)")
        }
        var optionalBuffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer)
        guard let buffer = optionalBuffer else { fatalError("Could not allocate pixel buffer") }
        CVPixelBufferLockBaseAddress(buffer, [])
        let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
        )!
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        CVPixelBufferUnlockBaseAddress(buffer, [])
        let time = CMTime(value: Int64(index), timescale: fps)
        if !adaptor.append(buffer, withPresentationTime: time) {
            fatalError("Failed at frame \(index): \(writer.error?.localizedDescription ?? "unknown error")")
        }
    }
    if index % 48 == 0 { print("Encoded frame \(index)/\(frameFiles.count)") }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()

guard writer.status == .completed else {
    fputs("Encoding failed: \(writer.error?.localizedDescription ?? "unknown error")\n", stderr)
    exit(1)
}
print("Created \(outputURL.path)")
