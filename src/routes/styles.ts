export function getComputedStyle(varName: string): string {
    return (window.getComputedStyle(document.documentElement as any) as any).getPropertyValue(
        varName
    );
}

export const cText = getComputedStyle('--text');
export const cBackground = getComputedStyle('--background');
export const cPrimary = getComputedStyle('--primary');
export const cSecondary = getComputedStyle('--secondary');
export const cAccent = getComputedStyle('--accent');
export const cPlayedSection = getComputedStyle('--played-section');
export const cUnplayedSection = getComputedStyle('--unplayed-section');
export const cHoverOnWaveBar = getComputedStyle('--hover-on-wave-bar');
export const cSelectedRegion = getComputedStyle('--selected-region');
