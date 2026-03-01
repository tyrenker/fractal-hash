#!/usr/bin/env node
import { normalize } from '../core/normalizer.js';
import { extractParameters } from '../core/parameter-extractor.js';
import { renderToPng, renderToPngFile } from '../renderers/png-renderer.js';
import { renderToSvg } from '../renderers/svg-renderer.js';
import { renderToAnsi } from '../renderers/ansi-renderer.js';
import { FractalHashOptions } from '../core/types.js';

interface ParsedArgs {
  input: string;
  format: string;
  size: number;
  output?: string;
  background: 'dark' | 'light' | 'transparent';
  stdin: boolean;
}

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: fractal-hash [options] [hash]',
      '',
      'Options:',
      '  --format <fmt>       Output format: ansi, png, svg (default: ansi)',
      '  --size <n>           Image size in pixels (default: 256)',
      '  --output, -o <path>  Output file path (for png/svg)',
      '  --background <bg>    Background: dark, light, transparent (default: dark)',
      '  --stdin              Read hash from stdin',
      '  --help, -h           Show this help message',
      '',
      'Examples:',
      '  fractal-hash "SHA256:abc123..."',
      '  fractal-hash --format png --size 512 -o out.png "my-hash"',
      '  echo "abc123" | fractal-hash --stdin',
      '  fractal-hash --format svg "my-hash" > output.svg',
      '',
    ].join('\n'),
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    input: '',
    format: 'ansi',
    size: 256,
    background: 'dark',
    stdin: false,
  };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--format':
        args.format = argv[++i] ?? 'ansi';
        break;
      case '--size':
        args.size = parseInt(argv[++i] ?? '256', 10);
        break;
      case '-o':
      case '--output':
        args.output = argv[++i];
        break;
      case '--background':
        args.background = (argv[++i] ?? 'dark') as ParsedArgs['background'];
        break;
      case '--stdin':
        args.stdin = true;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!argv[i].startsWith('-')) {
          args.input = argv[i];
        }
        break;
    }
  }
  return args;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  let input = args.input;
  if (args.stdin) {
    input = await readStdin();
  }

  if (!input) {
    process.stderr.write('Error: no input provided. Use a positional argument or --stdin.\n');
    process.exit(1);
  }

  const bytes = await normalize(input);
  const config = extractParameters(bytes);
  config.background.darkMode = args.background !== 'light';

  const options: FractalHashOptions = {
    size: args.size,
    format: args.format as FractalHashOptions['format'],
    background: args.background,
  };

  switch (args.format) {
    case 'png': {
      if (args.output) {
        await renderToPngFile(config, options, args.output);
        process.stderr.write(`Saved PNG to ${args.output}\n`);
      } else {
        const buf = await renderToPng(config, options);
        process.stdout.write(buf);
      }
      break;
    }
    case 'svg': {
      const svg = renderToSvg(config, args.size);
      if (args.output) {
        const { writeFile } = await import('node:fs/promises');
        await writeFile(args.output, svg, 'utf8');
        process.stderr.write(`Saved SVG to ${args.output}\n`);
      } else {
        process.stdout.write(svg);
      }
      break;
    }
    default: {
      // ANSI (default)
      const art = renderToAnsi(config);
      process.stdout.write(art + '\n');
      break;
    }
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(msg + '\n');
  process.exit(1);
});
