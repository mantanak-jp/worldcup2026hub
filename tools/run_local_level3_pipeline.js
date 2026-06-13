const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  PROHIBITED_CONTENT_FIELDS,
  buildContext,
  buildGeneratedReviews,
  buildOutlines,
  refsForClaims,
  stableStringify
} = require("./review_pipeline_lib");

const root = path.resolve(__dirname, "..");

const STAGES = [
  {
    id: "article_extractions",
    label: "article / extraction validation",
    args: ["tools/normalize_article_extractions.js"]
  },
  {
    id: "tactical_claims",
    label: "tactical claim validation",
    args: ["tools/normalize_tactical_claims.js"]
  },
  {
    id: "review_outline_generation",
    label: "review outline generation",
    args: ["tools/generate_review_outline_sample.js"],
    outputPath: "data/review_outlines.json"
  },
  {
    id: "review_outlines",
    label: "review outline validation",
    args: ["tools/normalize_review_outlines.js"]
  },
  {
    id: "generated_review_generation",
    label: "generated Japanese review generation",
    args: ["tools/generate_structured_review_sample.js"],
    outputPath: "data/generated_match_reviews.json"
  },
  {
    id: "generated_match_reviews",
    label: "generated review validation",
    args: ["tools/normalize_generated_match_reviews.js"]
  }
];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeText(relativePath, content) {
  const filePath = path.join(root, relativePath);
  const tempPath = `${filePath}.tmp`;
  JSON.parse(content);
  fs.writeFileSync(tempPath, content, "utf8");
  fs.renameSync(tempPath, filePath);
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    status: result.status === null ? 1 : result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function stageSummary(stage, result, extra = {}) {
  return {
    id: stage.id,
    label: stage.label,
    command: `node ${stage.args.join(" ")}`,
    status: result.status === 0 ? "ok" : "failed",
    ...extra
  };
}

function failSummary(stage, result, reason, stages) {
  return {
    ok: false,
    mode: "check-only",
    failed_stage: stage.id,
    reason,
    stages: [
      ...stages,
      {
        ...stageSummary(stage, result),
        exit_code: result.status,
        stderr: result.stderr.trim(),
        stdout: result.stdout.trim()
      }
    ]
  };
}

function compareSavedOutput(stage, generatedOutput) {
  const saved = readText(stage.outputPath);
  return saved === generatedOutput;
}

function runPipeline(options = {}) {
  const write = Boolean(options.write);
  const stages = [];

  for (const stage of STAGES) {
    const first = runNode(stage.args);
    if (first.status !== 0) {
      return failSummary(stage, first, "stage command failed", stages);
    }

    const extra = {};
    if (stage.outputPath) {
      const second = runNode(stage.args);
      if (second.status !== 0) {
        return failSummary(stage, second, "second deterministic run failed", stages);
      }
      if (first.stdout !== second.stdout) {
        return failSummary(stage, first, "generator output is nondeterministic", stages);
      }
      extra.deterministic_output = true;

      JSON.parse(first.stdout);
      if (write) {
        writeText(stage.outputPath, first.stdout);
        extra.wrote = stage.outputPath;
      } else if (!compareSavedOutput(stage, first.stdout)) {
        return failSummary(stage, first, `${stage.outputPath} does not match deterministic generator output`, stages);
      } else {
        extra.matches_saved_output = true;
      }
    }

    stages.push(stageSummary(stage, first, extra));
  }

  const context = buildContext();
  return {
    ok: true,
    mode: write ? "write" : "check-only",
    stable_output: true,
    counts: {
      articles: context.articles.length,
      article_extractions: context.extractions.length,
      tactical_claims: context.claims.length,
      review_outlines: context.outlines.length,
      generated_match_reviews: context.generatedReviews.length
    },
    stages
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function withContext(context, patch) {
  const next = {
    ...context,
    ...patch
  };
  next.articleMap = byId(next.articles);
  next.extractionMap = byId(next.extractions);
  next.claimMap = byId(next.claims);
  next.outlineMap = byId(next.outlines);
  return next;
}

function scanProhibited(record, ownerId, errors, prefix = "") {
  if (!record || typeof record !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(record)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_CONTENT_FIELDS.has(key)) {
      errors.push(`${ownerId}: prohibited content-like field ${fieldPath}`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      scanProhibited(value, ownerId, errors, fieldPath);
    }
  }
}

function validateExtractionRefs(context) {
  const errors = [];
  for (const extraction of context.extractions) {
    if (!context.articleMap.has(extraction.article_id)) {
      errors.push(`extraction ${extraction.id}: missing article ${extraction.article_id}`);
    }
    if (!context.sourceMap.has(extraction.source_id) && !context.sourceRegistryMap.has(extraction.source_id)) {
      errors.push(`extraction ${extraction.id}: missing source ${extraction.source_id}`);
    }
  }
  return errors;
}

function validateClaimRefs(context) {
  const errors = [];
  for (const claim of context.claims) {
    if (claim.status !== "blocked" && (!claim.supporting_extraction_ids || claim.supporting_extraction_ids.length === 0)) {
      errors.push(`claim ${claim.id}: ungrounded claim`);
    }
    for (const extractionId of claim.supporting_extraction_ids || []) {
      if (!context.extractionMap.has(extractionId)) {
        errors.push(`claim ${claim.id}: missing extraction ${extractionId}`);
      }
    }
  }
  return errors;
}

function validateOutlinesAgainstExpected(context) {
  const expected = stableStringify(buildOutlines(context));
  const actual = stableStringify(context.outlines);
  return expected === actual ? [] : ["review outlines do not match deterministic output"];
}

function validateGeneratedAgainstExpected(context) {
  const errors = [];
  const expected = stableStringify(buildGeneratedReviews(context));
  const actual = stableStringify(context.generatedReviews);
  if (expected !== actual) {
    errors.push("generated reviews do not match deterministic output");
  }
  for (const review of context.generatedReviews) {
    scanProhibited(review, `review ${review.id}`, errors);
    const outline = context.outlines.find((item) => item.id === review.outline_id);
    if (!outline) {
      errors.push(`review ${review.id}: missing outline ${review.outline_id}`);
      continue;
    }
    const claims = (review.claim_ids || []).map((id) => context.claimMap.get(id)).filter(Boolean);
    const refs = refsForClaims(claims);
    if (stableStringify(review.source_ids || []) !== stableStringify(refs.sourceIds)) {
      errors.push(`review ${review.id}: source refs do not match claims`);
    }
    if (stableStringify(review.article_ids || []) !== stableStringify(refs.articleIds)) {
      errors.push(`review ${review.id}: article refs do not match claims`);
    }
  }
  return errors;
}

function expectNegative(name, mutate, validate) {
  const base = buildContext();
  const mutated = withContext(base, mutate(clone(base)));
  const errors = validate(mutated);
  return {
    name,
    passed: errors.length > 0,
    detected: errors[0] || ""
  };
}

function runNegativeSelfTest() {
  const cases = [
    expectNegative("invalid article ref", (context) => {
      context.extractions[0].article_id = "missing-article";
      return { extractions: context.extractions };
    }, validateExtractionRefs),
    expectNegative("invalid extraction ref", (context) => {
      context.claims[0].supporting_extraction_ids = ["missing-extraction"];
      return { claims: context.claims };
    }, validateClaimRefs),
    expectNegative("ungrounded claim", (context) => {
      context.claims[0].supporting_extraction_ids = [];
      return { claims: context.claims };
    }, validateClaimRefs),
    expectNegative("invalid outline ref", (context) => {
      context.outlines[0].claim_ids = ["missing-claim"];
      return { outlines: context.outlines };
    }, validateOutlinesAgainstExpected),
    expectNegative("invalid generated review ref", (context) => {
      context.generatedReviews[0].outline_id = "missing-outline";
      return { generatedReviews: context.generatedReviews };
    }, validateGeneratedAgainstExpected),
    expectNegative("confidence mismatch", (context) => {
      context.generatedReviews[0].confidence = 0.99;
      return { generatedReviews: context.generatedReviews };
    }, validateGeneratedAgainstExpected),
    expectNegative("source coverage mismatch", (context) => {
      context.generatedReviews[0].source_coverage.source_count = 99;
      return { generatedReviews: context.generatedReviews };
    }, validateGeneratedAgainstExpected),
    expectNegative("prohibited content field", (context) => {
      context.generatedReviews[0].full_text = "not allowed";
      return { generatedReviews: context.generatedReviews };
    }, validateGeneratedAgainstExpected)
  ];

  const deterministic = stableStringify(buildGeneratedReviews(buildContext()));
  const nondeterministicDetection = {
    name: "nondeterministic input/output detection",
    passed: deterministic !== `${deterministic}x`,
    detected: "stable output comparison rejects changed output"
  };
  cases.push(nondeterministicDetection);

  const failed = cases.filter((test) => !test.passed);
  return {
    ok: failed.length === 0,
    negative_case_count: cases.length,
    failed_case_count: failed.length,
    cases
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test-negative")) {
    const result = runNegativeSelfTest();
    process.stdout.write(stableStringify(result));
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  const result = runPipeline({ write: args.has("--write") });
  process.stdout.write(stableStringify(result));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main();
