# Vendored skills — provenance

Everything in this directory is third-party code, copied in rather than
installed, so that a fresh clone of Bagcheck has the design skills available
without a marketplace step and so that a given commit of this repo always
pairs with a known version of them.

| | |
|---|---|
| **Upstream** | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| **Version** | 2.13.0 |
| **Commit** | `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99` |
| **Vendored** | 2026-08-12 |
| **Licence** | MIT — see `LICENSE` in this directory |

## What is here

Seven skills, exactly as upstream ships them:

`ui-ux-pro-max` · `design` · `design-system` · `brand` · `slides` ·
`banner-design` · `ui-styling`

`ui-ux-pro-max` is the one Bagcheck actually leans on. Its searchable
database — styles, palettes, font pairings, UX guidelines, per-stack notes —
is what the landing and the Wrapped cards were designed against; the poster
grammar the share cards use came out of its "Bold Typography (Mobile Poster)"
entry.

## Do not edit these files

They are a verbatim copy. Local edits would be silently destroyed by the next
update and would make the version above a lie. Anything Bagcheck-specific
belongs in `CLAUDE.md` or in a skill of our own, not in here.

## Updating

```sh
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/uiux
rsync -a --delete --exclude='__pycache__' /tmp/uiux/.claude/skills/ .claude/skills/
cp /tmp/uiux/LICENSE .claude/skills/LICENSE
```

Then restore this file, update the table above, and check the copy still
works before committing:

```sh
S=.claude/skills/ui-ux-pro-max
PYTHONPATH=$S/scripts python3 $S/scripts/tests/test_core.py
PYTHONPATH=$S/scripts python3 $S/scripts/tests/test_design_system_mode.py
python3 $S/scripts/validate_data.py
```

The upstream plugin manifests (`.claude-plugin/`) are deliberately **not**
vendored. They declare the repository that contains them to *be* the
ui-ux-pro-max plugin, which is true of upstream and false of Bagcheck.
