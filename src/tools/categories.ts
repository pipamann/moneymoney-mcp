import { runMoneyMoneyCommand } from "../applescript.js";
import { parsePlist } from "../plist.js";

interface RawCategory {
  name?: string;
  uuid?: string;
  indentation?: number;
  group?: boolean;
  icon?: string;
}

export interface Category {
  name: string;
  uuid: string | undefined;
  children: Category[];
}

export async function exportCategories(): Promise<Category[]> {
  const xml = await runMoneyMoneyCommand('export categories');
  const raw = parsePlist(xml) as RawCategory[];

  if (!Array.isArray(raw)) return [];

  return buildCategoryTree(raw);
}

/**
 * Build a hierarchical category tree from MoneyMoney's flat indented list.
 */
function buildCategoryTree(raw: RawCategory[]): Category[] {
  const root: Category[] = [];
  const stack: { category: Category; indent: number }[] = [];

  for (const item of raw) {
    const indent = item.indentation ?? 0;
    const category: Category = {
      name: item.name ?? "Unknown",
      uuid: item.uuid,
      children: [],
    };

    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(category);
    } else {
      stack[stack.length - 1].category.children.push(category);
    }

    stack.push({ category, indent });
  }

  return root;
}
