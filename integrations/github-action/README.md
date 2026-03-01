# fractal-hash-action

GitHub Action that generates deterministic fractal images for release artifact checksums and embeds them in release notes.

## Usage

```yaml
- name: Generate Fractal Checksums
  uses: YOUR_USERNAME/fractal-hash-action@v1
  id: fractals
  with:
    files: 'dist/*.tar.gz'
    algorithm: 'sha256'
    size: 64

- name: Attach to release
  uses: softprops/action-gh-release@v1
  with:
    body: ${{ steps.fractals.outputs.markdown }}
    files: fractal-checksums/*
```

## Inputs

| Input | Required | Default | Description |
|-------|---------|---------|-------------|
| `files` | Yes | — | Glob pattern for files to hash |
| `algorithm` | No | `sha256` | Hash algorithm (`sha256` or `sha512`) |
| `size` | No | `64` | Fractal image size in pixels |
| `output-dir` | No | `fractal-checksums` | Directory for generated images |

## Outputs

| Output | Description |
|--------|-------------|
| `markdown` | Markdown table with filenames, checksums, and fractal images |
| `checksums-file` | Path to generated `checksums.txt` |

## Example Output

The action generates a markdown table like:

| File | Checksum | Fractal |
|------|----------|---------|
| `myapp-v1.0.0.tar.gz` | `a3f8b2c1d4e5...` | _(64×64 fractal PNG)_ |

Each fractal is uniquely and deterministically derived from the file's SHA-256 hash — a corrupted or tampered artifact produces a visually distinct fractal.

## Build (for contributors)

```bash
cd integrations/github-action
npm install
npm run build
```

The compiled action entry point must be committed to `dist/` for GitHub Actions to run it without installing dependencies.
