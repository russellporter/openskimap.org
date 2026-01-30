import {
  Box,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { styled } from "@mui/system";
import {
  getRunDifficultyConvention,
  RunDifficultyConvention,
} from "openskidata-format";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModalHeader } from "./ModalHeader";

// Color palette
const colors = {
  // Run difficulty colors
  blue: "hsl(208, 100%, 33%)",
  green: "hsl(125, 100%, 33%)",
  red: "hsl(359, 94%, 53%)",
  black: "hsl(0, 0%, 0%)",
  orange: "hsl(34, 100%, 50%)",
  gray: "hsl(0, 0%, 35%)",
  // Lift colors
  liftOperating: "hsl(0, 82%, 42%)",
  liftNonOperating: "hsl(0, 53%, 42%)",
  // Lit run color
  litYellow: "hsl(63, 100%, 76%)",
  // Marker colors
  downhillBlue: "#3085FE",
  nordicGreen: "#20B200",
  otherGray: "#A6A6A6",
  // UI colors
  itemBackground: "#f0efef",
  border: "#eee",
};

const LegendContainer = styled(Box)({
  maxWidth: 800,
});

const Section = styled(Box)({
  marginBottom: 24,
});

const LegendGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 12,
});

const LegendItem = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 12px",
  backgroundColor: colors.itemBackground,
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
});

const Label = styled(Typography)({
  fontSize: 14,
  color: "#333",
});

const LabelSecondary = styled(Typography)({
  fontSize: 12,
  color: "#666",
});

const IndicatorGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 12,
});

const IndicatorItem = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  backgroundColor: colors.itemBackground,
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
});

const ConventionSection = styled(Box)({
  backgroundColor: colors.itemBackground,
  borderRadius: 6,
  padding: 12,
  border: `1px solid ${colors.border}`,
});

const ConventionList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

const ConventionItem = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const ColorSwatch = styled(Box)({
  width: 24,
  height: 24,
  borderRadius: 4,
  flexShrink: 0,
  border: "1px solid rgba(0, 0, 0, 0.1)",
});

const MarkerSample = styled("svg")({
  width: 24,
  height: 24,
  flexShrink: 0,
});

const LineSample = styled("svg")({
  width: 70,
  height: 24,
  flexShrink: 0,
});

const SectionTitle = styled(Typography)({
  fontSize: 18,
  fontWeight: 600,
  color: "#444",
  marginBottom: 16,
});

const ConventionSectionTitle = styled(Typography)({
  fontSize: 15,
  fontWeight: 600,
  color: "#444",
  marginBottom: 12,
});

const GradientBar = styled(Box)({
  width: "100%",
  height: 16,
  borderRadius: 8,
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
});

const GradientLabels = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  marginTop: 6,
});

const OverlayCard = styled(Box)({
  backgroundColor: colors.itemBackground,
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
});

const OverlayTitle = styled(Typography)({
  fontSize: 13,
  fontWeight: 600,
  color: "#333",
  marginBottom: 10,
});

const AvalancheGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
});

const AvalancheBlock = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
});

const AvalancheColorBar = styled(Box)({
  width: "100%",
  height: 12,
  borderRadius: 6,
  marginBottom: 6,
});

// Reusable SVG Components
const SkiAreaMarker: React.FC<{ color: string }> = ({ color }) => (
  <MarkerSample viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" fill={color} stroke="white" strokeWidth="2" />
  </MarkerSample>
);

interface RunLineProps {
  strokeColor: string;
  casingColor?: string;
  strokeWidth?: number;
  casingWidth?: number;
  dashArray?: string;
  dashOffset?: string;
  reversed?: boolean;
}

const RunLine: React.FC<RunLineProps> = ({
  strokeColor,
  casingColor = "white",
  strokeWidth = 3,
  casingWidth = 9,
  dashArray,
  dashOffset,
  reversed = false,
}) => (
  <LineSample viewBox="0 0 70 24">
    <line
      x1="5"
      y1="12"
      x2="65"
      y2="12"
      stroke={reversed ? strokeColor : casingColor}
      strokeWidth={casingWidth}
      strokeLinecap="round"
    />
    <line
      x1="5"
      y1="12"
      x2="65"
      y2="12"
      stroke={reversed ? casingColor : strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashArray}
      strokeDashoffset={dashOffset}
    />
  </LineSample>
);

// Types
type Region = "europe" | "north-america" | "japan";

