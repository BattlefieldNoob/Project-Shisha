# GitHub Actions CI/CD Workflows

## Structure

```
.github/workflows/
├── reusable/              # Reusable workflow components
│   ├── test.yml        # Run tests
│   ├── build.yml      # Build application
│   ├── lint.yml      # Lint TypeScript
│   └── docker-build.yml    # Build and push Docker
├── app-ci.yml         # Main reusable CI workflow
├── fuel-advisor-bot-ci.yml  # App-specific CI
├── tablo-crawler-ci.yml     # App-specific CI
└── docker-publish.yml  # Manual Docker publish
```

## Features

- **Dependency caching**: Bun modules cached with `actions/cache@v4`
- **Docker layer caching**: GitHub Actions cache for Docker builds
- **Parallel execution**: Lint, test, and build run in parallel
- **Docker platform**: linux/arm64 only