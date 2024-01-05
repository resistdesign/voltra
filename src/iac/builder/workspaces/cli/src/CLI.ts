import Path from 'path';
import FS from 'fs';
import { program } from 'commander';
import YAML from 'yaml';
import { validateFile } from 'cfn-lint';

export const CLI = (packageInfo: { version: string } = { version: '0.0.0' }) => {
  const { version = '0.0.0' } = packageInfo;
  const defaultInput = Path.join(process.cwd(), 'src', 'iac.ts');
  const defaultOutput = Path.join(process.cwd(), 'dist', 'iac.yaml');

  program.version(version, '-v, --version', 'output the current version');
  program
    .option('-i, --input <path>', 'the input .ts file', defaultInput)
    .option('-o, --output <path>', 'the output CloudFormation template file', defaultOutput);
  program.parse(process.argv);

  const {
    input = defaultInput,
    output = defaultOutput,
  }: {
    input: string;
    output: string;
  } = program.opts() as any;
  const cleanInput = Path.isAbsolute(input) ? input : Path.join(process.cwd(), input);
  const cleanOutput = Path.isAbsolute(output) ? output : Path.join(process.cwd(), output);

  console.log(`READING: ${cleanInput}`);

  const templateStructure = require(cleanInput);
  const cleanTemplateStructure = templateStructure?.default || templateStructure;

  if (!cleanTemplateStructure) {
    throw new Error('Missing input template file.');
  }

  const templateYAML = YAML.stringify(
    // TRICKY: Removed all keys with a value of `undefined`.
    JSON.parse(JSON.stringify(cleanTemplateStructure)),
  );
  const outputDir = Path.dirname(cleanOutput);

  console.log(`WRITING: ${cleanOutput}`);

  FS.mkdirSync(outputDir, { recursive: true });
  FS.writeFileSync(cleanOutput, templateYAML, { encoding: 'utf8' });

  const { templateValid = true, errors: { info = [], warn = [], crit = [] } = {} } = validateFile(cleanOutput) || {};
  const errorMap: Record<string, any[]> = {
    Info: info,
    Warnings: warn,
    Critical: crit,
  };

  console.log('VALIDATION:', templateValid ? 'The template is valid.' : 'The template is NOT valid.');

  for (const errorLabel in errorMap) {
    const currentErrorList = errorMap[errorLabel];

    if (currentErrorList?.length) {
      console.log(
        `  ${errorLabel}:`,
        `\n    ${currentErrorList
          .map((e) => {
            const {
              message = 'Unspecified message.',
              resource = 'Not supplied.',
              documentation = 'Not supplied.',
            } = e || {};

            return `Message: ${message}\n    Resource: ${resource}\n    Documentation: ${documentation}`;
          })
          .join('\n\n    ')}`,
      );
    }
  }

  console.log('COMPLETE');
};
