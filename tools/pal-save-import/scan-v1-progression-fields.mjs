import fs from "node:fs";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const levelPath =
  `${base}\\level.json`;

if (
  !fs.existsSync(
    levelPath,
  )
) {
  throw new Error(
    `Missing level.json: ${levelPath}`,
  );
}

const data =
  JSON.parse(
    fs.readFileSync(
      levelPath,
      "utf8",
    ),
  );

const patterns = [
  /awaken/i,
  /mutation/i,
  /mutate/i,
  /friend/i,
  /trust/i,
  /partner/i,
  /soul/i,
  /rank/i,
  /statuspoint/i,
  /talent/i,
  /work.*suit/i,
  /condens/i,
  /enhance/i,
];

const hits =
  new Map();

function walk(
  value,
  path = "root",
) {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (
    Array.isArray(value)
  ) {
    value.forEach(
      (
        entry,
        index,
      ) => {
        walk(
          entry,
          `${path}[${index}]`,
        );
      },
    );

    return;
  }

  if (
    typeof value !==
    "object"
  ) {
    return;
  }

  for (
    const [
      key,
      child,
    ]
    of Object.entries(
      value,
    )
  ) {
    if (
      patterns.some(
        (pattern) =>
          pattern.test(
            key,
          ),
      )
    ) {
      const existing =
        hits.get(
          key,
        ) ?? {
          count: 0,
          samplePaths: [],
        };

      existing.count++;

      if (
        existing.samplePaths
          .length < 5
      ) {
        existing.samplePaths.push(
          `${path}.${key}`,
        );
      }

      hits.set(
        key,
        existing,
      );
    }

    walk(
      child,
      `${path}.${key}`,
    );
  }
}

walk(data);

const fields =
  [
    ...hits.entries(),
  ]
    .sort(
      (a, b) =>
        a[0].localeCompare(
          b[0],
        ),
    )
    .map(
      (
        [
          field,
          info,
        ],
      ) => ({
        field,

        count:
          info.count,

        samplePaths:
          info.samplePaths,
      }),
    );

const output = {
  generatedAt:
    new Date()
      .toISOString(),

  totalUniqueFields:
    fields.length,

  fields,
};

const outputPath =
  `${base}\\v1-progression-fields.json`;

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    output,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n=== PALWORLD 1.0 PROGRESSION FIELD DISCOVERY ===\n",
);

console.table(
  fields.map(
    (entry) => ({
      field:
        entry.field,

      count:
        entry.count,
    }),
  ),
);

console.log(
  `\nFound ${fields.length} unique progression-related fields.`,
);

console.log(
  `Saved to: ${outputPath}`,
);