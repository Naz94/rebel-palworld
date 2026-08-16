import fs from "node:fs";
import path from "node:path";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const dataDir =
  `${base}\\data`;

const sources = [
  {
    name:
      "pals_work_suitability.json",

    url:
      "https://raw.githubusercontent.com/MagitekZed/palworld-helper/main/data/pals_work_suitability.json",

    validate(json) {
      return (
        Array.isArray(
          json.pals,
        ) &&
        json.pals.length >=
          250
      );
    },

    count(json) {
      return (
        json.pals?.length ??
        0
      );
    },
  },

  {
    name:
      "pals_combat_stats.json",

    url:
      "https://raw.githubusercontent.com/MagitekZed/palworld-helper/main/data/pals_combat_stats.json",

    validate(json) {
      return (
        Array.isArray(
          json.pals,
        ) &&
        json.pals.length >=
          250
      );
    },

    count(json) {
      return (
        json.pals?.length ??
        0
      );
    },
  },

  {
    name:
      "pals_partner_skills.json",

    url:
      "https://raw.githubusercontent.com/MagitekZed/palworld-helper/main/data/pals_partner_skills.json",

    validate(json) {
      return (
        json.pals &&
        typeof json.pals ===
          "object" &&
        !Array.isArray(
          json.pals,
        ) &&
        Object.keys(
          json.pals,
        ).length >=
          250
      );
    },

    count(json) {
      return Object.keys(
        json.pals ??
          {},
      ).length;
    },
  },
];

const timestamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      "-",
    );

const backupDir =
  path.join(
    dataDir,
    `backup-${timestamp}`,
  );

fs.mkdirSync(
  backupDir,
  {
    recursive: true,
  },
);

async function fetchJson(
  url,
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            "rebel-palworld-reference-refresh",
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} for ${url}`,
    );
  }

  const text =
    await response.text();

  let json;

  try {
    json =
      JSON.parse(
        text,
      );
  } catch (error) {
    throw new Error(
      `Invalid JSON from ${url}: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }

  return {
    text,
    json,
  };
}

console.log(
  "\n=== REBEL REFERENCE REFRESH ===\n",
);

for (
  const source
  of sources
) {
  const destination =
    path.join(
      dataDir,
      source.name,
    );

  if (
    fs.existsSync(
      destination,
    )
  ) {
    fs.copyFileSync(
      destination,
      path.join(
        backupDir,
        source.name,
      ),
    );
  }

  console.log(
    `Fetching ${source.name}...`,
  );

  const {
    text,
    json,
  } =
    await fetchJson(
      source.url,
    );

  if (
    !source.validate(
      json,
    )
  ) {
    throw new Error(
      `${source.name} failed sanity check`,
    );
  }

  fs.writeFileSync(
    destination,
    text,
    "utf8",
  );

  console.log(
    `Updated ${source.name}: ${source.count(
      json,
    )} entries`,
  );

  if (json.meta) {
    console.log(
      "  meta:",
      json.meta,
    );
  }

  console.log("");
}

console.log(
  `Backups saved to: ${backupDir}`,
);

console.log(
  "\nReference refresh complete.",
);

console.log(
  "Source metadata was preserved exactly as supplied upstream.",
);