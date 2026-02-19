export function useColorContrast() {
  const getContrastColor = (bgColor) => {
    if (!bgColor) return "#000000";

    // Convert color to RGB
    let r, g, b;

    // Handle hex colors
    if (bgColor.startsWith("#")) {
      const hex = bgColor.replace("#", "");
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    }
    // Handle rgb/rgba colors
    else if (bgColor.startsWith("rgb")) {
      const matches = bgColor.match(/\d+/g);
      r = parseInt(matches[0]);
      g = parseInt(matches[1]);
      b = parseInt(matches[2]);
    }
    // Fallback for named colors - create temp element
    else {
      const temp = document.createElement("div");
      temp.style.color = bgColor;
      document.body.appendChild(temp);
      const computed = window.getComputedStyle(temp).color;
      document.body.removeChild(temp);
      const matches = computed.match(/\d+/g);
      r = parseInt(matches[0]);
      g = parseInt(matches[1]);
      b = parseInt(matches[2]);
    }

    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  return {
    getContrastColor,
  };
}
