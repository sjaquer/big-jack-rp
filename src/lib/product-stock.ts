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
    const inventoryItem = sourceType === 'inventory_item'
      ? allInventoryItems.find((item) => item.id === recipeIngredient.ingredientId)
      : undefined;
    const ingredient = sourceType === 'ingredient'
      ? allIngredients.find((item) => item.id === recipeIngredient.ingredientId)
      : undefined;

    const inventoryIngredient = sourceType === 'inventory_item' ? inventoryItem : ingredient;

    if (!inventoryIngredient) {
      return 0;
    }

    const requiredQuantity = sourceType === 'ingredient'
      ? convertInventoryQuantity(recipeIngredient.quantity, recipeIngredient.unit, ingredient?.unit) ?? recipeIngredient.quantity
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

export function calculateProductRecipeCost(
  product: Product,
  allIngredients: Ingredient[] = [],
  allInventoryItems: InventoryItem[] = []
): number {
  if (!product.ingredients || product.ingredients.length === 0) {
    return 0;
  }

  return product.ingredients.reduce((total, recipeIngredient) => {
    const sourceType = recipeIngredient.sourceType ?? 'ingredient';

    if (sourceType === 'inventory_item') {
      const inventoryItem = allInventoryItems.find((item) => item.id === recipeIngredient.ingredientId);
      const costPerUnit = inventoryItem?.costPerUnit ?? 0;
      return total + recipeIngredient.quantity * costPerUnit;
    }

    const ingredient = allIngredients.find((item) => item.id === recipeIngredient.ingredientId);
    if (!ingredient) {
      return total;
    }

    const requiredQuantity = convertInventoryQuantity(
      recipeIngredient.quantity,
      recipeIngredient.unit,
      ingredient.unit
    ) ?? recipeIngredient.quantity;

    return total + requiredQuantity * (ingredient.cost ?? 0);
  }, 0);
}