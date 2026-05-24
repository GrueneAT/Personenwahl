import type { Component } from 'solid-js';
import { Brand } from './Brand';
import { NavGroup } from './NavGroup';

/**
 * Sidebar — visible at md+ only. Reads the current route signal to render
 * active state but never writes back: every nav-item is a real
 * <a href="#/..."> anchor and the existing hashchange listener at
 * App.tsx:141-144 stays the single source of truth.
 *
 * Adds data-testid="primary-nav" as a SUPERSET of the legacy
 * data-testid="main-nav" (the pill-tab nav that remains visible at <md
 * for fallback navigation + mobile-touch-targets contract).
 */
interface Props {
  /** Current top-level route (mirrors App.tsx `mode()`). */
  mode: () => string;
}

interface NavItemProps {
  href: string;
  testid: string;
  active: boolean;
  children: string;
}

function NavLink(props: NavItemProps) {
  return (
    <li>
      <a
        href={props.href}
        data-testid={props.testid}
        classList={{ 'is-active': props.active }}
        aria-current={props.active ? 'page' : undefined}
      >
        {props.children}
      </a>
    </li>
  );
}

interface ExternalNavItemProps {
  href: string;
  testid: string;
  children: string;
}

/**
 * External nav link — opens in a new tab and never carries an active state
 * (lives outside this app's route space). UX convention: target="_blank"
 * pairs with rel="noopener" so the opened tab cannot reach back into the
 * opener via window.opener (Tabnabbing-Mitigation). The trailing arrow ↗
 * keeps the "external" affordance visible without an icon dependency.
 */
function NavExternal(props: ExternalNavItemProps) {
  return (
    <li>
      <a href={props.href} data-testid={props.testid} target="_blank" rel="noopener">
        {props.children} <span aria-hidden="true">↗</span>
      </a>
    </li>
  );
}

interface DisabledNavItemProps {
  testid: string;
  hint: string;
  children: string;
}

function NavDisabled(props: DisabledNavItemProps) {
  return (
    <li>
      <span
        class="opacity-55 cursor-not-allowed"
        aria-disabled="true"
        data-testid={props.testid}
        title={props.hint}
      >
        {props.children}
      </span>
    </li>
  );
}

export const Sidebar: Component<Props> = (props) => {
  return (
    <aside
      class="app-sidebar hidden md:flex md:flex-col md:w-sidebar-w md:fixed md:inset-y-0 md:left-0 md:border-r md:border-line"
      data-testid="sidebar"
    >
      <div class="p-4">
        <Brand />
      </div>
      <nav
        class="flex-1 px-3 overflow-y-auto"
        data-testid="primary-nav"
        aria-label="Hauptnavigation"
      >
        <NavGroup label="Übersicht">
          <NavLink href="#/overview" testid="nav-overview" active={props.mode() === 'overview'}>
            Übersicht
          </NavLink>
        </NavGroup>
        <NavGroup label="Verfahrensschritte">
          <NavLink href="#/stage1" testid="nav-stage1" active={props.mode() === 'stage1'}>
            Stage 1 — Versand-Liste
          </NavLink>
          <NavDisabled
            testid="nav-stage2"
            hint="Outreach erfolgt außerhalb dieses Tools (Versand, Rückmeldung)."
          >
            Stage 2 — Outreach (außerhalb Tool)
          </NavDisabled>
          <NavLink href="#/stage3" testid="nav-stage3" active={props.mode() === 'stage3'}>
            Stage 3 — Panel-Auswahl
          </NavLink>
          <NavDisabled
            testid="nav-stage4"
            hint="Reserve-Pool / Drop-out-Replacement — Iteration 2."
          >
            Stage 4 — Reserve (geplant)
          </NavDisabled>
        </NavGroup>
        <NavGroup label="Ressourcen">
          <NavLink href="#/docs" testid="nav-docs" active={props.mode() === 'docs'}>
            Dokumentation
          </NavLink>
          <NavLink
            href="#/docs/beispiele"
            testid="nav-beispiele"
            active={false /* sub-route — keep docs as the active top-level */}
          >
            Beispiel-Daten
          </NavLink>
          {/* Cross-tool link to the Grüne-AT Werkzeuge hub. URL points at
              the GitHub Pages mirror for now — the custom-domain
              `werkzeuge.gruene.at` is pending DNS. Re-point when DNS is
              live; consumers continue to land on the same hub. */}
          <NavExternal href="https://grueneat.github.io/werkzeuge/" testid="nav-werkzeuge">
            Werkzeuge
          </NavExternal>
        </NavGroup>
      </nav>
      <div class="mt-auto p-4 space-y-1 border-t border-line">
        <div class="text-xs text-ink-3">Daten bleiben lokal</div>
        <div class="text-xs text-ink-3 font-mono">
          v{(import.meta.env.VITE_APP_VERSION as string | undefined) ?? '?'} · {__GIT_SHA__}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
