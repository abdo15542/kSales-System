export type PrinterConnection = "system" | "usb" | "bluetooth" | "network";
export type ThermalPaperWidth = "58" | "80";

export function inferThermalPaperWidth(deviceName: string): ThermalPaperWidth {
  return /(?:^|\D)58(?:\D|$)|pos[-\s]?58|thermal[-\s]?58/i.test(deviceName) ? "58" : "80";
}

export function makeDetectedPrinterProfile(deviceName: string, connection: Exclude<PrinterConnection, "system">) {
  const normalizedName = deviceName.trim() || "طابعة حرارية";
  return {
    deviceName: normalizedName,
    model: normalizedName,
    paperWidth: inferThermalPaperWidth(normalizedName),
    connection,
  } as const;
}
