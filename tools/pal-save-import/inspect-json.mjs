import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const raw = fs.readFileSync(path, "utf8");
const data = JSON.parse(raw);

function walk(value, currentPath = "root", depth = 0) {
  if (depth > 6) return;

  if (Array.isArray(value)) {
    if (value.length > 0) {
      const sample = value[0];

      if (
        sample &&
        typeof sample === "object" &&
        !Array.isArray(sample)
      ) {
        const keys = Object.keys(sample);

        const interesting =
          keys.some((key) =>
            /pal|character|instance|skill|level|talent|passive/i.test(key),
          );

        if (interesting) {
          console.log("\nARRAY:", currentPath);
          console.log("LENGTH:", value.length);
          console.log("SAMPLE KEYS:", keys.slice(0, 30));
        }
      }
    }

    value.slice(0, 3).forEach((item, index) => {
      walk(item, `${currentPath}[${index}]`, depth + 1);
    });

    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (
        /pal|character|instance|skill|level|talent|passive/i.test(key)
      ) {
        console.log(
          "MATCH:",
          `${currentPath}.${key}`,
          Array.isArray(child)
            ? `array(${child.length})`
            : typeof child,
        );
      }

      walk(child, `${currentPath}.${key}`, depth + 1);
    }
  }
}

console.log("Top-level keys:");
console.log(Object.keys(data));

walk(data);

console.log("\nDone.");