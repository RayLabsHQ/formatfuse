# Color Converter Programmatic SEO Playbook

## Objectives
- Capture long-tail color conversion intents (format pairs + workflow modifiers) with fast, pre-rendered pages.
- Maintain a living keyword dataset that adapts to real search demand and emerging terminology.
- Use Search Console, analytics, and product telemetry to iteratively improve copy, metadata, and internal linking.

## Architecture Snapshot
- **Slug pattern**: `/convert/color/{from}-to-{to}/[modifier]/` with 210 base pairs × N intent modifiers.
- **Content engine**: Shared `ColorConversionPage` Astro component fed by format metadata and modifier-specific blocks.
- **Data sources**: `colorFormatMeta`, `colorIntentModifiers`, and `page-data` helpers for examples, defaults, FAQs.
- **Sitemap**: `/sitemap-colors.xml` lists both base and modifier URLs; regenerated on build.

## Feedback Loop Overview
1. **Collect** query and performance data weekly.
2. **Diagnose** gaps (low CTR, declining average position, high impressions but few clicks).
3. **Enrich** dataset (add/adjust modifiers, update value props, refine FAQs, link hubs).
4. **Deploy** changes through code/data updates, then rebuild for static pre-render.
5. **Monitor** impact over 2–4 weeks before iterating again.

## Data Inputs & Pipelines
- **Google Search Console**
  - Automated exports via Search Console API (Data Studio or BigQuery connector) filtered for `/convert/color/` URLs.
  - Capture metrics by `from`, `to`, and `modifier` via regex parsing of page path.
  - Dimensions: query, page, country, device; Metrics: impressions, clicks, CTR, average position.
- **Web Analytics (e.g., Plausible/PostHog)**
  - Custom properties on pageview: `color_from`, `color_to`, `modifier_slug`, `cta_click`.
  - Track engagement (scroll depth, time on page) and conversions (copy actions, palette exports) to identify high-intent keywords.
- **On-site Search / Tool Usage**
  - Capture inputs people paste into the converter (anonymized) to surface emerging color formats or industries.
  - Log internal quick-search queries that match “color” to find missing intents.
- **SERP & Competitor Research**
  - Quarterly scrape of top-ranking pages for target queries to benchmark schema usage, FAQs, and content depth.
  - Note new color model terminology (e.g., OKHSV, ICtCp) for potential expansion.

## Analysis Workflow
1. **Weekly data pull** (script or notebook) aggregates metrics into a dashboard (Looker Studio, Metabase, or Mode).
2. **Segment performance** by modifier and format pair:
   - Identify high impression × low CTR variants → improve title/meta, hero copy, FAQ richness.
   - Spot pages with declining position → review internal links, add schema, refresh content.
   - Surface zero-click queries → consider new modifiers or dedicated FAQ answers.
3. **Qualitative review** every two weeks:
   - Inspect top queries manually to ensure intent alignment.
   - Review SERP features (People Also Ask, rich results) to prioritize schema updates.
4. **Change log** maintained in doc or Notion (date, modifier, change type, hypothesis, owner).

## Enrichment Playbook
- **Modifier tuning**: Add/remove modifiers in `colorIntentModifiers` with hypothesis-backed content (value props, use cases, FAQ pairs).
- **Copy refresh**: Update `ModifierContent` fields for low-CTR pages; ensure hero taglines and CTA address search intent.
- **Internal linking**:
  - Expand related-links logic when new modifiers launch.
  - Create hub pages for high-volume `from` or `modifier` clusters (e.g., `/convert/color/print-ready/`).
- **Schema enhancements**: Add scenario-specific HowTo steps, FAQ entries, and speakable markup for voice queries where relevant.
- **Visual assets**: Embed conversion tables or palettes derived from actual user input trends to differentiate pages.

## Tooling & Automation
- **Scripts**: Node/TypeScript job to pull Search Console data, map to `from/to/modifier`, and export CSV/JSON into `tmp/seo-insights/`.
- **Notebooks**: Jupyter or Observable notebooks for ad-hoc analysis and visualizations (CTR vs. position, modifier leaderboards).
- **CI checks**: Optional lint step validating that new modifiers include required fields and unique slugs.
- **Dashboards**: Central view with filters for modifier, country, and device to prioritize updates.

## Cadence & Owners
- **Weekly**: Data pull + quick review (SEO analyst).
- **Bi-weekly**: Prioritize top 3 experiments (SEO + product marketing).
- **Monthly**: Ship modifier/content updates, regenerate sitemap (Developer/Content).
- **Quarterly**: Audit architecture, schema, and performance budgets; consider new color formats or deprecations.

## Success Metrics
- CTR improvement for target modifiers vs. baseline.
- Growth in clicks and impressions for long-tail queries mentioning workflow terms (e.g., “hex to lab print ready”).
- Engagement lift (time on page, conversions) for updated pages.
- Percentage of pages with valid FAQ/HowTo rich results.

## Action Backlog Template
| Priority | Theme | Description | Owner | Status |
| --- | --- | --- | --- | --- |
| P1 | Modifier expansion | Add `video-colorists` modifier (Queries: “oklch to rec2020 video”) | SEO | Todo |
| P1 | Copy optimization | Refresh title/meta for `/convert/color/rgb-to-oklab/css-developers/` (CTR 0.8%) | Content | Todo |
| P2 | Internal links | Build `/convert/color/oklab/` hub aggregating all outgoing conversions | Dev | In Review |
| P3 | Schema QA | Validate FAQ coverage for wide-gamut modifiers in Rich Results Test | SEO | Planned |

## Storage & Workflow
- **Documents**: Store this playbook and weekly reports in `docs/` (version-controlled) and sync key highlights to Notion for non-technical stakeholders.
- **Data exports**: Commit sanitized CSVs (if small) or keep in shared warehouse/BI tool; reference snapshot dates in pull requests.
- **Pull requests**: Link to analysis findings in the PR description when modifying modifier data or templates.
- **Retrospectives**: Quarterly summary doc capturing wins, misses, and roadmap adjustments.

## Next Steps
1. Automate Search Console export grouped by `from/to/modifier` and push into analytics dashboard.
2. Populate modifier backlog with top opportunities (use `Action Backlog Template`).
3. Schedule first bi-weekly review to align SEO, content, and engineering on upcoming experiments.
