// Original Space Wars vector art. Deterministic, no external generation service.
import fs from "node:fs";
const folder = "public/assets/original";
fs.mkdirSync(folder, { recursive: true });
const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs>${defs}</defs>${body}</svg>`;
const write = (name, body, defs) =>
  fs.writeFileSync(`${folder}/${name}.svg`, svg(body, defs));
const palette = [
  ["#fff8cf", "#eab950", "#a44e20"],
  ["#ffe2ad", "#eb9346", "#933b27"],
  ["#ffb592", "#ca4b37", "#69283c"],
  ["#efffff", "#98d8ed", "#467eae"],
  ["#ffcea9", "#d86a42", "#75304a"],
  ["#ffffff", "#d7e5e5", "#8997ad"],
  ["#fff1c9", "#deb071", "#985d4c"],
  ["#eef8ff", "#a49cde", "#615d9f"],
];
for (let i = 0; i < 8; i++) {
  const [light, mid, dark] = palette[i],
    r = [39, 35, 28, 33, 49, 27, 30, 31][i];
  const defs = `<radialGradient id="g"><stop stop-color="${mid}" stop-opacity=".45"/><stop offset=".55" stop-color="${mid}" stop-opacity=".13"/><stop offset="1" stop-color="${mid}" stop-opacity="0"/></radialGradient><radialGradient id="s" cx="35%" cy="28%"><stop stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient><clipPath id="c"><circle cx="80" cy="80" r="${r}"/></clipPath>`;
  let body = '<circle cx="80" cy="80" r="78" fill="url(#g)"/>';
  if (i === 3 || i === 5)
    body += `<path d="M80 4 83 68 146 80 83 84 80 154 77 85 12 80 76 75Z" fill="${light}" opacity=".35"/>`;
  if (i === 7)
    body +=
      '<ellipse cx="80" cy="80" rx="70" ry="17" fill="none" stroke="#bcade3" stroke-width="3" opacity=".5" transform="rotate(-35 80 80)"/><path d="M105 20 88 62M67 99 48 143" stroke="#d3e8fa" stroke-width="5" opacity=".6"/>';
  if (i === 1 || i === 4)
    body += `<path d="M${80 - r} 75Q12 20 73 ${80 - r}M${80 + r} 82Q155 133 84 ${80 + r}" fill="none" stroke="${mid}" stroke-width="3" opacity=".6"/>`;
  body += `<circle cx="80" cy="80" r="${r}" fill="url(#s)" stroke="${mid}" stroke-width="1.2"/>`;
  body += '<g clip-path="url(#c)">';
  for (let n = 0; n < 50; n++) {
    const x = 80 + Math.sin(n * 17.13 + i) * r,
      y = 80 + Math.cos(n * 7.67 + i) * r;
    body += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${4 + (n % 8)} ${-4 + (n % 9)} ${7 + (n % 7)} ${2 + (n % 4)}" fill="none" stroke="${n % 3 ? light : dark}" stroke-width="${1 + (n % 3)}" opacity="${n % 3 ? 0.17 : 0.23}"/>`;
  }
  body += "</g>";
  if (i === 6)
    body += `<circle cx="112" cy="103" r="37" fill="url(#g)"/><circle cx="112" cy="103" r="19" fill="#b0d9e8" stroke="#eff9ff"/><path d="M99 98q14-14 27 4" fill="none" stroke="#e6fbff" stroke-width="3" opacity=".6"/>`;
  write(`star-${i}`, body, defs);
}
for (let i = 0; i < 3; i++) {
  let body = `<ellipse cx="80" cy="80" rx="68" ry="${28 + i * 9}" fill="none" stroke="#ad9a79" stroke-opacity=".15" transform="rotate(${i * 23 - 25} 80 80)"/>`;
  for (let n = 0; n < 22 + i * 6; n++) {
    const a = n * 2.39996,
      x = 80 + Math.cos(a) * (51 + (n % 18)),
      y = 80 + Math.sin(a) * (24 + i * 8 + (n % 6));
    body += `<path d="m${x.toFixed(1)} ${y.toFixed(1)} 5-2 4 3-1 5-5 2-4-4Z" fill="${["#736b62", "#90908a", "#5e686f"][n % 3]}" stroke="#b6b0a2" stroke-opacity=".3" stroke-width=".8"/>`;
  }
  write(`belt-${i}`, body);
}
const icons = {
  forge: "M45 50h70v20H45zM55 70v32l25 14 25-14V70M62 37l18-14 18 14M80 84v22",
  relay:
    "M80 42v74M55 116h50M63 67a24 24 0 0 1 34 0M48 53a45 45 0 0 1 64 0M35 39a63 63 0 0 1 90 0",
  sensors: "M30 80q50-65 100 0-50 65-100 0M80 60v40M60 80h40",
  titanium: "M80 25 119 53v54l-39 28-39-28V53ZM41 53l39 26 39-26M80 79v56",
  logistics: "M30 59h70l-14-14M100 59 86 73M130 101H60l14-14M60 101l14 14",
  trade:
    "M48 48h64v64H48ZM66 32v32M94 32v32M66 96v32M94 96v32M32 66h32M96 66h32M32 94h32M96 94h32",
};
for (const [name, path] of Object.entries(icons))
  write(
    `objective-${name}`,
    `<circle cx="80" cy="80" r="69" fill="#111c26" stroke="#887957" stroke-width="2"/><path d="${path}" stroke="#d8bf8a" stroke-width="4" fill="none" stroke-linejoin="round"/>`,
  );
