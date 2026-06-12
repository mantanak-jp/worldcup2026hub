# Site Concept

WorldCup2026Hub is an automated multilingual match review generation platform for the 2026 FIFA World Cup.

The completed site assumes automatic collection, automatic generation, and automatic publishing as normal operation.

The value of the site is not a match list or a collection of links. Its value is original Japanese match reviews generated from multiple languages, multiple source categories, and multiple viewpoints.

## Completed Site Vision

For each match, WorldCup2026Hub should collect and organize:

- Domestic and international tactical analysis
- Detailed match reports
- Official information
- Statistics and event data
- Manager comments
- Player comments
- Previews and long-form analysis
- Video-analysis metadata when allowed

The site should then generate an original Japanese review that explains match flow, tactical shapes, key adjustments, turning points, major player performances, source consensus, and source disagreement.

## Pages Versus Pipeline

GitHub Pages is the presentation layer. The core product is the pipeline that collects sources, extracts metadata, links articles to matches and teams, detects language, classifies source type, generates review versions, and publishes updated pages.

## Auto Publication

The platform is designed for automatic publication. Human review should not be required for every generated review during tournament operation.

Once approved source registries, workflows, generators, and publishing paths are merged, routine tournament-operation runs may publish generated reviews and site updates automatically.

The UI must make quality visible by displaying:

- Source coverage
- Confidence
- Generation version
- Generated time
- Review status
- Source list and source categories

Low-confidence or insufficient-source reviews may still be visible if their status is clear.
