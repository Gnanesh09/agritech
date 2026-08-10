"use client";

import StatusBar from "./StatusBar";
import DynamicIsland from "./DynamicIsland";
import GreetingCard from "./GreetingCard";
import SensorGrid from "./SensorGrid";
import MiniChart from "./MiniChart";
import AIInsightCard from "./AIInsightCard";
import BottomNavigation from "./BottomNavigation";

export default function AppScreen() {
  return (
    <div className="relative flex h-full flex-col bg-[#F8FBF8]">

      <StatusBar />

      <DynamicIsland />

      <div className="flex-1 overflow-y-auto pb-24">

        <GreetingCard />

        <SensorGrid />

        <MiniChart />

        <AIInsightCard />

      </div>

      <BottomNavigation />

    </div>
  );
}