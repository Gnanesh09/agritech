"use client";

import { useState } from "react";
import { Activity, Droplets, Thermometer, Wind } from "lucide-react";
import type { SensorCapability, Telemetry } from "./dashboard-types";

function SensorIcon({
  sensorKey,
  className,
}: {
  sensorKey: string;
  className?: string;
}) {
  const normalized = sensorKey.toLowerCase();
  if (normalized.includes("temp")) {
    return <Thermometer size={17} className={className} aria-hidden="true" />;
  }
  if (normalized.includes("humid") || normalized.includes("moist")) {
    return <Droplets size={17} className={className} aria-hidden="true" />;
  }
  if (normalized.includes("wind")) {
    return <Wind size={17} className={className} aria-hidden="true" />;
  }
  return <Activity size={17} className={className} aria-hidden="true" />;
}

function labelFor(sensor: SensorCapability) {
  return (sensor.label || sensor.key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatReading(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  const number = Number(value);
  return Number.isFinite(number)
    ? Number.isInteger(number)
      ? String(number)
      : number.toFixed(1)
    : String(value);
}

function formatTime(value: string | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function EnvironmentalChart({
  sensors,
  telemetry,
  deviceName,
}: {
  sensors: SensorCapability[];
  telemetry: Telemetry[];
  deviceName: string | null;
}) {
  const numericSensors = sensors.filter((sensor) => sensor.type === "number");
  const [selectedKey, setSelectedKey] = useState("");
  const selectedSensor =
    numericSensors.find((sensor) => sensor.key === selectedKey) ??
    numericSensors[0];
  const isMoistureSensor = /humid|moist/.test(
    selectedSensor?.key.toLowerCase() ?? "",
  );

  const series = selectedSensor
    ? [...telemetry]
        .sort(
          (first, second) =>
            new Date(first.recordedAt).getTime() -
            new Date(second.recordedAt).getTime(),
        )
        .flatMap((sample) => {
          const value = Number(sample.data[selectedSensor.key]);
          return Number.isFinite(value)
            ? [{ value, recordedAt: sample.recordedAt }]
            : [];
        })
    : [];

  const latestValue = series.at(-1)?.value;
  const values = series.map((sample) => sample.value);
  const lowest = values.length ? Math.min(...values) : 0;
  const highest = values.length ? Math.max(...values) : 0;
  const padding = Math.max((highest - lowest) * 0.16, Math.abs(highest) * 0.04, 1);
  const min = lowest - padding;
  const max = highest + padding;
  const points = series.map((sample, index) => ({
    ...sample,
    x: series.length === 1 ? 350 : 24 + (index / (series.length - 1)) * 652,
    y: 16 + ((max - sample.value) / (max - min)) * 154,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const fillPath = points.length
    ? `${linePath} L ${points.at(-1)?.x} 184 L ${points[0].x} 184 Z`
    : "";

  return (
    <section className="rounded-2xl border border-[#e7e9df] bg-white p-5 shadow-[0_2px_12px_rgba(30,55,34,0.025)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[#263b2c]">
            Growing environment
          </h2>
          <p className="mt-1 text-xs text-[#849080]">
            {deviceName
              ? `Recent readings from ${deviceName}`
              : "Recent crop-condition readings"}
          </p>
        </div>
        <span className="rounded-lg border border-[#e7e9df] px-2.5 py-1.5 text-[10px] text-[#849080]">
          Latest 50 readings
        </span>
      </div>

      {numericSensors.length > 0 ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Sensor history">
            {numericSensors.slice(0, 5).map((sensor) => {
              const active = sensor.key === selectedSensor?.key;
              return (
                <button
                  key={sensor.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedKey(sensor.key)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                    active
                      ? "bg-[#edf2e5] text-[#4e7047]"
                      : "text-[#849080] hover:bg-[#f5f6f1]"
                  }`}
                >
                  {labelFor(sensor)}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-end gap-2">
            {selectedSensor && (
              <SensorIcon
                sensorKey={selectedSensor.key}
                className="mb-1 text-[#73945f]"
              />
            )}
            <p className="text-[30px] font-semibold leading-none tracking-[-0.05em] text-[#294532]">
              {latestValue === undefined ? "--" : formatReading(latestValue)}
              {selectedSensor?.unit && (
                <span className="ml-1 text-base font-medium tracking-normal text-[#7b8e73]">
                  {selectedSensor.unit}
                </span>
              )}
            </p>
            <span className="mb-1 flex items-center gap-1 text-[10px] text-[#82927d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#83a369]" />
              {series.length ? "Live API data" : "No readings yet"}
            </span>
          </div>

          {points.length > 1 ? (
            <div className="mt-4">
              <svg
                className="h-[190px] w-full overflow-visible"
                viewBox="0 0 700 200"
                role="img"
                aria-label={`${labelFor(selectedSensor!)} history with ${points.length} readings`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="environment-area" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      className={`dashboard-chart-area${isMoistureSensor ? " dashboard-chart-area-blue" : ""}`}
                      offset="0%"
                      stopOpacity="0.2"
                    />
                    <stop
                      className={`dashboard-chart-area${isMoistureSensor ? " dashboard-chart-area-blue" : ""}`}
                      offset="100%"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                {[28, 78, 128, 178].map((y) => (
                  <line
                    key={y}
                    className="dashboard-chart-grid"
                    x1="20"
                    x2="690"
                    y1={y}
                    y2={y}
                    stroke="#edf0e9"
                    strokeDasharray="2 5"
                  />
                ))}
                <path d={fillPath} fill="url(#environment-area)" />
                <path
                  className={`dashboard-chart-line${isMoistureSensor ? " dashboard-chart-blue" : ""}`}
                  d={linePath}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <circle
                  className={`dashboard-chart-point${isMoistureSensor ? " dashboard-chart-blue" : ""}`}
                  cx={points.at(-1)?.x}
                  cy={points.at(-1)?.y}
                  r="4"
                  strokeWidth="2"
                />
              </svg>
              <div className="flex justify-between px-1 text-[10px] text-[#9aa393]">
                <span>{formatTime(points[0].recordedAt)}</span>
                {points.length > 2 && (
                  <span>{formatTime(points[Math.floor(points.length / 2)].recordedAt)}</span>
                )}
                <span>{formatTime(points.at(-1)?.recordedAt)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex min-h-[156px] flex-col items-center justify-center rounded-xl border border-dashed border-[#e7e9df] bg-[#fafbf8] px-4 text-center">
              <Activity size={21} className="text-[#91a285]" aria-hidden="true" />
              <p className="mt-2 text-xs font-medium text-[#65745f]">
                {points.length === 1
                  ? "One reading received"
                  : "No readings for this sensor yet"}
              </p>
              <p className="mt-1 text-[10px] text-[#929b8c]">
                A trend appears after the device reports more data.
              </p>
            </div>
          )}
          <p className="mt-3 text-[10px] text-[#9aa393]">
            {series.length
              ? `${series.length} recorded point${series.length === 1 ? "" : "s"} · values from authenticated device telemetry`
              : "No sample values are shown when telemetry is unavailable."}
          </p>
        </>
      ) : (
        <div className="mt-5 flex min-h-[228px] flex-col items-center justify-center rounded-xl border border-dashed border-[#e7e9df] bg-[#fafbf8] px-5 text-center">
          <Activity size={23} className="text-[#91a285]" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-[#52644e]">
            {sensors.length ? "No numeric sensors configured" : "No sensor data yet"}
          </p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[#929b8c]">
            {deviceName
              ? "This device has not reported a numeric sensor history."
              : "Connect a device to see real environmental readings here."}
          </p>
        </div>
      )}
    </section>
  );
}
