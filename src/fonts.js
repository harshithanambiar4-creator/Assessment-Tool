// The font menu in the writing area, modelled on Microsoft Word's font list.
//
// A web page can only use fonts that are installed on the viewer's own device (Word has the same
// limit). So each font is checked on the participant's device and only shown if it's there — except
// fonts with a free look-alike ("alt", loaded from Google Fonts in index.html), which work everywhere.

// [name, look-alike web font or null, generic fallback]
const LIST = [
  // Microsoft Office / Windows
  ["Agency FB", null, "sans-serif"], ["Algerian", null, "serif"], ["Aptos", null, "sans-serif"],
  ["Aptos Display", null, "sans-serif"], ["Aptos Narrow", null, "sans-serif"], ["Aptos Serif", null, "serif"],
  ["Aptos Mono", null, "monospace"], ["Arial", "Arimo", "sans-serif"], ["Arial Black", null, "sans-serif"],
  ["Arial Narrow", null, "sans-serif"], ["Arial Rounded MT Bold", null, "sans-serif"], ["Bahnschrift", null, "sans-serif"],
  ["Baskerville Old Face", "Libre Baskerville", "serif"], ["Bell MT", null, "serif"], ["Berlin Sans FB", null, "sans-serif"],
  ["Bierstadt", null, "sans-serif"], ["Bodoni MT", null, "serif"], ["Book Antiqua", null, "serif"],
  ["Bookman Old Style", null, "serif"], ["Bradley Hand ITC", null, "cursive"], ["Britannic Bold", null, "sans-serif"],
  ["Broadway", null, "fantasy"], ["Calibri", "Carlito", "sans-serif"], ["Calibri Light", "Carlito", "sans-serif"],
  ["Californian FB", null, "serif"], ["Calisto MT", null, "serif"], ["Cambria", "Caladea", "serif"],
  ["Candara", null, "sans-serif"], ["Castellar", null, "serif"], ["Centaur", null, "serif"], ["Century", null, "serif"],
  ["Century Gothic", "Didact Gothic", "sans-serif"], ["Century Schoolbook", null, "serif"], ["Chiller", null, "fantasy"],
  ["Colonna MT", null, "fantasy"], ["Comic Sans MS", "Comic Neue", "cursive"], ["Consolas", null, "monospace"],
  ["Constantia", null, "serif"], ["Cooper Black", null, "serif"], ["Copperplate Gothic Light", null, "serif"],
  ["Corbel", null, "sans-serif"], ["Courier New", "Cousine", "monospace"], ["Curlz MT", null, "fantasy"],
  ["Ebrima", null, "sans-serif"], ["Edwardian Script ITC", null, "cursive"], ["Elephant", null, "serif"],
  ["Engravers MT", null, "serif"], ["Eras ITC", null, "sans-serif"], ["Felix Titling", null, "serif"],
  ["Footlight MT Light", null, "serif"], ["Forte", null, "cursive"], ["Franklin Gothic Book", "Libre Franklin", "sans-serif"],
  ["Franklin Gothic Medium", "Libre Franklin", "sans-serif"], ["Freestyle Script", null, "cursive"],
  ["French Script MT", null, "cursive"], ["Gabriola", null, "serif"], ["Gadugi", null, "sans-serif"],
  ["Garamond", "EB Garamond", "serif"], ["Georgia", "Gelasio", "serif"], ["Gigi", null, "fantasy"],
  ["Gill Sans MT", null, "sans-serif"], ["Gloucester MT Extra Condensed", null, "serif"], ["Goudy Old Style", null, "serif"],
  ["Grandview", null, "sans-serif"], ["Haettenschweiler", null, "sans-serif"], ["Harlow Solid Italic", null, "cursive"],
  ["Harrington", null, "fantasy"], ["High Tower Text", null, "serif"], ["Impact", null, "sans-serif"],
  ["Imprint MT Shadow", null, "serif"], ["Informal Roman", null, "cursive"], ["Ink Free", null, "cursive"],
  ["Jokerman", null, "fantasy"], ["Juice ITC", null, "fantasy"], ["Kristen ITC", null, "cursive"],
  ["Kunstler Script", null, "cursive"], ["Leelawadee UI", null, "sans-serif"], ["Lucida Bright", null, "serif"],
  ["Lucida Calligraphy", null, "cursive"], ["Lucida Console", null, "monospace"], ["Lucida Fax", null, "serif"],
  ["Lucida Handwriting", null, "cursive"], ["Lucida Sans", null, "sans-serif"], ["Lucida Sans Typewriter", null, "monospace"],
  ["Lucida Sans Unicode", null, "sans-serif"], ["Magneto", null, "fantasy"], ["Maiandra GD", null, "sans-serif"],
  ["Matura MT Script Capitals", null, "fantasy"], ["Microsoft Sans Serif", null, "sans-serif"], ["Mistral", null, "cursive"],
  ["Modern No. 20", null, "serif"], ["Monotype Corsiva", null, "cursive"], ["MS Gothic", null, "monospace"],
  ["MV Boli", null, "cursive"], ["Niagara Solid", null, "fantasy"], ["Nirmala UI", null, "sans-serif"],
  ["OCR A Extended", null, "monospace"], ["Old English Text MT", null, "fantasy"], ["Onyx", null, "fantasy"],
  ["Palace Script MT", null, "cursive"], ["Palatino Linotype", null, "serif"], ["Papyrus", null, "fantasy"],
  ["Parchment", null, "cursive"], ["Perpetua", null, "serif"], ["Playbill", null, "fantasy"], ["Poor Richard", null, "serif"],
  ["Pristina", null, "cursive"], ["Rage Italic", null, "cursive"], ["Ravie", null, "fantasy"], ["Rockwell", null, "serif"],
  ["Script MT Bold", null, "cursive"], ["Seaford", null, "sans-serif"], ["Segoe Print", null, "cursive"],
  ["Segoe Script", null, "cursive"], ["Segoe UI", null, "sans-serif"], ["Showcard Gothic", null, "fantasy"],
  ["Skeena", null, "sans-serif"], ["Snap ITC", null, "fantasy"], ["Stencil", null, "fantasy"], ["Sylfaen", null, "serif"],
  ["Tahoma", null, "sans-serif"], ["Tempus Sans ITC", null, "cursive"], ["Tenorite", null, "sans-serif"],
  ["Times New Roman", "Tinos", "serif"], ["Trebuchet MS", null, "sans-serif"], ["Tw Cen MT", null, "sans-serif"],
  ["Verdana", null, "sans-serif"], ["Viner Hand ITC", null, "cursive"], ["Vivaldi", null, "cursive"],
  ["Vladimir Script", null, "cursive"], ["Wide Latin", null, "serif"],
  // Common on Macs
  ["American Typewriter", null, "serif"], ["Avenir", null, "sans-serif"], ["Avenir Next", null, "sans-serif"],
  ["Baskerville", "Libre Baskerville", "serif"], ["Didot", null, "serif"], ["Futura", null, "sans-serif"],
  ["Gill Sans", null, "sans-serif"], ["Helvetica", "Arimo", "sans-serif"], ["Helvetica Neue", "Arimo", "sans-serif"],
  ["Hoefler Text", null, "serif"], ["Menlo", null, "monospace"], ["Optima", null, "sans-serif"], ["Palatino", null, "serif"],
];