interface DifficultyItem {
  color: string;
  label: string;
}

interface SlopeGrade {
  color: string;
  label: string;
  range: string;
}

interface SlopeGradingConfig {
  downhill: SlopeGrade[];
  nordic: SlopeGrade[];
}

// Data configurations
const difficultyConfig: Record<Region, DifficultyItem[]> = {
  europe: [
    { color: colors.green, label: "Novice" },
    { color: colors.blue, label: "Easy" },
    { color: colors.red, label: "Intermediate" },
    { color: colors.black, label: "Advanced / Expert" },
    { color: colors.orange, label: "Freeride / Extreme" },
    { color: colors.gray, label: "Unknown" },
  ],
  "north-america": [
    { color: colors.green, label: "Novice / Easy" },
    { color: colors.blue, label: "Intermediate" },
    { color: colors.black, label: "Advanced / Expert" },
    { color: colors.orange, label: "Freeride / Extreme" },
    { color: colors.gray, label: "Unknown" },
  ],
  japan: [
    { color: colors.green, label: "Novice / Easy" },
    { color: colors.red, label: "Intermediate" },
    { color: colors.black, label: "Advanced / Expert" },
    { color: colors.orange, label: "Freeride / Extreme" },
    { color: colors.gray, label: "Unknown" },
  ],
};

const slopeGradingConfig: Record<Region, SlopeGradingConfig> = {
  europe: {
    downhill: [
      { color: colors.gray, label: "Flat", range: "< 3°" },
      { color: colors.blue, label: "Easy", range: "3° – 14°" },
      { color: colors.red, label: "Intermediate", range: "14° – 22°" },
      { color: colors.black, label: "Advanced / Expert", range: "22° – 45°" },
      { color: colors.orange, label: "Freeride / Extreme", range: "> 45°" },
    ],
    nordic: [
      { color: colors.blue, label: "Easy", range: "< 6°" },
      { color: colors.red, label: "Intermediate", range: "6° – 9°" },
      { color: colors.black, label: "Advanced", range: "> 9°" },
    ],
  },
  "north-america": {
    downhill: [
      { color: colors.gray, label: "Flat", range: "< 3°" },
      { color: colors.green, label: "Easy", range: "3° – 14°" },
      { color: colors.blue, label: "Intermediate", range: "14° – 22°" },
      { color: colors.black, label: "Advanced / Expert", range: "22° – 45°" },
      { color: colors.orange, label: "Freeride / Extreme", range: "> 45°" },
    ],
    nordic: [
      { color: colors.green, label: "Easy", range: "< 6°" },
      { color: colors.blue, label: "Intermediate", range: "6° – 9°" },
      { color: colors.black, label: "Advanced", range: "> 9°" },
    ],
  },
  japan: {
    downhill: [
      { color: colors.gray, label: "Flat", range: "< 3°" },
      { color: colors.green, label: "Easy", range: "3° – 14°" },
      { color: colors.red, label: "Intermediate", range: "14° – 22°" },
      { color: colors.black, label: "Advanced / Expert", range: "22° – 45°" },
      { color: colors.orange, label: "Freeride / Extreme", range: "> 45°" },
    ],
    nordic: [
      { color: colors.green, label: "Easy", range: "< 6°" },
      { color: colors.red, label: "Intermediate", range: "6° – 9°" },
      { color: colors.black, label: "Advanced", range: "> 9°" },
    ],
  },
};

const skiAreaMarkers = [
  {
    color: colors.downhillBlue,
    label: "Downhill Ski Area",
    secondary: "Alpine skiing",
  },
  {
    color: colors.nordicGreen,
    label: "Nordic Ski Area",
    secondary: "Cross-country skiing",
  },
  {
    color: colors.otherGray,
    label: "Other",
    secondary: "Closed or unknown type",
  },
];

interface LegendProps {
  mapCenter?: { lng: number; lat: number };
  onClose: () => void;
  section?: string | null;
}

function conventionToRegion(convention: RunDifficultyConvention): Region {
  switch (convention) {
    case RunDifficultyConvention.NORTH_AMERICA:
      return "north-america";
    case RunDifficultyConvention.JAPAN:
      return "japan";
    case RunDifficultyConvention.EUROPE:
    default:
      return "europe";
  }
}

