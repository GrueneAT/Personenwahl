import {
  createEffect,
  createMemo,
  createSignal,
  lazy,
  on,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { FileImport } from './import/FileImport';
import { applyMapping } from './import/parse-csv';
import type { ColumnMapping, ParsedTable } from './import/parse-csv';
import { QuotaEditor } from './quotas/QuotaEditor';
import type { CategoryQuota, QuotaConfig } from './quotas/model';
import { validateQuotas } from './quotas/model';
import type { SeatAllocationOverride } from './quotas/seat-allocation';
import { RunPanel } from './run/RunPanel';
import { Stage1Panel } from './stage1/Stage1Panel';
import type { Pool, Quotas as EngineQuotas } from '@sortition/engine-contract';

// Docs-Hub is the only docs entry point exposed at the App-level. Every docs
// subpage is loaded lazily from inside DocsHub itself, so the docs route only
// pulls its bundle when the user actually navigates to the Dokumentation tab.
const DocsHub = lazy(() => import('./docs/DocsHub'));
// Overview lives on its own lazy chunk so the default Stage-3 landing does
// not pay for its bytes. Reached only via #/overview (the toolnav "Übersicht").
const Overview = lazy(() => import('./Overview'));

interface ImportedPool {
  parsed: ParsedTable;
  mapping: ColumnMapping;
  rows: Record<string, string>[];
}

function toEnginePool(rows: Record<string, string>[]): Pool {
  return {
    id: 'imported',
    people: rows.map((r) => ({ ...r, person_id: r['person_id'] ?? '' })),
  };
}

function toEngineQuotas(cfg: QuotaConfig): EngineQuotas {
  return {
    panel_size: cfg.panel_size,
    categories: cfg.categories.map((c: CategoryQuota) => ({
      column: c.column,
      bounds: c.bounds,
    })),
  };
}

type AppMode = 'overview' | 'stage1' | 'stage3' | 'docs';

// Allowed docs routes. The docs hub itself is route 'hub'; every other value
// corresponds to a subpage component lazy-loaded by DocsHub.
export type DocsRoute =
  | 'hub'
  | 'algorithmus'
  | 'technik'
  | 'verifikation'
  | 'glossar'
  | 'limitationen'
  | 'beispiele'
  | 'use-cases'
  | 'override';

const DOCS_ROUTES: ReadonlySet<DocsRoute> = new Set<DocsRoute>([
  'hub',
  'algorithmus',
  'technik',
  'verifikation',
  'glossar',
  'limitationen',
  'beispiele',
  'use-cases',
  'override',
]);

interface ParsedHash {
  mode: AppMode;
  docsRoute: DocsRoute;
}

/**
 * Parse a URL hash into a (mode, docsRoute) pair. Unknown hashes fall back to
 * the default landing tab (stage3) without crashing — silently ignoring stray
 * fragments such as `#some-anchor` or `#/foobar` keeps the app robust against
 * old bookmarks.
 */
function parseHash(hash: string): ParsedHash {
  if (!hash || hash === '#' || hash === '#/') {
    return { mode: 'stage3', docsRoute: 'hub' };
  }
  const stripped = hash.replace(/^#\/?/, '');
  const parts = stripped.split('/');
  const head = parts[0];
  if (head === 'overview') return { mode: 'overview', docsRoute: 'hub' };
  if (head === 'stage1') return { mode: 'stage1', docsRoute: 'hub' };
  if (head === 'stage3') return { mode: 'stage3', docsRoute: 'hub' };
  if (head === 'docs') {
    const sub = parts[1] ?? 'hub';
    if (DOCS_ROUTES.has(sub as DocsRoute)) {
      return { mode: 'docs', docsRoute: sub as DocsRoute };
    }
    return { mode: 'docs', docsRoute: 'hub' };
  }
  // Catch-all stays Stage 3 per CONTEXT.md L21 — overview is reachable
  // only via explicit #/overview, NOT as the default landing.
  return { mode: 'stage3', docsRoute: 'hub' };
}

function hashFor(mode: AppMode, docsRoute: DocsRoute): string {
  if (mode === 'overview') return '#/overview';
  if (mode === 'stage1') return '#/stage1';
  if (mode === 'stage3') return '#/stage3';
  return docsRoute === 'hub' ? '#/docs' : `#/docs/${docsRoute}`;
}

export const App: Component = () => {
  // Default mode is stage3 so existing Stage-3 workflow remains the landing
  // page (issue acceptance: "Bestehende Stage-3-Funktionalität bleibt
  // unverändert nutzbar"). State trees of the two modes are intentionally
  // disjoint — a Stage 1 import does not feed Stage 3 and vice versa.
  const [mode, setMode] = createSignal<AppMode>('stage3');
  const [docsRoute, setDocsRoute] = createSignal<DocsRoute>('hub');

  const [pool, setPool] = createSignal<ImportedPool | null>(null);
  const [quotas, setQuotas] = createSignal<QuotaConfig | null>(null);
  // Seat-allocation override is hosted at the App level so it survives
  // mode/tab switches (RESEARCH.md Pitfall 7 + R4). Auto-invalidated when
  // the pool or quotas change — old override may reference values that no
  // longer exist (RESEARCH.md R7).
  const [seatAllocationOverride, setSeatAllocationOverride] =
    createSignal<SeatAllocationOverride | null>(null);
  createEffect(
    on(
      [pool, quotas],
      () => {
        setSeatAllocationOverride(null);
      },
      { defer: true },
    ),
  );

  const enginePool = createMemo(() => {
    const p = pool();
    return p ? toEnginePool(p.rows) : null;
  });

  const engineQuotas = createMemo(() => {
    const q = quotas();
    return q ? toEngineQuotas(q) : null;
  });

  const quotaValid = createMemo(() => {
    const p = pool();
    const q = quotas();
    if (!p || !q) return false;
    return validateQuotas(p.rows, q).ok;
  });

  // URL-Hash <-> Solid signal sync. We read the initial hash on mount and
  // subscribe to hashchange events so external navigation (back/forward,
  // bookmark, manual edit, link click) always wins. Tab clicks write the hash
  // and rely on the listener to flip the signals — this keeps the source of
  // truth in one place.
  function applyFromHash() {
    const parsed = parseHash(window.location.hash);
    if (parsed.mode !== mode()) setMode(parsed.mode);
    if (parsed.docsRoute !== docsRoute()) setDocsRoute(parsed.docsRoute);
  }

  onMount(() => {
    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
    onCleanup(() => window.removeEventListener('hashchange', applyFromHash));
  });

  function navigateDocsRoute(next: DocsRoute) {
    window.location.hash = hashFor('docs', next);
  }

  return (
    <div>
      {/* Skip-link to the main landmark — first focusable element on the
          page. Uses the DS `.gat-skiplink` utility from `design-system.css`. */}
      <a href="#main" class="gat-skiplink">
        Zum Hauptinhalt springen
      </a>
      <main id="main" tabindex="-1" class="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Werkzeug-Navigation (DS `.gat-toolnav`): horizontale Reiter-Leiste
            direkt unter der grünen Brandbar im Hauptcontainer — ersetzt das
            frühere linke Seitenmenü und die mobile Pill-Leiste. Eine
            Navigation für alle Viewports; die Reiter brechen auf schmalen
            Viewports um statt zu scrollen. Reine <a href="#/…">-Anker, der
            hashchange-Listener (siehe oben) bleibt die einzige Routing-Quelle.
            Geplante/ausgelagerte Schritte bleiben als deaktivierte Reiter
            sichtbar. */}
        <nav class="gat-toolnav" data-testid="primary-nav" aria-label="Hauptnavigation">
          <span class="gat-toolnav__group">
            <a
              class="gat-toolnav__item"
              classList={{ 'gat-toolnav__item--active': mode() === 'overview' }}
              aria-current={mode() === 'overview' ? 'page' : undefined}
              href="#/overview"
              data-testid="nav-overview"
            >
              Übersicht
            </a>
          </span>
          <span class="gat-toolnav__group">
            <span class="gat-toolnav__label">Verfahren</span>
            <a
              class="gat-toolnav__item"
              classList={{ 'gat-toolnav__item--active': mode() === 'stage1' }}
              aria-current={mode() === 'stage1' ? 'page' : undefined}
              href="#/stage1"
              data-testid="nav-stage1"
            >
              Stage 1 — Versand-Liste
            </a>
            <span
              class="gat-toolnav__item gat-toolnav__item--disabled"
              aria-disabled="true"
              title="Outreach erfolgt außerhalb dieses Tools (Versand, Rückmeldung)."
              data-testid="nav-stage2"
            >
              Stage 2 — Outreach (außerhalb Tool)
            </span>
            <a
              class="gat-toolnav__item"
              classList={{ 'gat-toolnav__item--active': mode() === 'stage3' }}
              aria-current={mode() === 'stage3' ? 'page' : undefined}
              href="#/stage3"
              data-testid="nav-stage3"
            >
              Stage 3 — Panel-Auswahl
            </a>
            <span
              class="gat-toolnav__item gat-toolnav__item--disabled"
              aria-disabled="true"
              title="Reserve-Pool / Drop-out-Replacement — Iteration 2."
              data-testid="nav-stage4"
            >
              Stage 4 — Reserve (geplant)
            </span>
          </span>
          <span class="gat-toolnav__group">
            <span class="gat-toolnav__label">Mehr</span>
            <a
              class="gat-toolnav__item"
              classList={{ 'gat-toolnav__item--active': mode() === 'docs' }}
              aria-current={mode() === 'docs' ? 'page' : undefined}
              href="#/docs"
              data-testid="nav-docs"
            >
              Dokumentation
            </a>
            <a class="gat-toolnav__item" href="#/docs/beispiele" data-testid="nav-beispiele">
              Beispiel-Daten
            </a>
            {/* External hub link — target/rel for tabnabbing mitigation; never
                carries an active state (outside this app's route space). */}
            <a
              class="gat-toolnav__item"
              href="https://werkzeuge.gruene.at/"
              target="_blank"
              rel="noopener"
              data-testid="nav-werkzeuge"
            >
              Werkzeuge <span aria-hidden="true">↗</span>
            </a>
            <a
              class="gat-toolnav__item"
              href="mailto:florian.motlik@gruene.at"
              data-testid="nav-mailto"
            >
              florian.motlik@gruene.at
            </a>
          </span>
        </nav>

        {/* Single <h1> per route. Docs route owns its <h1> via DocsLayout
            (page-title); Overview owns its own visible <h1> too. So we only
            emit a hidden <h1> here on Stage 1 + Stage 3 routes. The Brand
            wordmark in Sidebar is a <span class="font-serif">, NOT an <h1>,
            so a11y.spec.ts ("h1 must exist and be unique") and
            csv-import/smoke specs (getByRole('heading', { name:
            'Personenauswahl' })) both pass on Stage 1 + Stage 3. */}
        <Show when={mode() !== 'docs' && mode() !== 'overview'}>
          <h1 class="sr-only">Personenauswahl</h1>
        </Show>

        <Show when={mode() === 'overview'}>
          <Suspense fallback={<p>Lade…</p>}>
            <Overview />
          </Suspense>
        </Show>

        <Show when={mode() === 'stage1'}>
          <Stage1Panel />
        </Show>

        <Show when={mode() === 'docs'}>
          <Suspense fallback={<p>Lade…</p>}>
            <DocsHub docsRoute={docsRoute} setDocsRoute={navigateDocsRoute} />
          </Suspense>
        </Show>

        <Show when={mode() === 'stage3'}>
          <div class="space-y-8">
            <section>
              <h2 class="text-xl font-semibold mb-3">1. Pool importieren</h2>
              <FileImport
                onLoaded={({ parsed, mapping }) => {
                  setPool({ parsed, mapping, rows: applyMapping(parsed.rows, mapping) });
                  setQuotas(null);
                }}
              />
            </section>

            <Show when={pool()}>
              {(p) => (
                <section>
                  <h2 class="text-xl font-semibold mb-3">2. Quoten konfigurieren</h2>
                  <p class="text-sm text-ink-3 mb-3" data-testid="pool-summary">
                    {p().rows.length} Personen importiert.
                  </p>
                  <QuotaEditor
                    rows={p().rows}
                    candidateColumns={Object.keys(p().rows[0] ?? {}).filter(
                      (c) => c !== 'person_id',
                    )}
                    onChange={(cfg) => setQuotas(cfg)}
                  />
                </section>
              )}
            </Show>

            <Show when={quotaValid() && enginePool() && engineQuotas()}>
              {(_v) => {
                const p = pool()!;
                const q = quotas()!;
                return (
                  <section>
                    <h2 class="text-xl font-semibold mb-3">3. Lauf starten</h2>
                    <RunPanel
                      pool={enginePool()!}
                      quotas={engineQuotas()!}
                      rows={p.rows}
                      panelSize={q.panel_size}
                      candidateAxes={Object.keys(p.rows[0] ?? {}).filter((c) => c !== 'person_id')}
                      override={seatAllocationOverride()}
                      onOverrideChange={setSeatAllocationOverride}
                    />
                  </section>
                );
              }}
            </Show>

            <Show when={pool() && quotas() && !quotaValid()}>
              <section>
                <p class="text-sm text-ink-3" data-testid="run-stub">
                  Quoten-Konfiguration noch nicht gültig — bitte Eingaben prüfen.
                </p>
              </section>
            </Show>
          </div>
        </Show>

        {/* Footer — lokale-Daten-Hinweis + Build-Stempel. Aus dem früheren
            Seitenmenü-Fuß in den Hauptcontainer gezogen. */}
        <footer class="pt-6 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-xs text-ink-3">Daten bleiben lokal</span>
          <span class="text-xs text-ink-3 font-mono">
            v{(import.meta.env.VITE_APP_VERSION as string | undefined) ?? '?'} · {__GIT_SHA__}
          </span>
        </footer>
      </main>
    </div>
  );
};
