import XCTest

// ─── Log export ───────────────────────────────────────────────────────────────
// Every test run writes a timestamped log file into SwiftUI_Tests/logs/

private let logsDir: URL = {
    let here = URL(fileURLWithPath: #file).deletingLastPathComponent()
    let dir = here.appendingPathComponent("logs")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
}()

private var logLines: [String] = []

private func log(_ message: String) {
    let stamp = ISO8601DateFormatter().string(from: Date())
    let line = "[\(stamp)] \(message)"
    logLines.append(line)
    print(line)
}

private func flushLog(name: String) {
    let timestamp = Int(Date().timeIntervalSince1970)
    let file = logsDir.appendingPathComponent("\(name)_\(timestamp).log")
    let content = logLines.joined(separator: "\n")
    try? content.write(to: file, atomically: true, encoding: .utf8)
    logLines.removeAll()
}

// ─── Test suite ───────────────────────────────────────────────────────────────

final class LoopUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        logLines.removeAll()
        log("=== \(name) — setUp ===")

        app = XCUIApplication(bundleIdentifier: "com.loop.app")
        app.launch()
        log("App launched")
    }

    override func tearDown() {
        log("=== \(name) — tearDown ===")
        app.terminate()
        flushLog(name: name.replacingOccurrences(of: "[^a-zA-Z0-9_]", with: "_", options: .regularExpression))
        super.tearDown()
    }

    // ── App identity ──────────────────────────────────────────────────────────

    func testAppNameIsLoop() {
        log("Checking app name in menu bar")
        let menuBar = XCUIApplication(bundleIdentifier: "com.loop.app")
        XCTAssertTrue(menuBar.exists, "Loop app should be running")
        log("PASS: Loop app is running")
    }

    func testWindowAppears() {
        log("Checking main window exists")
        let window = app.windows.firstMatch
        XCTAssertTrue(window.waitForExistence(timeout: 10), "Main window should appear within 10 seconds")
        log("PASS: Window appeared — title: \(window.title)")
    }

    func testWindowTitleIsLoop() {
        log("Checking window title")
        let window = app.windows.firstMatch
        _ = window.waitForExistence(timeout: 10)
        XCTAssertEqual(window.title, "Loop", "Window title should be Loop, not Electron")
        log("PASS: Window title is \(window.title)")
    }

    // ── Welcome screen ────────────────────────────────────────────────────────

    func testWelcomeScreenLoads() {
        log("Checking welcome screen")
        let connectButton = app.buttons["Connect WhatsApp"]
        XCTAssertTrue(connectButton.waitForExistence(timeout: 10), "Connect WhatsApp button should appear on welcome screen")
        log("PASS: Welcome screen loaded with Connect WhatsApp button")
    }

    func testConnectWhatsAppButtonIsHittable() {
        log("Checking Connect WhatsApp button is tappable")
        let button = app.buttons["Connect WhatsApp"]
        _ = button.waitForExistence(timeout: 10)
        XCTAssertTrue(button.isHittable, "Connect WhatsApp button should be hittable")
        log("PASS: Button is hittable")
    }

    func testClickingConnectNavigatesToQRScreen() {
        log("Clicking Connect WhatsApp")
        let button = app.buttons["Connect WhatsApp"]
        _ = button.waitForExistence(timeout: 10)
        button.click()
        log("Clicked — waiting for QR screen")

        // After clicking, the connect screen should appear (heading changes)
        let heading = app.staticTexts["Connect WhatsApp"].firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout: 8), "QR/connect screen should appear after clicking")
        log("PASS: QR screen appeared")
    }

    // ── Dock / menu bar identity ──────────────────────────────────────────────

    func testMenuBarShowsLoop() {
        log("Checking menu bar app name")
        // The first menu bar item title should be the app name
        let menuBarItem = app.menuBars.firstMatch.menuBarItems.firstMatch
        _ = menuBarItem.waitForExistence(timeout: 5)
        let title = menuBarItem.title
        XCTAssertEqual(title, "Loop", "Menu bar should show Loop, not Electron — got: \(title)")
        log("PASS: Menu bar shows \(title)")
    }
}
