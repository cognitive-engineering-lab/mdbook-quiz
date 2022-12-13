import fs from "fs-extra";
import _ from "lodash";
import * as uuid from "uuid";

// This is NOT implemented with a TOML library b/c I couldn't find one that would
// preserve the formatting of the TOML file, esp the "a.b = foo" notation.
//
// This SHOULD be rewritten with a TOML library when such a library exists!

let quizPaths = process.argv.slice(2);
let header = "[[questions]]";
let key = "id = ";
let headerRe = new RegExp(_.escapeRegExp(header), "g");

let processQuiz = async (p: string) => {
  let contents = await fs.readFile(p, "utf-8");
  let matches = [...contents.matchAll(headerRe)];

  // Find all [[questions]] headers that don't immediately have "id = " on the next line
  let insertions: { index: number; str: string }[] = [];
  matches.forEach(match => {
    let { index } = match;
    let start = index! + header.length + 1;
    if (contents.slice(start, start + key.length) != key) {
      insertions.push({
        index: start,
        str: `${key}"${uuid.v4()}"\n`,
      });
    }
  });

  if (insertions.length == 0) return;

  // Insert the new ids into the contents
  let pieces = [];
  insertions.forEach(({ index, str }, i) => {
    let prefix = contents.slice(i == 0 ? 0 : insertions[i - 1].index, index);
    pieces.push(prefix);
    pieces.push(str);
  });
  pieces.push(contents.slice(_.last(insertions)!.index));

  let finalContents = pieces.join("");
  await fs.writeFile(p, finalContents);
};

let main = async () => {
  await Promise.all(quizPaths.map(processQuiz));
};

main();
