# AI Test Generator Pseudocode

This pseudocode encodes the generator flow reviewed for the HW06 EShop API-testing process. The student remains responsible for the design decision and the required self-drawn diagram; the repository version documents the implemented workflow.

```text
function GENERATE_API_TEST_SUITE(apiSpecification, srs, reviewedKnowledge):
    requirements = EXTRACT_REQUIREMENTS(apiSpecification, srs, reviewedKnowledge)
    parameters = ANALYZE_PARAMETERS_AND_CONSTRAINTS(requirements)

    techniques = PLAN_TECHNIQUES(
        equivalencePartitions(parameters),
        boundaryValues(parameters),
        applicableStateTransitions(requirements),
        applicableSecurityChecks(requirements),
        responseSchemaContracts(apiSpecification)
    )

    repeat:
        candidates = AI_GENERATE_TESTCASES(requirements, parameters, techniques, reviewedKnowledge)
        ruleFindings = RULE_VALIDATE(candidates, requirements, apiSpecification)
        auditedCases = HUMAN_AUDIT(candidates, ruleFindings)

        for each testcase in auditedCases:
            if testcase.audit is INVALID or INCOMPLETE:
                reviewedKnowledge.add(testcase.reviewNotes)
                candidates.remove(testcase)
                request corrected replacement from AI
    until every retained testcase.audit is VALID

    postmanCollections = GENERATE_POSTMAN_COLLECTIONS(auditedCases)
    dataFiles = GENERATE_DATA_FILES(auditedCases)
    fixtures = BUILD_FIXTURE_DEFINITIONS(auditedCases, seedData)

    for each executableGroup in groupByFixture(auditedCases):
        originalState = SNAPSHOT_DATABASE()
        try:
            APPLY_FIXTURE(fixtures[executableGroup])
            result = RUN_NEWMAN(postmanCollections, dataFiles, executableGroup)
            triage = TRIAGE_RESULT(result)

            if triage is AUTOMATION_OR_SETUP_DEFECT:
                FIX_AUTOMATION_OR_FIXTURE(triage)
                rerun executableGroup
            else if triage is SUT_DEFECT:
                CREATE_BUG_REPORT(triage, result.evidence)
            else:
                RECORD_PASS(result.evidence)
        finally:
            RESTORE_DATABASE(originalState)

    traceability = LINK(
        requirement -> testcase -> iteration -> actualResult -> bugId -> evidence
    )
    EXPORT_EXCEL_SUMMARY(traceability)
    EXPORT_HTML_AND_PDF_REPORTS(traceability)
    PUBLISH_CI_RESULTS(traceability)
    FEED_COVERAGE_GAPS_BACK_TO_TECHNIQUE_PLANNER(traceability)

    return traceability
```

## Required Invariants

- Requirement and API specification remain the oracle; backend implementation is only the observed SUT.
- `Audit` evaluates testcase design, while `Execution Status` evaluates a run.
- Every request carries `X-Student-Id: 23127522`.
- A fixture-dependent case cannot be marked PASS before controlled state exists.
- Database seed and deterministic IDs are restored after prepared execution.
- Screenshots, Newman output, CI runs and GitHub Issues must come from real execution.
