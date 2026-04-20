import type { Product, Ingredient, InventoryItem } from '@/lib/types';
import { convertInventoryQuantity } from '@/lib/unit-conversion';

export function calculateProductProducibleQuantity(
  product: Product,
  allIngredients: Ingredient[] = [],
  allInventoryItems: InventoryItem[] = []
): number {
  if (!product.ingredients || product.ingredients.length === 0) {
    return product.quantity ?? 0;
  }

  if (allIngredients.length === 0 && allInventoryItems.length === 0) {
    return 0;
  }

  let maxProducible = Infinity;

  for (const recipeIngredient of product.ingredients) {
    const sourceType = recipeIngredient.sourceType ?? 'ingredient';
    const inventoryIngredient = sourceType === 'inventory_item'
      ? allInventoryItems.find((item) => item.id === recipeIngredient.ingredientId)
      : allIngredients.find((item) => item.id === recipeIngredient.ingredientId);

    if (!inventoryIngredient) {
      return 0;
    }

    const requiredQuantity = sourceType === 'ingredient'
      ? convertInventoryQuantity(recipeIngredient.quantity, recipeIngredient.unit, inventoryIngredient.unit) ?? recipeIngredient.quantity
      : recipeIngredient.quantity;

    if (requiredQuantity <= 0) {
      return 0;
    }

    const producibleWithThisIngredient = Math.floor(inventoryIngredient.quantity / requiredQuantity);
    if (producibleWithThisIngredient < maxProducible) {
      maxProducible = producibleWithThisIngredient;
    }
  }

  return maxProducible === Infinity ? 0 : maxProducible;
}