---
id: khnpz
title: Impressum und Datenschutzerklaerung im Footer verlinken
status: open
priority: high
remote:
- source: github
  id: '24'
  url: https://github.com/GrueneAT/Personenwahl/issues/24
---

Auf dieser Web-App fehlen Impressum und Datenschutzerklaerung. Beides muss auf
jeder Seite erreichbar sein. Andere Apps im Workspace haben es bereits:
werkzeuge.gruene.at, gemeindeordnung.gruene.at und bildgenerator.gruene.at.

Entscheidung fuer diese Runde: **beide als Link auf die offiziellen Seiten**,
keine eigene Impressum-Seite. Muster wie bei werkzeuge.gruene.at.

## Was zu tun ist

Im Footer (`apps/web/src/App.tsx`, `<footer class="pt-6 border-t border-line …">` ~Zeile 376 — neben „Daten bleiben lokal" und dem Versions-/Build-Stempel) zwei Links ergaenzen:

- **Impressum** -> `https://gruene.at/impressum/`
- **Datenschutzerklaerung** -> `https://gruene.at/datenschutzerklarung/`

Beide URLs sind geprueft (HTTP 200, Titel „Impressum - Die Gruenen" bzw.
„Datenschutzerklaerung - Die Gruenen"). Die zweite URL hat KEIN „ae" und kein
„ss" — sie lautet exakt `datenschutzerklarung`. Nicht „korrigieren".

Aussenlinks wie im Repo ueblich kennzeichnen (`target="_blank"`,
`rel="noopener"`). Gestaltung an den vorhandenen Footer-Inhalten orientieren,
kein neues Muster erfinden — die Links reihen sich in die bestehenden Eintraege
ein.

## Akzeptanzkriterien

- [ ] Beide Links stehen im Footer und sind auf jeder Seite der App sichtbar
- [ ] Sie fuehren auf die offiziellen Seiten auf gruene.at
- [ ] Im gebauten Ergebnis nachgewiesen, nicht nur im Quelltext
- [ ] Build/Tests laufen durch

## Constraints

- Kein Vendoring, keine eigene Impressum-Seite in diesem Schritt
- Conventional Commit, keine Werkzeug-Attribution

## Zusaetzlich in diesem Branch

`.issues/config.yaml` trug zwei Alt-Schluessel (`naming.prefix`, `naming.separator`), die das aktuelle issue-cli-Schema nicht mehr kennt. Dadurch scheiterten `store new-id`, `naming`, `config get` UND `worktree create` — die issue-cli war in diesem Repo vollstaendig unbenutzbar, und der Fix liess sich nicht auf dem ueblichen Weg vorbereiten. Die beiden Zeilen sind entfernt; `naming.branch` bleibt unveraendert.
