import fs from "node:fs";

const path =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import\\level.json";

const data = JSON.parse(
  fs.readFileSync(path, "utf8"),
);

const results = [];

function walk(
  value,
  currentPath = "root",
) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(
      (entry, index) =>
        walk(
          entry,
          `${currentPath}[${index}]`,
        ),
    );

    return;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "StatusPoint",
    )
  ) {
    const raw =
      value?.StatusPoint?.value;

    if (
      typeof raw === "number" &&
      raw !== 0
    ) {
      results.push({
        path: currentPath,

        statusName:
          value?.StatusName?.value ??
          null,

        statusPoint:
          raw,
      });
    }
  }

  for (
    const [key, child]
    of Object.entries(value)
  ) {
    walk(
      child,
      `${currentPath}.${key}`,
    );
  }
}

walk(data);

console.log(
  JSON.stringify(
    results,
    null,
    2,
  ),
);

console.log(
  `\nFound ${results.length} non-zero StatusPoint entries.`,
);
