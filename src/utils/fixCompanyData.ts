import { supabase } from '../lib/supabaseClient';

export async function fixCompanyData(companyId: string) {
  try {
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .or(`company_id.is.null,company_id.neq.${companyId}`);

    if (itemsError) throw itemsError;

    if (items && items.length > 0) {
      const validTypes = ['batch_portion', 'unit', 'ingredient'];
      const updates = items.map((item) => ({
        id: item.id,
        company_id: companyId,
        type: validTypes.includes(item.type) ? item.type : 'unit',
        active: true,
      }));

      for (const update of updates) {
        await supabase
          .from('items')
          .update({
            company_id: update.company_id,
            type: update.type,
            active: update.active,
          })
          .eq('id', update.id);
      }
    }

    const { data: itemStocks, error: itemStocksError } = await supabase
      .from('item_stocks')
      .select('*')
      .or(`company_id.is.null,company_id.neq.${companyId}`);

    if (itemStocksError) throw itemStocksError;

    if (itemStocks && itemStocks.length > 0) {
      for (const stock of itemStocks) {
        await supabase
          .from('item_stocks')
          .update({ company_id: companyId })
          .eq('id', stock.id);
      }
    }

    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .or(`company_id.is.null,company_id.neq.${companyId}`);

    if (recipesError) throw recipesError;

    if (recipes && recipes.length > 0) {
      for (const recipe of recipes) {
        await supabase
          .from('recipes')
          .update({ company_id: companyId })
          .eq('id', recipe.id);

        if (!recipe.item_id) {
          const { data: existingItem } = await supabase
            .from('items')
            .select('id')
            .eq('company_id', companyId)
            .eq('type', 'batch_portion')
            .eq('name', recipe.name)
            .maybeSingle();

          let itemId = existingItem?.id;

          if (!itemId) {
            const { data: newItem, error: newItemError } = await supabase
              .from('items')
              .insert({
                company_id: companyId,
                name: recipe.name,
                type: 'batch_portion',
                active: true,
                price: 0,
              })
              .select('id')
              .single();

            if (newItemError) throw newItemError;
            itemId = newItem.id;
          }

          await supabase
            .from('recipes')
            .update({ item_id: itemId })
            .eq('id', recipe.id);
        }
      }
    }

    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('*')
      .or(`company_id.is.null,company_id.neq.${companyId}`);

    if (batchesError) throw batchesError;

    if (batches && batches.length > 0) {
      for (const batch of batches) {
        await supabase
          .from('batches')
          .update({ company_id: companyId })
          .eq('id', batch.id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error fixing company data:', error);
    throw error;
  }
}
