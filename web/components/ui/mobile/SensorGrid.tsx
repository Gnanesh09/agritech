"use client";

import {
  Thermometer,
  Droplets,
  Sun,
 Sprout,
} from "lucide-react";

import SensorCard from "./SensorCard";

export default function SensorGrid() {
  return (
    <div className="mx-4 mt-5 grid grid-cols-2 gap-4">

      <SensorCard
        icon={<Thermometer size={22} />}
        title="Temperature"
        value="28"
        unit="°C"
        trend="+1.2°C"
        color="bg-red-500"
      />

      <SensorCard
        icon={<Droplets size={22} />}
        title="Humidity"
        value="68"
        unit="%"
        trend="Optimal"
        color="bg-blue-500"
      />

      <SensorCard
        icon={<Sun size={22} />}
        title="Light"
        value="845"
        unit="Lux"
        trend="Strong"
        color="bg-yellow-500"
      />

      <SensorCard
        icon={<Sprout size={22} />}
        title="Soil"
        value="72"
        unit="%"
        trend="Healthy"
        color="bg-green-600"
      />

    </div>
  );
}