write(
  "guardian",
  '<circle cx="80" cy="80" r="72" fill="url(#a)"/><path d="M80 16 119 39 139 80 119 121 80 144 41 121 21 80 41 39Z" fill="#273540" stroke="#b9b29b" stroke-width="2"/><path d="M80 31 94 63 128 80 94 96 80 129 66 96 32 80 66 63Z" fill="#5a666e" stroke="#d1bd8e" stroke-width="2"/><path d="M44 43 62 56M116 43 98 56M116 117 98 104M44 117 62 104" stroke="#d4c59d" stroke-width="5"/><circle cx="80" cy="80" r="23" fill="#102d3b" stroke="#88d7e8" stroke-width="3"/><circle cx="80" cy="80" r="11" fill="#d0f8ff"/><path d="M62 20 69 38M98 20 91 38M20 62 38 69M140 98 122 91M62 140 69 122M98 140 91 122" stroke="#97b4bf" stroke-width="3"/>',
  '<radialGradient id="a"><stop stop-color="#67bed2" stop-opacity=".4"/><stop offset="1" stop-color="#67bed2" stop-opacity="0"/></radialGradient>',
);
write(
  "leviathan",
  '<ellipse cx="80" cy="80" rx="78" ry="70" fill="url(#a)"/><path d="M19 132Q52 119 42 97L19 81 44 83Q44 60 70 47L54 20 86 39 111 13 108 49Q137 67 123 98L144 115 111 109Q78 139 60 116 46 145 19 132Z" fill="#302d49" stroke="#958bac" stroke-width="2"/><path d="M38 113Q80 113 72 79L105 39Q113 70 95 83 110 109 78 121M45 77l24-18M101 98l22-10" fill="none" stroke="#646180" stroke-width="8"/><path d="M61 100 80 75 103 59M48 115l15-7" stroke="#b4cbea" stroke-width="3" fill="none"/><path d="m95 49 9-8-3 14Z" fill="#f2e5ff"/><path d="M42 128Q11 143 4 121M118 106q28 15 34 37" stroke="#9e87d0" opacity=".4" stroke-width="2" fill="none"/>',
  '<radialGradient id="a"><stop stop-color="#9675d9" stop-opacity=".4"/><stop offset="1" stop-color="#6a4f93" stop-opacity="0"/></radialGradient>',
);
console.log("Created 19 original vector assets.");
