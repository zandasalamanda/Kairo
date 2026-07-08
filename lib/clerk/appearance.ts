// Dark theme for Clerk's prebuilt components, matched to Solaspace's palette.
export const clerkAppearance = {
  variables: {
    colorBackground: "#0d0e11",
    colorText: "#f2f3f5",
    colorTextSecondary: "#9a9ea8",
    colorPrimary: "#e6b877",
    colorInputBackground: "#16181d",
    colorInputText: "#f2f3f5",
    colorNeutral: "#f2f3f5",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "bg-canvas-2 border border-line shadow-none",
    headerTitle: "text-ink",
    socialButtonsBlockButton: "border border-line",
    formButtonPrimary: "bg-accent text-[#1b1206] hover:brightness-105",
  },
} as const;
