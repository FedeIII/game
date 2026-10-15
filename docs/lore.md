# Lore: Kandrax, on Google Drive

Where the lore of the game is, and how to read it. The written story of the game is in `docs/story/`.

The lore and the story of the game follow **Kandrax**, the D&D 5e world of Fede. Its documents
are in the folder `Kandrax D&D` of a Google Drive (account fedelll@gmail.com). Fede changes them
all the time (Fede's decision, 2026-10-11), thus:

- Read the documents live from the Drive each time that you need them. Do not trust what an
  earlier session read.
- Do not copy the documents, or long parts of them, into this repository: a copy goes out of
  date. Put into the code only what the game uses (a name, a line, a place), as for any other
  content.
- The access is read-only (scope `drive.readonly`). If a document must change, tell Fede.

**Access: the rclone remote `gdrive:`**, with the same name on the VPS and on the laptop. On the
VPS it is in `/root/.config/rclone/rclone.conf` (since 2026-10-11). Check it with
`rclone lsd "gdrive:Kandrax D&D"`. If `rclone listremotes` has no `gdrive:`, ask Fede to run
these commands (a browser opens; select fedelll@gmail.com):

```bash
brew install rclone                                       # on the laptop
rclone config create gdrive drive scope=drive.readonly
```

Google Drive for desktop does not help: it shows a Google Doc as a `.gdoc` link without the text.

**Read a document.** Nearly all of them are Google Docs. They have no size, and rclone shows them
as `.docx` files. Add `--drive-export-formats md` to each command: rclone then shows them as
`.md` files and exports Markdown with the headings.

```bash
K="gdrive:Kandrax D&D"; X="--drive-export-formats md"
rclone lsf -R $X "$K"                          # the live list of files
rclone cat $X "$K/Kandrax AI Context.md"       # one document
D=$(mktemp -d); rclone copy $X --include "*.md" "$K/Personajes" "$D"; grep -ril "forjacero" "$D"; rm -rf "$D"
```

- Use the exact names from `rclone lsf`. Some names have a space before the extension
  (`1.4.3 - Linderis .md`) or two dots (`0.0 - Guía del aventurero novato..md`), and many names
  have accents.
- A search (the last line above) copies to a temporary directory outside the repository. Delete
  it after the search.

**Where to look.** The folder has about 575,000 words: do not read all of it. The documents are
in Spanish, except `Kandrax AI Context`. The game is in English, and its names translate the
Spanish names of Kandrax; a language setting is to give Spanish with the names of Kandrax (Fede's
decisions, 2026-10-11; not built yet). The names and the plan of the first story are in
`docs/drafts/story-razed-villages.md`. Ask Fede before you use a name that is not in its table.

| Document | Contents |
|---|---|
| `Kandrax AI Context` | **Start here.** A short summary in English: the regions, the four true gods and their avatars, Thrain Forjacero. |
| `Kandrax - Mundo` | The world: the Human, Central, Elven and Dwarven Dominions, the Wildlands of the north and of the south, the wars. |
| `Kandrax - Dioses` | The gods: the cycle of ascensions, ancient history, the mortal origins of the gods, the four gods and their avatars, stories. |
| `Kandrax - Obras Famosas` | Famous books of the world (religion, engineering, history, maps, politics). |
| `0.0 - Guía del aventurero novato.` | The guide for new players: the world, civilization, gods, races, classes, the start of the adventure. `despedida pdf` has nearly the same text. |
| `RPG` | The working notes of Fede as game master: next sessions, TODO, AI context, parties, prompts, cycles, gods. It changes most often. |
| `Lugares/` | Places: the Central Dominions (Enclave del Mithril; Soberanía del Hierro, with Bahía del Hierro and Thalesferro) and the Valle del Vintral. |
| `Personajes/` | Characters: `0.1 - Personajes`, `0.2 - Personajes No Jugadores`, the two parties (Compañía Arcana, Compañía del Perfil Bajo), `NPCs/`, `Crónicas/`. |
| `Sagas/` | The campaigns. `Dioses Olvidados/` is the first saga: `1.0 - Saga de los Dioses Olvidados`, its chapters in `Capítulos/` (1.1 to 1.9), `Documentos in-game/` and `Spinoffs/`. Then `2.0 - Saga del Ascenso Divino` and `3.0 - Saga del Caos`. |
| `Kandrax - Resumen - Compañía …`, `Kandrax - Guión - Compañía Arcana` | What happened in the sessions of each party, and a script. |
| `Images/`, `tokens/` | Art for reference: characters, maps, regions, sessions; tokens of characters and monsters. |

- `Sagas/Dioses Olvidados/Los Dioses Olvidados - Parte I - A4`, `- A5` and `- B5` are one book
  in three page formats (A4 and A5 are the same; B5 is nearly the same). It tells the first saga
  as a story, in about 99,000 words. Read one of them, and only the part that you need.
- Not lore: `RPG - Music` (music for the sessions), `1.1 - Plantilla de capítulo` (a template for
  chapters), `Music/`, `db_backups/` and `Excalidraw/` (battle maps of 1 to 38 MB each).
