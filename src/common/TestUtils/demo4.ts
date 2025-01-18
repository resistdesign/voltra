export class TextTools {
  constructor(public text: string) {}

  encapsulate = (open: string, close: string): string =>
    `${open}${this.text}${close}`;
}
