const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);

['ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06', 'ch07'].forEach((name) => {
  const file = path.join(root, 'data', name + '.js');
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, ctx, { filename: file });
});

const book = ctx.window.BOOK;
const out = path.join(__dirname, 'book.json');
fs.writeFileSync(out, JSON.stringify(book, null, 2), 'utf8');

const chapters = book.chapters.map((ch) => ({
  id: ch.id,
  title: ch.title,
  cards: ch.cards.length,
  cloze: ch.cloze.length,
  quiz: ch.quiz.length,
  mn: ch.mn.length
}));
console.log(JSON.stringify({ chapters, totalCards: chapters.reduce((n, c) => n + c.cards, 0) }, null, 2));
