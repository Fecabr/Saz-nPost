import { supabase } from '../lib/supabaseClient';

export interface Recipe {
  id: string;
  company_id: string;
  name: string;
  portions_per_batch: number;
  item_id: string | null;
  created_at: string;
}

export interface Batch {
  id: string;
  company_id: string;
  recipe_id: string;
  portions_left: number;
  expiry_date: string | null;
  created_at: string;
}

export interface CreateBatchInput {
  companyId: string;
  recipeId: string;
  portionsLeft: number;
  expiryDate?: string;
}

export interface Item {
  id: string;
  company_id: string;
  name: string;
  type: 'batch_portion' | 'unit' | 'ingredient';
  created_at: string;
}

export interface Stock {
  id: string;
  company_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity_needed: number;
  created_at: string;
}

export const listRecipes = async (companyId: string): Promise<Recipe[]> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching recipes:', error);
    throw new Error('Error al cargar las recetas');
  }

  return data as Recipe[];
};

export const listBatches = async (
  companyId: string,
  recipeId?: string
): Promise<Batch[]> => {
  let query = supabase
    .from('batches')
    .select('*')
    .eq('company_id', companyId);

  if (recipeId) {
    query = query.eq('recipe_id', recipeId);
  }

  const { data, error } = await query.order('expiry_date', { ascending: true });

  if (error) {
    console.error('Error fetching batches:', error);
    throw new Error('Error al cargar los lotes');
  }

  return data as Batch[];
};

export const createBatch = async (input: CreateBatchInput): Promise<Batch> => {
  const { data, error } = await supabase
    .from('batches')
    .insert({
      company_id: input.companyId,
      recipe_id: input.recipeId,
      portions_left: input.portionsLeft,
      expiry_date: input.expiryDate || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating batch:', error);
    throw new Error('Error al crear el lote');
  }

  return data as Batch;
};

export const updateBatchPortions = async (
  batchId: string,
  newPortionsLeft: number
): Promise<Batch> => {
  const { data, error } = await supabase
    .from('batches')
    .update({ portions_left: newPortionsLeft })
    .eq('id', batchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch portions:', error);
    throw new Error('Error al actualizar las porciones del lote');
  }

  return data as Batch;
};

export const getItemsByType = async (
  companyId: string,
  type: 'batch_portion' | 'unit' | 'ingredient'
): Promise<Item[]> => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('company_id', companyId)
    .eq('type', type)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching items by type:', error);
    throw new Error('Error al cargar los artículos');
  }

  return data as Item[];
};

export const getItemStock = async (
  companyId: string,
  itemId: string
): Promise<number> => {
  const { data, error } = await supabase
    .from('v_item_current_stock')
    .select('qty')
    .eq('company_id', companyId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching item stock:', error);
    throw new Error('Error al cargar el inventario del artículo');
  }

  return data?.qty ?? 0;
};

export const increaseItemStock = async (
  companyId: string,
  itemId: string,
  qty: number,
  note?: string
): Promise<void> => {
  const { error } = await supabase
    .from('item_stocks')
    .insert({
      company_id: companyId,
      item_id: itemId,
      quantity: qty,
      movement: 'in',
      note: note || null,
    });

  if (error) {
    console.error('Error increasing item stock:', error);
    throw new Error('Error al incrementar el inventario');
  }
};

export const decreaseItemStock = async (
  companyId: string,
  itemId: string,
  qty: number,
  note?: string
): Promise<void> => {
  const currentStock = await getItemStock(companyId, itemId);

  if (currentStock < qty) {
    throw new Error('Inventario insuficiente');
  }

  const { error } = await supabase
    .from('item_stocks')
    .insert({
      company_id: companyId,
      item_id: itemId,
      quantity: -qty,
      movement: 'out',
      note: note || null,
    });

  if (error) {
    console.error('Error decreasing item stock:', error);
    throw new Error('Error al reducir el inventario');
  }
};

export const getRecipeIngredients = async (
  recipeId: string
): Promise<RecipeIngredient[]> => {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId);

  if (error) {
    console.error('Error fetching recipe ingredients:', error);
    throw new Error('Error al cargar los ingredientes de la receta');
  }

  return data as RecipeIngredient[];
};

export interface RegisterWastageInput {
  companyId: string;
  sourceType: 'batch' | 'item';
  sourceId: string;
  qty: number;
  reason: 'sobrante' | 'desecho' | 'cortesía' | 'ajuste';
}

export const registerWastage = async (input: RegisterWastageInput): Promise<void> => {
  const { companyId, sourceType, sourceId, qty, reason } = input;

  if (qty <= 0) {
    throw new Error('La cantidad debe ser mayor a cero');
  }

  if (sourceType === 'batch') {
    const { data: batch, error: fetchError } = await supabase
      .from('batches')
      .select('portions_left')
      .eq('id', sourceId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching batch:', fetchError);
      throw new Error('Error al obtener información del lote');
    }

    if (!batch) {
      throw new Error('El lote no existe');
    }

    const newPortionsLeft = Math.max(0, batch.portions_left - qty);

    const { error: updateError } = await supabase
      .from('batches')
      .update({ portions_left: newPortionsLeft })
      .eq('id', sourceId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating batch portions:', updateError);
      throw new Error('Error al actualizar las porciones del lote');
    }
  } else if (sourceType === 'item') {
    const currentStock = await getItemStock(companyId, sourceId);
    const newQuantity = Math.max(0, currentStock - qty);

    const { data: existingStock } = await supabase
      .from('stocks')
      .select('id')
      .eq('company_id', companyId)
      .eq('item_id', sourceId)
      .maybeSingle();

    if (!existingStock) {
      throw new Error('No existe inventario para este artículo');
    }

    const { error: updateError } = await supabase
      .from('stocks')
      .update({ quantity: newQuantity })
      .eq('id', existingStock.id);

    if (updateError) {
      console.error('Error updating item stock:', updateError);
      throw new Error('Error al actualizar el inventario del artículo');
    }
  }

  const { error: insertError } = await supabase
    .from('wastages')
    .insert({
      company_id: companyId,
      source_type: sourceType,
      source_id: sourceId,
      qty,
      reason,
    });

  if (insertError) {
    console.error('Error inserting wastage:', insertError);
    throw new Error('Error al registrar la merma');
  }
};
