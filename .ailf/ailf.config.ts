/**
 * .ailf/ailf.config.ts — AI Literacy Framework project configuration.
 *
 * This file configures how the AILF evaluation pipeline runs in this
 * repository. Place it at .ailf/ailf.config.ts in your project root.
 *
 * Evaluations are submitted to the AILF API (ailf-api.sanity.build).
 * The API handles LLM calls, doc fetching, grading, and report
 * publishing. Your repo only needs one secret: AILF_API_KEY.
 *
 * Docs: https://github.com/sanity-labs/ai-literacy-framework
 */

import { defineRepoConfig } from "@sanity/ailf"

export default defineRepoConfig({
  /**
   * Documentation source — which docs are being evaluated.
   *
   * "production" references the registered source for Sanity's own docs
   * (https://www.sanity.io/docs — project 3do82whm, dataset next). For
   * most users this is the right value. Registered names: "production",
   * "branch", "local".
   *
   * Evaluating a different docs site? Replace the string with an inline
   * block:
   *
   *   source: {
   *     projectId: "yourProjectId", // find yours at sanity.io/manage
   *     dataset: "production", // the dataset to query
   *     baseUrl: "https://docs.example.com", // public docs URL (agentic mode)
   *   },
   *
   * Heads up: inline values the source registry can't account for are
   * recorded as source.name "env-override" in run provenance, and the
   * run is classified `experimental` — excluded from default (trusted)
   * report views per D0059. Prefer a registered name whenever one
   * matches your docs.
   */
  source: {
    // No Sanity project yet: the docs are a static Astro site, so only
    // the agentic variant can ground runs today (EDEX-1869 changes that).
    baseUrl: "https://www.portabletext.org",
  },

  // Run attribution — who owns these evaluations (optional).
  //
  // `team` is your R&D team slug (see KNOWN_OWNER_TEAMS in
  // @sanity/ailf-shared); `individual` should be your @sanity.io email so
  // runs resolve to a Sanity user in the Dashboard. Uncomment to set, or
  // let `ailf init` fill these in via --team / --individual or its prompts.
  owner: {
    individual: "christian.groengaard@sanity.io",
  },

  /**
   * Task source — which tasks a local `ailf run` evaluates.
   *
   * "repo" evaluates the tasks you author in .ailf/tasks/ (this repo);
   * omit it (or use "content-lake") to fall back to the framework's
   * bundled example corpus. `ailf run --remote` always evaluates
   * .ailf/tasks/ regardless of this setting.
   */
  taskSource: { type: "repo" },

  /**
   * Trigger configuration — when evaluations run automatically.
   *
   * Each key is a trigger context. The pipeline checks which trigger
   * matches the current execution context (PR, merge, schedule, etc.)
   * and applies its settings.
   *
   * Mode options:
   *   "validate-only" — check that task files parse correctly (fast, no LLM calls)
   *   "eval"          — run the full evaluation pipeline
   */
  triggers: {
    /** On pull requests: just validate task files parse correctly. */
    pr: {
      mode: "validate-only",
    },

    /** When .ailf/ files change in a PR: run a real evaluation. */
    "pr-task-change": {
      mode: "eval",
      paths: [".ailf/**"],
    },

    /** On merge to main: run evaluation (non-blocking). */
    main: {
      mode: "eval",
      blocking: false,
      notify: true,
    },
  },
})
