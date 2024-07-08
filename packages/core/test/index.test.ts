import { join } from "node:path";

import { createReader } from "@keystatic/core/reader";
import { describe, expect, it } from "vitest";

import { build } from "../src/index";
import keystaticConfig from "./fixtures/keystatic.config";

const basePath = join(import.meta.dirname, "fixtures");
const reader = createReader(basePath, keystaticConfig);

describe("build", () => {});
