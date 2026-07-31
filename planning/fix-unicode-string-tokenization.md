# Fix Unicode String Tokenization

## Goal

Tokenize structured strings by Unicode code point so astral characters are never split into malformed surrogate halves.

## Checklist

- [x] Convert normalized strings to code-point arrays before truncation and n-gram slicing.
- [x] Preserve existing ASCII and BMP tokenization behavior and configured limits.
- [x] Add emoji token-boundary and truncation-boundary coverage.
- [x] Add mixed Unicode, consecutive emoji, and ASCII regression coverage.
- [x] Verify structured index writes, exact matching, and LIKE queries with astral characters.
- [x] Run the complete Voltra test suite.
- [ ] Publish a professional pull request targeting `main`.
