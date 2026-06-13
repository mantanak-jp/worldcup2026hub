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
    id: "source_contracts",
    label: "source candidate / registry contract validation",
    args: ["tools/validate_source_contracts.js"]
  },
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

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function atomicReplaceMany(writes) {
  const prepared = writes.map(({ relativePath, content }) => {
    const filePath = path.join(root, relativePath);
    const tempPath = `${filePath}.${process.pid}.tmp`;
    const backupPath = `${filePath}.${process.pid}.bak`;
    JSON.parse(content);
    fs.writeFileSync(tempPath, content, "utf8");
    return { relativePath, filePath, tempPath, backupPath };
  });

  try {
    for (const item of prepared) {
      fs.renameSync(item.filePath, item.backupPath);
    }
    for (const item of prepared) {
      fs.renameSync(item.tempPath, item.filePath);
    }
    for (const item of prepared) {
      removeIfExists(item.backupPath);
    }
  } catch (error) {
    for (const item of prepared) {
      if (fs.existsSync(item.backupPath)) {
        removeIfExists(item.filePath);
        fs.renameSync(item.backupPath, item.filePath);
      }
      removeIfExists(item.tempPath);
    }
    throw error;
  }
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

function failSummary(stage, result, reason, stages, mode = "check-only") {
  return {
    ok: false,
    mode,
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
  return stableStringify(JSON.parse(saved)) === stableStringify(JSON.parse(generatedOutput));
}

function compareDeterministicOutputs(firstOutput, secondOutput) {
  return {
    ok: firstOutput === secondOutput,
    reason: firstOutput === secondOutput ? "" : "generator output is nondeterministic"
  };
}

function resultFromErrors(errors) {
  return {
    status: errors.length === 0 ? 0 : 1,
    stdout: stableStringify({ validation_error_count: errors.length, errors }),
    stderr: ""
  };
}

function buildTentativeContext(context, patch) {
  const next = withContext(context, patch);
  next.matches = context.matches;
  next.teams = context.teams;
  next.articles = context.articles;
  next.extractions = context.extractions;
  next.sources = context.sources;
  next.sourceRegistry = context.sourceRegistry;
  next.matchMap = context.matchMap;
  next.teamMap = context.teamMap;
  next.articleMap = context.articleMap;
  next.extractionMap = context.extractionMap;
  next.sourceMap = context.sourceMap;
  next.sourceRegistryMap = context.sourceRegistryMap;
  next.matchIds = context.matchIds;
  next.claimIds = context.claimIds;
  return next;
}

function validateTentativeOutlines(context) {
  return validateOutlinesAgainstExpected(context);
}

function validateTentativeGeneratedReviews(context) {
  return validateGeneratedAgainstExpected(context);
}

function runPipeline(options = {}) {
  const write = Boolean(options.write);
  const mode = write ? "write" : "check-only";
  const simulateFailureStage = options.simulateFailureStage || "";
  const stages = [];
  const pendingWrites = new Map();
  let tentativeContext = buildContext();

  for (const stage of STAGES) {
    let first = runNode(stage.args);
    let generatedByMemory = false;
    let secondOutput = "";

    if (write && stage.id === "review_outlines" && pendingWrites.has("data/review_outlines.json")) {
      const errors = validateTentativeOutlines(tentativeContext);
      first = resultFromErrors(errors);
    }
    if (write && stage.id === "generated_review_generation" && pendingWrites.has("data/review_outlines.json")) {
      const firstOutput = stableStringify(buildGeneratedReviews(tentativeContext));
      secondOutput = stableStringify(buildGeneratedReviews(tentativeContext));
      first = { status: 0, stdout: firstOutput, stderr: "" };
      generatedByMemory = true;
    }
    if (write && stage.id === "generated_match_reviews" && pendingWrites.has("data/generated_match_reviews.json")) {
      const errors = validateTentativeGeneratedReviews(tentativeContext);
      first = resultFromErrors(errors);
    }

    if (first.status !== 0) {
      return failSummary(stage, first, "stage command failed", stages, mode);
    }

    const extra = {};
    if (stage.outputPath) {
      const second = generatedByMemory
        ? { status: 0, stdout: secondOutput, stderr: "" }
        : runNode(stage.args);
      if (second.status !== 0) {
        return failSummary(stage, second, "second deterministic run failed", stages, mode);
      }
      const deterministic = compareDeterministicOutputs(first.stdout, second.stdout);
      if (!deterministic.ok) {
        return failSummary(stage, first, deterministic.reason, stages, mode);
      }
      extra.deterministic_output = true;

      const parsedOutput = JSON.parse(first.stdout);
      if (write) {
        pendingWrites.set(stage.outputPath, first.stdout);
        extra.pending_write = stage.outputPath;
        if (stage.outputPath === "data/review_outlines.json") {
          tentativeContext = buildTentativeContext(tentativeContext, { outlines: parsedOutput });
        }
        if (stage.outputPath === "data/generated_match_reviews.json") {
          tentativeContext = buildTentativeContext(tentativeContext, { generatedReviews: parsedOutput });
        }
      } else if (!compareSavedOutput(stage, first.stdout)) {
        return failSummary(stage, first, `${stage.outputPath} does not match deterministic generator output`, stages, mode);
      } else {
        extra.matches_saved_output = true;
      }
    }

    stages.push(stageSummary(stage, first, extra));

    if (simulateFailureStage === stage.id) {
      return failSummary(stage, { status: 1, stdout: "", stderr: "" }, "simulated write-mode failure", stages, mode);
    }
  }

  if (write) {
    try {
      atomicReplaceMany([
        {
          relativePath: "data/review_outlines.json",
          content: pendingWrites.get("data/review_outlines.json")
        },
        {
          relativePath: "data/generated_match_reviews.json",
          content: pendingWrites.get("data/generated_match_reviews.json")
        }
      ]);
      for (const stage of stages) {
        if (stage.pending_write) {
          stage.wrote = stage.pending_write;
          delete stage.pending_write;
        }
      }
    } catch (error) {
      return failSummary(
        { id: "atomic_replace", label: "atomic replace", args: ["tools/run_local_level3_pipeline.js", "--write"] },
        { status: 1, stdout: "", stderr: error.message },
        "atomic replace failed",
        stages,
        mode
      );
    }
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
  const generatedOutput = stableStringify(buildGeneratedReviews(buildContext()));
  const matchingOutputComparison = compareDeterministicOutputs(generatedOutput, generatedOutput);
  const changedOutputComparison = compareDeterministicOutputs(generatedOutput, `${generatedOutput}x`);
  const beforeWriteFailure = {
    outlines: readText("data/review_outlines.json"),
    reviews: readText("data/generated_match_reviews.json")
  };
  const writeFailure = runPipeline({ write: true, simulateFailureStage: "generated_match_reviews" });
  const afterWriteFailure = {
    outlines: readText("data/review_outlines.json"),
    reviews: readText("data/generated_match_reviews.json")
  };

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
    }, validateGeneratedAgainstExpected),
    {
      name: "deterministic output comparison accepts matching outputs",
      passed: matchingOutputComparison.ok,
      detected: "matching outputs are accepted"
    },
    {
      name: "nondeterministic output comparison detects changed output",
      passed: !changedOutputComparison.ok && changedOutputComparison.reason === "generator output is nondeterministic",
      detected: changedOutputComparison.reason
    },
    {
      name: "write mode failure preserves review_outlines.json",
      passed: !writeFailure.ok && writeFailure.mode === "write" && beforeWriteFailure.outlines === afterWriteFailure.outlines,
      detected: writeFailure.reason || ""
    },
    {
      name: "write mode failure preserves generated_match_reviews.json",
      passed: !writeFailure.ok && writeFailure.mode === "write" && beforeWriteFailure.reviews === afterWriteFailure.reviews,
      detected: writeFailure.reason || ""
    },
    {
      name: "write mode failure prevents partial write",
      passed:
        !writeFailure.ok &&
        writeFailure.mode === "write" &&
        beforeWriteFailure.outlines === afterWriteFailure.outlines &&
        beforeWriteFailure.reviews === afterWriteFailure.reviews,
      detected: writeFailure.reason || ""
    }
  ];

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
