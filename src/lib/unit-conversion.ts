export type InventoryUnit = 'g' | 'kg' | 'ml' | 'l' | 'unidad' | 'paquete';

type UnitGroup = 'mass' | 'volume' | 'count' | 'package';

const UNIT_ALIASES: Record<string, InventoryUnit> = {
  g: 'g',
  gr: 'g',
  gram: 'g',
  gramos: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogramo: 'kg',
  kilogramos: 'kg',
  ml: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  l: 'l',
  lt: 'l',
  litro: 'l',
  litros: 'l',
  unidad: 'unidad',
  unidades: 'unidad',
  unid: 'unidad',
  paquete: 'paquete',
  paquetes: 'paquete',
};

const UNIT_GROUPS: Record<InventoryUnit, UnitGroup> = {
  g: 'mass',
  kg: 'mass',
  ml: 'volume',
  l: 'volume',
  unidad: 'count',
  paquete: 'package',
};

function normalizeUnitKey(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizeInventoryUnit(unit?: string | null): InventoryUnit | null {
  if (!unit) return null;
  return UNIT_ALIASES[normalizeUnitKey(unit)] ?? null;
}

function getUnitFactor(unit: InventoryUnit): number {
  switch (unit) {
    case 'kg':
      return 1000;
    case 'g':
      return 1;
    case 'l':
      return 1000;
    case 'ml':
      return 1;
    case 'unidad':
      return 1;
    case 'paquete':
      return 1;
  }
}

export function convertInventoryQuantity(
  quantity: number,
  fromUnit?: string | null,
  toUnit?: string | null
): number | null {
  const normalizedFrom = normalizeInventoryUnit(fromUnit);
  const normalizedTo = normalizeInventoryUnit(toUnit);

  if (!normalizedFrom || !normalizedTo) return null;

  if (UNIT_GROUPS[normalizedFrom] !== UNIT_GROUPS[normalizedTo]) {
    return null;
  }

  const quantityInBase = quantity * getUnitFactor(normalizedFrom);
  return quantityInBase / getUnitFactor(normalizedTo);
}