export const Legend: React.FunctionComponent<LegendProps> = ({
  mapCenter,
  onClose,
  section,
}) => {
  const slopeOverlaysRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (section === "slope-overlays" && slopeOverlaysRef.current) {
      slopeOverlaysRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [section]);

  const initialRegion = useMemo(() => {
    if (!mapCenter) return "europe";
    const point = {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [mapCenter.lng, mapCenter.lat],
      },
      properties: {},
    };
    const convention = getRunDifficultyConvention(point);
    return conventionToRegion(convention);
  }, [mapCenter]);

  const [region, setRegion] = useState<Region>(initialRegion);
  const isSouthernHemisphere = mapCenter ? mapCenter.lat < 0 : false;

  useEffect(() => {
    setRegion(initialRegion);
  }, [initialRegion]);

  const handleRegionChange = (
    _: React.MouseEvent<HTMLElement>,
    newValue: Region | null,
  ) => {
    if (newValue !== null) {
      setRegion(newValue);
    }
  };

  return (
    <LegendContainer>
      <ModalHeader onClose={onClose}>
        <Typography variant="h5">Legend</Typography>
      </ModalHeader>

      {/* Ski Areas */}
      <Section>
        <SectionTitle>Ski Areas</SectionTitle>
        <LegendGrid>
          {skiAreaMarkers.map(({ color, label, secondary }) => (
            <LegendItem key={label}>
              <SkiAreaMarker color={color} />
              <Box>
                <Label>{label}</Label>
                <LabelSecondary>{secondary}</LabelSecondary>
              </Box>
            </LegendItem>
          ))}
        </LegendGrid>
      </Section>

      <Divider sx={{ my: 3 }} />

      {/* Lifts */}
      <Section>
        <SectionTitle>Lifts</SectionTitle>
        <LegendGrid>
          <LegendItem>
            <LineSample viewBox="0 0 70 24">
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke={colors.liftOperating}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </LineSample>
            <Box>
              <Label>Operating</Label>
              <LabelSecondary>Chairlift, gondola, etc.</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <LineSample viewBox="0 0 70 24">
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1="5"
                y1="12"
                x2="68"
                y2="12"
                stroke={colors.liftNonOperating}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="4,8"
                strokeDashoffset="0"
              />
            </LineSample>
            <Box>
              <Label>Non-Operating</Label>
              <LabelSecondary>
                Planned, under construction, or abandoned
              </LabelSecondary>
            </Box>
          </LegendItem>
        </LegendGrid>
      </Section>

      <Divider sx={{ my: 3 }} />

      {/* Run Types */}
      <Section>
        <SectionTitle>Run Types</SectionTitle>
        <LegendGrid>
          <LegendItem>
            <RunLine strokeColor={colors.blue} />
            <Box>
              <Label>Downhill (groomed)</Label>
              <LabelSecondary>Standard piste</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <RunLine strokeColor={colors.blue} dashArray="6,12" />
            <Box>
              <Label>Downhill (ungroomed)</Label>
              <LabelSecondary>Moguls, ungroomed, or backcountry</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <RunLine
              strokeColor={colors.blue}
              dashArray="1,8"
              dashOffset="-3"
            />
            <Box>
              <Label>Downhill (gladed)</Label>
              <LabelSecondary>Tree skiing</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <RunLine strokeColor={colors.blue} reversed />
            <Box>
              <Label>Nordic (groomed)</Label>
              <LabelSecondary>Cross-country trail</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <RunLine strokeColor={colors.blue} reversed dashArray="6,12" />
            <Box>
              <Label>Nordic (ungroomed)</Label>
              <LabelSecondary>Backcountry nordic route</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <LineSample viewBox="0 0 70 24">
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke={colors.blue}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="9,18"
              />
            </LineSample>
            <Box>
              <Label>Ski Tour</Label>
              <LabelSecondary>Backcountry skiing ascent route</LabelSecondary>
            </Box>
          </LegendItem>

          <LegendItem>
            <LineSample viewBox="0 0 70 24">
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke={colors.blue}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="9,9"
              />
            </LineSample>
            <Box>
              <Label>Other</Label>
              <LabelSecondary>Hiking, sledding, etc.</LabelSecondary>
            </Box>
          </LegendItem>
        </LegendGrid>
      </Section>

      <Section>
        <IndicatorGrid>
          <IndicatorItem>
            <RunLine strokeColor={colors.blue} casingColor={colors.litYellow} />
            <Box>
              <Label sx={{ fontWeight: 500 }}>Lit Run</Label>
              <LabelSecondary>Night skiing</LabelSecondary>
            </Box>
          </IndicatorItem>

          <IndicatorItem>
            <LineSample viewBox="0 0 70 24">
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke={colors.blue}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <g transform="translate(27.5, 5.5)">
                <path
                  d="M14.1824 9.27109L14.1815 9.26956L9.43844 1.57029L9.43741 1.56864C9.00141 0.866988 8.25998 0.5 7.5 0.5C6.7441 0.5 5.991 0.863998 5.56076 1.57161C5.56045 1.57211 5.56015 1.57261 5.55984 1.57311L0.820015 9.26718C0.819744 9.26761 0.819474 9.26804 0.819205 9.26848C0.607482 9.60839 0.5 9.97893 0.5 10.3496C0.5 10.9397 0.713251 11.486 1.12335 11.8843C1.53367 12.2829 2.106 12.5 2.76485 12.5H12.2352C12.894 12.5 13.4663 12.2829 13.8767 11.8843C14.2867 11.486 14.5 10.9397 14.5 10.3496C14.5 9.97383 14.3818 9.59733 14.1824 9.27109Z"
                  fill="red"
                  stroke="#fff"
                />
                <path
                  d="M7.50523 8.65973C7.02356 8.65973 6.75131 8.40515 6.74083 7.95472L6.62565 3.78335C6.61518 3.32313 6.98168 3 7.49477 3C7.99737 3 8.38482 3.33292 8.37433 3.79313L8.23822 7.95472C8.22773 8.41493 7.96596 8.65973 7.50523 8.65973ZM7.50523 11.3133C6.97121 11.3133 6.5 10.9217 6.5 10.4223C6.5 9.92291 6.96072 9.52143 7.50523 9.52143C8.03925 9.52143 8.5 9.92291 8.5 10.4223C8.5 10.9315 8.03925 11.3133 7.50523 11.3133Z"
                  fill="#fff"
                />
              </g>
            </LineSample>
            <Box>
              <Label sx={{ fontWeight: 500 }}>Not patrolled</Label>
              <LabelSecondary>
                <strong>
                  Runs without this indicator may also be unpatrolled.
                </strong>
              </LabelSecondary>
            </Box>
          </IndicatorItem>

          <IndicatorItem>
            <LineSample viewBox="0 0 70 24">
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <line
                x1="5"
                y1="12"
                x2="65"
                y2="12"
                stroke={colors.blue}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <g transform="translate(31, 6.5)">
                <path
                  d="M1.813,10.8811a1.813,1.813,0,0,1-1.2866-3.09L2.8683,5.4321.5311,3.0949A1.8129,1.8129,0,1,1,3.0949.531L7.9871,5.4231,3.1,10.3455A1.8072,1.8072,0,0,1,1.813,10.8811Z"
                  fill="#fff"
                />
                <path
                  d="M1.813,9.9746a.9065.9065,0,0,1-.643-1.5452L4.148,5.43,1.172,2.454A.9065.9065,0,0,1,2.454,1.172L6.7074,5.4253,2.4562,9.7069A.9042.9042,0,0,1,1.813,9.9746Z"
                  fill="#005aa8"
                />
              </g>
            </LineSample>
            <Box>
              <Label sx={{ fontWeight: 500 }}>One-way</Label>
              <LabelSecondary>
                Direction of travel indicated by arrows
              </LabelSecondary>
            </Box>
          </IndicatorItem>
        </IndicatorGrid>
      </Section>

      <Divider sx={{ my: 3 }} />

      {/* Run Difficulty Section with Region Selector */}
      <Section>
        <SectionTitle>Run Difficulty</SectionTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontSize: 14, color: "#444" }}>
            Colors vary by region:
          </Typography>
          <ToggleButtonGroup
            value={region}
            exclusive
            onChange={handleRegionChange}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                px: 2,
                py: 0.5,
                fontSize: 13,
              },
            }}
          >
            <ToggleButton value="europe">Europe</ToggleButton>
            <ToggleButton value="north-america">North America</ToggleButton>
            <ToggleButton value="japan">Japan</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Two-column layout: Run Difficulty on left, Slope Grading on right */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "auto 1fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
          {/* Left column: Run Difficulty */}
          <ConventionSection sx={{ width: { xs: "fit-content", md: 200 } }}>
            <ConventionList>
              {difficultyConfig[region].map(({ color, label }) => (
                <ConventionItem key={label}>
                  <ColorSwatch sx={{ backgroundColor: color }} />
                  <Label>{label}</Label>
                </ConventionItem>
              ))}
            </ConventionList>
          </ConventionSection>

          {/* Right column: Slope Grading */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Downhill / Ski Tour */}
            <ConventionSection>
              <ConventionSectionTitle>
                Downhill / Ski Tour Slope Grading
              </ConventionSectionTitle>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(3, 1fr)",
                    sm: `repeat(${slopeGradingConfig[region].downhill.length}, 1fr)`,
                  },
                  gap: 1,
                }}
              >
                {slopeGradingConfig[region].downhill.map(
                  ({ color, label, range }) => (
                    <Box
                      key={label}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: 12,
                          borderRadius: 6,
                          marginBottom: 0.75,
                          backgroundColor: color,
                        }}
                      />
                      <LabelSecondary sx={{ fontWeight: 500, color: "#555" }}>
                        {label}
                      </LabelSecondary>
                      <LabelSecondary>{range}</LabelSecondary>
                    </Box>
                  ),
                )}
              </Box>
            </ConventionSection>

            {/* Nordic */}
            <ConventionSection>
              <ConventionSectionTitle>
                Nordic Slope Grading
              </ConventionSectionTitle>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${slopeGradingConfig[region].nordic.length}, 1fr)`,
                  gap: 1,
                }}
              >
                {slopeGradingConfig[region].nordic.map(
                  ({ color, label, range }) => (
                    <Box
                      key={label}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: 12,
                          borderRadius: 6,
                          marginBottom: 0.75,
                          backgroundColor: color,
                        }}
                      />
                      <LabelSecondary sx={{ fontWeight: 500, color: "#555" }}>
                        {label}
                      </LabelSecondary>
                      <LabelSecondary>{range}</LabelSecondary>
                    </Box>
                  ),
                )}
              </Box>
            </ConventionSection>

            <LabelSecondary>
              Slope angle is used to estimate run difficulty for certain
              features like elevation profile and slope overlay. For elevation
              profiles, slope is calculated along the route. For slope overlays,
              it is calculated along the fall line.
            </LabelSecondary>
          </Box>
        </Box>
      </Section>

      <Divider sx={{ my: 3 }} />

      <Section ref={slopeOverlaysRef}>
        <SectionTitle>Slope Overlays</SectionTitle>
        <Typography sx={{ fontSize: 13, color: "#666", mb: 2 }}>
          Terrain overlays show slope characteristics when enabled in the layers
          menu.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <OverlayCard>
            <OverlayTitle>Classic</OverlayTitle>
            <GradientBar
              sx={{
                background:
                  "linear-gradient(to right, rgb(0, 180, 0), rgb(255, 255, 0), rgb(255, 128, 0), rgb(255, 0, 0))",
              }}
            />
            <GradientLabels>
              <LabelSecondary>0° Flat</LabelSecondary>
              <LabelSecondary>15°</LabelSecondary>
              <LabelSecondary>30°</LabelSecondary>
              <LabelSecondary>45°+</LabelSecondary>
            </GradientLabels>
          </OverlayCard>

          <OverlayCard>
            <OverlayTitle>Sun Exposure</OverlayTitle>
            <GradientBar
              sx={{
                background:
                  "linear-gradient(to right, rgb(26, 51, 204), rgb(51, 128, 230), rgb(128, 204, 128), rgb(230, 230, 51), rgb(255, 128, 0), rgb(255, 26, 0))",
              }}
            />
            <GradientLabels>
              <LabelSecondary>No sun</LabelSecondary>
              <LabelSecondary>Very low</LabelSecondary>
              <LabelSecondary>Low</LabelSecondary>
              <LabelSecondary>Moderate</LabelSecondary>
              <LabelSecondary>High</LabelSecondary>
            </GradientLabels>
          </OverlayCard>

          <OverlayCard>
            <OverlayTitle>Aspect</OverlayTitle>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{ position: "relative", flexShrink: 0, padding: "16px" }}
              >
                <Box
                  sx={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: isSouthernHemisphere
                      ? `conic-gradient(
                          from 0deg,
                          rgb(255, 51, 0) 0deg,
                          rgb(230, 230, 51) 45deg,
                          rgb(153, 230, 128) 90deg,
                          rgb(77, 153, 230) 135deg,
                          rgb(51, 102, 255) 180deg,
                          rgb(128, 204, 77) 225deg,
                          rgb(255, 204, 0) 270deg,
                          rgb(255, 128, 0) 315deg,
                          rgb(255, 51, 0) 360deg
                        )`
                      : `conic-gradient(
                          from 0deg,
                          rgb(51, 102, 255) 0deg,
                          rgb(77, 153, 230) 45deg,
                          rgb(153, 230, 128) 90deg,
                          rgb(230, 230, 51) 135deg,
                          rgb(255, 51, 0) 180deg,
                          rgb(255, 128, 0) 225deg,
                          rgb(255, 204, 0) 270deg,
                          rgb(128, 204, 77) 315deg,
                          rgb(51, 102, 255) 360deg
                        )`,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                  }}
                />
                {/* Direction labels */}
                <Typography
                  sx={{
                    position: "absolute",
                    top: -2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#444",
                  }}
                >
                  N
                </Typography>
                <Typography
                  sx={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#444",
                  }}
                >
                  E
                </Typography>
                <Typography
                  sx={{
                    position: "absolute",
                    bottom: -2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#444",
                  }}
                >
                  S
                </Typography>
                <Typography
                  sx={{
                    position: "absolute",
                    left: 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#444",
                  }}
                >
                  W
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "4px 8px",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "2px",
                    backgroundColor: isSouthernHemisphere
                      ? "rgb(255, 51, 0)"
                      : "rgb(51, 102, 255)",
                  }}
                />
                <LabelSecondary>
                  N - {isSouthernHemisphere ? "Most sun" : "Least sun"}
                </LabelSecondary>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "2px",
                    backgroundColor: "rgb(153, 230, 128)",
                  }}
                />
                <LabelSecondary>E - Morning</LabelSecondary>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "2px",
                    backgroundColor: isSouthernHemisphere
                      ? "rgb(51, 102, 255)"
                      : "rgb(255, 51, 0)",
                  }}
                />
                <LabelSecondary>
                  S - {isSouthernHemisphere ? "Least sun" : "Most sun"}
                </LabelSecondary>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "2px",
                    backgroundColor: "rgb(255, 204, 0)",
                  }}
                />
                <LabelSecondary>W - Afternoon</LabelSecondary>
              </Box>
            </Box>
          </OverlayCard>

          <OverlayCard>
            <OverlayTitle>Avalanche Slope Classes</OverlayTitle>
            <LabelSecondary sx={{ mb: 1.5 }}>
              Slope angle classified by avalanche risk. Avalanche releases below
              30° are rare.
            </LabelSecondary>
            <AvalancheGrid>
              <AvalancheBlock>
                <AvalancheColorBar
                  sx={{ backgroundColor: "rgb(255, 255, 128)" }}
                />
                <LabelSecondary sx={{ fontWeight: 500, color: "#555" }}>
                  30-35°
                </LabelSecondary>
                <LabelSecondary>Risk increasing</LabelSecondary>
              </AvalancheBlock>
              <AvalancheBlock>
                <AvalancheColorBar
                  sx={{ backgroundColor: "rgb(255, 179, 102)" }}
                />
                <LabelSecondary sx={{ fontWeight: 500, color: "#555" }}>
                  35-40°
                </LabelSecondary>
                <LabelSecondary>Sharply increasing</LabelSecondary>
              </AvalancheBlock>
              <AvalancheBlock>
                <AvalancheColorBar
                  sx={{ backgroundColor: "rgb(255, 128, 128)" }}
                />
                <LabelSecondary sx={{ fontWeight: 500, color: "#555" }}>
                  40-45°
                </LabelSecondary>
                <LabelSecondary>Peak risk</LabelSecondary>
              </AvalancheBlock>
              <AvalancheBlock>
                <AvalancheColorBar
                  sx={{ backgroundColor: "rgb(191, 128, 217)" }}
                />
                <LabelSecondary sx={{ fontWeight: 500, color: "#555" }}>
                  45°+
                </LabelSecondary>
                <LabelSecondary>Still high</LabelSecondary>
              </AvalancheBlock>
            </AvalancheGrid>
            <LabelSecondary sx={{ mt: 1.5, lineHeight: 1.4 }}>
              When planning a route, consider not only the slope you're on but
              also surrounding terrain—especially slopes directly above your
              path.
            </LabelSecondary>
          </OverlayCard>
        </Box>
      </Section>
    </LegendContainer>
  );
};
