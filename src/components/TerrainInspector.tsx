import * as React from "react";
import { heightText, UnitSystem } from "./utils/UnitHelpers";

export interface TerrainData {
  elevationMeters: number;
  slopeDegrees: number;
  slopePercent: number;
  aspectDegrees: number;
  distanceMeters: number | null;
}

function distanceText(distanceMeters: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    const feet = distanceMeters * 3.28084;
    const miles = distanceMeters / 1609.344;
    if (feet < 5280) {
      return `${Math.round(feet)} ft`;
    } else if (miles < 10) {
      return `${Math.round(miles * 10) / 10} mi`;
    } else {
      return `${Math.round(miles)} mi`;
    }
  } else {
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} m`;
    } else if (distanceMeters < 10000) {
      return `${Math.round(distanceMeters / 100) / 10} km`;
    } else {
      return `${Math.round(distanceMeters / 1000)} km`;
    }
  }
}

function aspectCompass(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

interface Props {
  data: TerrainData | null;
  unitSystem: UnitSystem;
  isMobile: boolean;
}

export const TerrainInspector: React.FunctionComponent<Props> = ({
  data,
  unitSystem,
  isMobile,
}) => {
  if (data === null) {
    return null;
  }

  const elevation = heightText(data.elevationMeters, unitSystem, true);
  const slope = `${Math.round(data.slopeDegrees)}° / ${Math.round(data.slopePercent)}%`;
  const aspect = aspectCompass(data.aspectDegrees);

  return (
    <>
      {isMobile && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.4 }}
          >
            {/* white outline — vertical */}
            <line x1="10" y1="1" x2="10" y2="6" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <line x1="10" y1="14" x2="10" y2="19" stroke="white" strokeWidth="5" strokeLinecap="round" />
            {/* white outline — horizontal */}
            <line x1="1" y1="10" x2="6" y2="10" stroke="white" strokeWidth="5" strokeLinecap="round" />
            <line x1="14" y1="10" x2="19" y2="10" stroke="white" strokeWidth="5" strokeLinecap="round" />
            {/* black lines — vertical */}
            <line x1="10" y1="1" x2="10" y2="6" stroke="black" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="14" x2="10" y2="19" stroke="black" strokeWidth="3" strokeLinecap="round" />
            {/* black lines — horizontal */}
            <line x1="1" y1="10" x2="6" y2="10" stroke="black" strokeWidth="3" strokeLinecap="round" />
            <line x1="14" y1="10" x2="19" y2="10" stroke="black" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div
        style={{
          position: "fixed",
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 1000,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white",
          padding: "6px 12px",
          borderRadius: 6,
          fontSize: 13,
          fontFamily: "sans-serif",
          whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
        }}
      >
        ▲ {elevation} &nbsp; ⬙ {slope} &nbsp; ↗ {aspect}{data.distanceMeters !== null && <> &nbsp; ⊙ {distanceText(data.distanceMeters, unitSystem)}</>}
      </div>
    </>
  );
};
