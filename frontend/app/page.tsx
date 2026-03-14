"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });
const DNAViewer = dynamic(() => import("@/components/dna-viewer"), {
  ssr: false,
});

export default function Page() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div
        className="fixed inset-0 z-50 bg-white animate-white-splash"
        onAnimationEnd={() => setSplashDone(true)}
        style={{ pointerEvents: splashDone ? "none" : "auto" }}
        aria-hidden
      />
      <div className="absolute inset-0">
        <Dither
          waveSpeed={0.02}
          waveFrequency={3}
          waveAmplitude={0.3}
          backgroundColor={[1, 1, 1]}
          waveColor={[0, 0, 0]}
          colorNum={4}
          pixelSize={2}
          enableMouseInteraction
          mouseRadius={1.2}
        />
      </div>
      <div className="absolute inset-0">
        <DNAViewer />
      </div>
    </div>
  );
}
