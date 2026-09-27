import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

import {recipeSchema} from './recipe.ts';
import type {Recipe} from './recipe.ts';

/** The recipes in `<plugin directory>/recipes/*.json`; none when the folder does not exist. */
export function loadRecipes(pluginDirectory: string): Recipe[] {
  const directory = join(pluginDirectory, 'recipes');
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter(name => name.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map(name => {
      const parsed = recipeSchema.safeParse(
        JSON.parse(readFileSync(join(directory, name), 'utf8')),
      );
      if (!parsed.success) {
        throw new TypeError(`Invalid email recipe ${name}`);
      }
      return parsed.data;
    });
}
