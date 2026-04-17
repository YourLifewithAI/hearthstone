# Context files

This directory holds **your** markdown files that get injected as Claude's system prompt.

The `.example` files below are starting points. Copy each to the version without `.example`, edit them to match your life, and run the snapshot script.

```bash
cp context/about.md.example context/about.md
cp context/projects.md.example context/projects.md
cp context/style.md.example context/style.md
cp context/notes.md.example context/notes.md
# Edit each in your text editor, then:
./scripts/snapshot.sh   # or .\scripts\snapshot.ps1 on Windows
```

The real `*.md` files are gitignored — don't accidentally commit your personal context.

## Want different sections?

The file keys (`about`, `projects`, `style`, `notes`) are defined in `api/src/types.ts` as `CTX_KEYS`. If you want `health` and `goals` instead, or just one big `me.md`, edit that array and update the snapshot scripts to match the file list.

## Size limits

Each file can be up to 200KB. In practice, a few thousand words per file is plenty. Remember that every chat sends all your context — bigger context = higher token cost per message.
