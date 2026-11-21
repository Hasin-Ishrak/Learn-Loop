import base from "../../eslint.config.mjs";

export default [
  ...base,
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*", "fs", "path"],
              message:
                "@learnloop/shared must stay environment-agnostic: no Node-only modules.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "No browser globals in shared." },
        { name: "document", message: "No browser globals in shared." },
        { name: "process", message: "No Node globals in shared." },
      ],
    },
  },
];
