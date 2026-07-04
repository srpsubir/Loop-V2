// Analytics stub — all telemetry removed.
// Loop is local-first: no user data leaves the device.

export function initAnalytics(): void {}

export function track(_event: string, _properties?: Record<string, unknown>): void {}

export function captureException(_err: unknown): void {}

export async function shutdownAnalytics(): Promise<void> {}
