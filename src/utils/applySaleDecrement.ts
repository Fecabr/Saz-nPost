import {
  decreaseItemStock,
  listBatches,
  updateBatchPortions,
  getRecipeIngredients,
  getItemStock,
} from '../services/inventoryService';

export interface SaleLineItem {
  itemId: string;
  type: 'batch_portion' | 'unit' | 'ingredient';
  recipeId?: string;
  qty: number;
}

export interface DecrementDetail {
  type: 'batch' | 'stock' | 'ingredient';
  itemId?: string;
  batchId?: string;
  quantity: number;
}

export const applySaleDecrement = async (
  companyId: string,
  lineItems: SaleLineItem[]
): Promise<DecrementDetail[]> => {
  const decrements: DecrementDetail[] = [];

  for (const item of lineItems) {
    if (item.type === 'unit' || item.type === 'ingredient') {
      await decreaseItemStock(companyId, item.itemId, item.qty);
      decrements.push({
        type: 'stock',
        itemId: item.itemId,
        quantity: item.qty,
      });
    } else if (item.type === 'batch_portion') {
      try {
        const allBatches = await listBatches(companyId, item.recipeId);
        const batches = allBatches
          .filter(b => b.portions_left > 0)
          .sort((a, b) => {
            if (!a.expiry_date) return 1;
            if (!b.expiry_date) return -1;
            return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
          });

        let remainingQty = item.qty;

        const batchUpdates: Array<{ batchId: string; newPortions: number }> = [];

        for (const batch of batches) {
          if (remainingQty <= 0) break;

          const toDeduct = Math.min(batch.portions_left, remainingQty);
          const newPortions = batch.portions_left - toDeduct;

          batchUpdates.push({
            batchId: batch.id,
            newPortions,
          });

          remainingQty -= toDeduct;
        }

        if (remainingQty > 0) {
          if (!item.recipeId) {
            throw new Error(
              `No hay suficientes porciones disponibles. Faltan ${remainingQty} porciones.`
            );
          }

          const ingredients = await getRecipeIngredients(item.recipeId);

          const ingredientChecks: Array<{
            ingredientId: string;
            needed: number;
            available: number;
          }> = [];

          for (const ingredient of ingredients) {
            const available = await getItemStock(companyId, ingredient.ingredient_id);
            const needed = remainingQty * ingredient.quantity_needed;

            ingredientChecks.push({
              ingredientId: ingredient.ingredient_id,
              needed,
              available,
            });

            if (available < needed) {
              throw new Error(
                `Inventario insuficiente de ingredientes. Faltan ${
                  needed - available
                } unidades del ingrediente.`
              );
            }
          }

          for (const update of batchUpdates) {
            await updateBatchPortions(update.batchId, update.newPortions);
            decrements.push({
              type: 'batch',
              batchId: update.batchId,
              quantity: batches.find((b) => b.id === update.batchId)!.portions_left - update.newPortions,
            });
          }

          for (const check of ingredientChecks) {
            await decreaseItemStock(companyId, check.ingredientId, check.needed);
            decrements.push({
              type: 'ingredient',
              itemId: check.ingredientId,
              quantity: check.needed,
            });
          }
        } else {
          for (const update of batchUpdates) {
            await updateBatchPortions(update.batchId, update.newPortions);
            decrements.push({
              type: 'batch',
              batchId: update.batchId,
              quantity: batches.find((b) => b.id === update.batchId)!.portions_left - update.newPortions,
            });
          }
        }
      } catch (error) {
        throw error;
      }
    }
  }

  return decrements;
};
