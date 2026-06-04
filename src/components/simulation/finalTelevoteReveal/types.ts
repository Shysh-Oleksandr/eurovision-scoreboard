export interface FinalTelevoteRevealProps {
  leaderCountryCode: string;
  lastCountryCode: string;
  pointsNeeded: number;
  onRevealComplete: () => void;
}

export type RevealBarStyles = {
  gradientBarBg: string;
  fillBarBg: string;
};
