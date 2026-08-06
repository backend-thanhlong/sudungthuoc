import { AI_EVAL_QUESTIONS, type AIEvalQuestion } from "../src/lib/ai/eval/questions";
import { buildSafeDatabaseTemplatePlan } from "../src/lib/ai/safe-database-intelligence";
import { validateSafeDatabaseSql } from "../src/lib/ai/safe-database";
import { routeAIDomain } from "../src/lib/ai/domain-router";
import { verifySafeDatabaseQuery } from "../src/lib/ai/query-verifier";
import type { AIAgentRequest } from "../src/lib/ai/types";

interface EvalFailure {
    id: string;
    question: string;
    failures: string[];
}

function hasAllViews(actualViews: string[], expectedViews: string[]) {
    return expectedViews.every(view => actualViews.includes(view));
}

function hasNoForbiddenViews(actualViews: string[], forbiddenViews: string[]) {
    return forbiddenViews.every(view => !actualViews.includes(view));
}

function buildRequest(question: AIEvalQuestion): AIAgentRequest {
    return {
        mode: "chat",
        message: question.question,
    };
}

function evaluateQuestion(question: AIEvalQuestion): EvalFailure | null {
    const request = buildRequest(question);
    const routing = routeAIDomain(question.question);
    const failures: string[] = [];

    if (question.expectedDomain && routing.primaryDomain !== question.expectedDomain) {
        failures.push(`domain expected=${question.expectedDomain} actual=${routing.primaryDomain || "null"}`);
    }
    if (question.expectedAmbiguity && routing.ambiguity !== question.expectedAmbiguity) {
        failures.push(`ambiguity expected=${question.expectedAmbiguity} actual=${routing.ambiguity}`);
    }

    if (question.expectedAmbiguity === "high") {
        return failures.length > 0
            ? { id: question.id, question: question.question, failures }
            : null;
    }

    const plan = buildSafeDatabaseTemplatePlan(request, undefined, routing);
    const plannedQueries = question.expectedTemplate
        ? plan.filter(query => query.templateName === question.expectedTemplate)
        : plan;

    if (question.expectedTemplate && plannedQueries.length === 0) {
        failures.push(`template missing=${question.expectedTemplate} actual=${plan.map(query => query.templateName).join(",") || "none"}`);
    }

    const referencedViews: string[] = [];
    for (const plannedQuery of plannedQueries) {
        try {
            const preview = validateSafeDatabaseSql(plannedQuery.sql);
            const verification = verifySafeDatabaseQuery(preview, {
                question: question.question,
                routing,
                source: "template",
                plannedQuery,
            });
            if (verification.status !== "passed") {
                failures.push(`verifier rejected ${plannedQuery.templateName}: ${verification.code || verification.reason || "unknown"}`);
            }
            referencedViews.push(...preview.referencedViews);
        } catch (error) {
            failures.push(`sql invalid ${plannedQuery.templateName}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const uniqueViews = [...new Set(referencedViews)];
    if (!hasAllViews(uniqueViews, question.requiredViews)) {
        failures.push(`required views missing expected=${question.requiredViews.join(",")} actual=${uniqueViews.join(",") || "none"}`);
    }
    if (!hasNoForbiddenViews(uniqueViews, question.forbiddenViews || [])) {
        failures.push(`forbidden views used forbidden=${(question.forbiddenViews || []).join(",")} actual=${uniqueViews.join(",")}`);
    }

    return failures.length > 0
        ? { id: question.id, question: question.question, failures }
        : null;
}

function main() {
    const failures = AI_EVAL_QUESTIONS
        .map(evaluateQuestion)
        .filter((failure): failure is EvalFailure => Boolean(failure));

    const passed = AI_EVAL_QUESTIONS.length - failures.length;
    console.log(`AI eval: ${passed}/${AI_EVAL_QUESTIONS.length} passed`);

    for (const failure of failures) {
        console.log(`FAIL ${failure.id}: ${failure.question}`);
        for (const detail of failure.failures) {
            console.log(`  - ${detail}`);
        }
    }

    if (failures.length > 0) {
        process.exitCode = 1;
    }
}

main();
