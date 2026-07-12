// MAV-253: shared between main (BrowserWindow trafficLightPosition) and
// renderer (safe-zone padding) so the two can never drift apart again — the
// original bug was exactly this: an implicit, undocumented default position
// with zero coordination between the native window chrome and renderer layout.
//
// Values match macOS's standard hiddenInset traffic-light placement.
export const TRAFFIC_LIGHT_POSITION = { x: 20, y: 20 } as const

// Bounding box (from the window's top-left) that native traffic-light buttons
// occupy. Nothing interactive or load-bearing should render inside this zone.
export const TRAFFIC_LIGHT_SAFE_ZONE = { width: 78, height: 28 } as const