// Shown at the top of the menu, like Word's most-used fonts.
export const COMMON_FONTS = ["Aptos", "Arial", "Calibri", "Cambria", "Garamond", "Georgia", "Times New Roman", "Verdana"];

const q = (name) => (/^[\w-]+$/.test(name) ? name : `'${name}'`);
export const FONTS = LIST.map(([name, alt, generic]) => ({
  name, alt, generic,
  stack: [q(name), alt && q(alt), generic].filter(Boolean).join(", "),
}));
export const fontByName = (name) => FONTS.find((f) => f.name === name);

// Is this font installed on this device? Draw sample text with the font and compare its width with
// the browser's plain fallback fonts; if the width differs from all of them, the font is there.
let canvasCtx = null;
export function isInstalled(name) {
  try {
    canvasCtx = canvasCtx || document.createElement("canvas").getContext("2d");
    const sample = "mmmmmmmmmmlli1WQ@#&_";
    return ["monospace", "serif", "sans-serif"].some((base) => {
      canvasCtx.font = `72px ${base}`;
      const w0 = canvasCtx.measureText(sample).width;
      canvasCtx.font = `72px '${name}', ${base}`;
      return canvasCtx.measureText(sample).width !== w0;
    });
  } catch { return false; }
}

// The fonts this participant can actually use, in Word-like order.
export function availableFonts() {
  return FONTS.filter((f) => f.alt || isInstalled(f.name));
}
// The writing area starts in Aptos (Word's default) if this device has it, otherwise Calibri.
export function defaultFont() {
  return isInstalled("Aptos") ? fontByName("Aptos") : fontByName("Calibri");
}
