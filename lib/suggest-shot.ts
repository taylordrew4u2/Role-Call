export interface ShotSuggestion {
  shotSize?: string;
  angle?: string;
  movement?: string;
}

// Keyword → field guesses. Order matters: more specific phrases first.
const SIZE_RULES: [RegExp, string][] = [
  [/\bextreme close|\becu\b/, "ECU"],
  [/\bclose[- ]?up|\bclose on\b|\bcu\b/, "CU"],
  [/\bmedium close|\bmcu\b/, "MCU"],
  [/\bover[- ]the[- ]shoulder|\bots\b/, "OTS"],
  [/\bpov\b|point of view/, "POV"],
  [/\binsert\b/, "Insert"],
  [/\bmedium (wide|long)|\bmws\b/, "MWS"],
  [/\bmedium\b|\bms\b/, "MS"],
  [/\bextreme wide|\bestablish|\bews\b|\baerial\b|\bdrone\b/, "EWS"],
  [/\bwide\b|\blong shot\b|\bws\b/, "WS"],
];

const MOVE_RULES: [RegExp, string][] = [
  [/\bsteadicam\b/, "Steadicam"],
  [/\bgimbal\b/, "Gimbal"],
  [/\bhand[- ]?held\b/, "Handheld"],
  [/\bdolly\b|\bpush in\b|\bpull out\b/, "Dolly"],
  [/\btrack|\btracking\b/, "Track"],
  [/\bcrane\b|\bjib\b/, "Crane"],
  [/\bzoom\b/, "Zoom"],
  [/\bpan\b|\bpanning\b/, "Pan"],
  [/\btilt\b/, "Tilt"],
  [/\bstatic\b|\block(ed)?[- ]?off\b|\bon sticks\b|\btripod\b/, "Static"],
];

const ANGLE_RULES: [RegExp, string][] = [
  [/\bhigh angle\b|\bfrom above\b|\blooking down\b/, "High"],
  [/\blow angle\b|\bfrom below\b|\blooking up\b/, "Low"],
  [/\boverhead\b|\btop[- ]down\b|\bbird'?s[- ]eye\b/, "Overhead"],
  [/\bdutch\b|\bcanted\b|\btilted angle\b/, "Dutch"],
  [/\bworm'?s[- ]eye\b|\bground level\b/, "Worm's-eye"],
  [/\beye[- ]level\b/, "Eye-level"],
];

function firstMatch(text: string, rules: [RegExp, string][]): string | undefined {
  for (const [re, val] of rules) if (re.test(text)) return val;
  return undefined;
}

/** Suggest shot size / angle / movement from a free-text description. */
export function suggestShotFields(description: string): ShotSuggestion {
  const t = description.toLowerCase();
  return {
    shotSize: firstMatch(t, SIZE_RULES),
    angle: firstMatch(t, ANGLE_RULES),
    movement: firstMatch(t, MOVE_RULES),
  };
}
