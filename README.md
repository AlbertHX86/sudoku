# Sudoku

English | [中文](README.zh-CN.md)

A minimal Sudoku that runs in the browser. It has no ads, no sign-up and no dependencies. It is the companion of [Schulte Grid](https://github.com/AlbertHX86/schulte-grid) and uses the same look.

**Play online:** https://alberthx86.github.io/sudoku/

## How to play

1. Pick a level: **Easy** (40 givens), **Medium** (32) or **Hard** (26). Every puzzle is newly generated and has exactly one solution.
2. Tap an empty cell, then tap a number below the board. The timer starts with your first number.
3. Fill the board so that every row, every column and every 3×3 box contains 1–9 exactly once.
4. A wrong number turns red and adds one to **Mistakes**. Tap ⌫ to erase it.
5. The timer stops when the board is complete. Your time is saved to **Records**.
6. Press **Reset** for a new puzzle.

Helpers:

- Selecting a cell highlights its row, column and box, and every cell with the same number.
- A number button turns grey once that number is placed correctly nine times.
- On a keyboard: <kbd>1</kbd>–<kbd>9</kbd> to enter, <kbd>Backspace</kbd> or <kbd>0</kbd> to erase, arrow keys to move.

The top right corner switches between light and dark themes and between English and Chinese. By default the page follows your system theme and browser language.

## Records

Each level keeps its own records: your best time and your 10 most recent puzzles, with the number of mistakes. They are stored in your browser's `localStorage`. Nothing is sent anywhere.

- The same browser on the same device keeps your records, online or offline.
- Records do not sync between browsers or devices.
- Clearing browser data deletes them. You can also press **Clear** to delete the records of the current level.

## Run it locally

The game is three static files, `index.html`, `style.css` and `app.js`, with no build step.

```bash
git clone https://github.com/AlbertHX86/sudoku.git
cd sudoku
```

Then either open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening the file directly and serving it over `localhost` count as different sites to the browser, so they keep separate records.

## Sudoku and the brain

Solving Sudoku means holding candidate numbers in working memory, applying rules and checking your choices, all jobs the prefrontal cortex is central to. Brain imaging shows prefrontal and frontoparietal control regions working hard during the puzzle, and people who do number puzzles often tend to score better on attention and memory tests. Those studies are few and small, though, and they don't show that playing changes your brain. The page's **Research** section summarises them with references.

## License

[MIT](LICENSE)
