# Security scanning

This repository uses two complementary security checks.

## GitHub CodeQL

`.github/workflows/codeql.yml` analyzes JavaScript/TypeScript and GitHub Actions workflows with the `security-extended` query suite. It runs on pushes and pull requests targeting `main`, every Monday at 03:17 UTC, and by manual dispatch.

Results appear under **Security and quality → Code scanning**. Workflow execution details appear under **Actions → CodeQL**.

This is an advanced CodeQL setup. If CodeQL default setup is already enabled in the repository settings, disable default setup before merging this workflow so the same code is not analyzed twice.

## Codex Security

For a local repository-wide scan, use the Codex Security plugin in the Codex desktop app and ask:

> Run a Codex Security scan on this repository.

The local workbench shows scans, findings, coverage, and remediation. A completed scan also produces `report.md`, `scan-manifest.json`, `findings.json`, `coverage.json`, and a SARIF export in its scan output directory.

`.github/workflows/codex-security.yml` performs an exact diff scan for trusted, same-repository pull requests. It intentionally excludes fork pull requests and Dependabot because the scan needs an API credential. To enable it:

1. Confirm that the account has Codex Security access.
2. Add an Actions repository secret named `CODEX_SECURITY_API_KEY`.
3. Open or update a pull request from a branch in this repository.

If the secret is absent, the job records a notice and exits successfully without installing or running the scanner. Scan artifacts are retained for seven days. SARIF findings appear beside CodeQL results under **Security and quality → Code scanning**, with the `codex-security` analysis category.

The CI scanner version and its transitive dependency integrity values are fixed in
`.github/codex-security/package-lock.json`. The workflow installs this trusted
configuration from the pull request base revision into the runner temporary
directory before checking out and scanning the proposed head revision.

For a private or internal repository, GitHub Code Security must be enabled before SARIF can be uploaded. If the GitHub plan, Codex Security access, or repository permission is unavailable, keep using the local Codex Security plugin and its generated report; leave the CI secret unset so pull requests are not blocked.
