# Security Policy

Catón AI is designed to handle highly sensitive financial data, so security reports are taken
seriously and handled privately.

## Reporting a vulnerability

Please **do not open a public issue**. Report vulnerabilities privately through
[GitHub private vulnerability reporting](https://github.com/cesarzea/caton-ai/security/advisories/new).

Include, where possible:

- a description of the issue and its impact;
- steps to reproduce or a proof of concept;
- affected versions or commits.

You can expect an acknowledgement within **5 business days** and a status update at least every
**14 days** until the report is resolved. Coordinated disclosure is preferred: please allow a fix to
be released before publishing details.

## Supported versions

The project is in **pre-alpha**. Only the latest commit on `main` receives security fixes until a
first stable release defines a support policy.

## Scope

In scope: the code in this repository and the official plugins published from it.
Out of scope: third-party plugins, the services Catón AI connects to (banks, aggregators, LLM
providers) and vulnerabilities that require a compromised host.
