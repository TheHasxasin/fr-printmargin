// FR PrintMargin — pengiraan tulen, tiada pergantungan luar.
export const n = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};
export const positiveQty = (v) => Math.max(1, Math.floor(n(v)));
export const ceilTo = (value, increment = 0.01) => {
  if (!Number.isFinite(value)) return 0;
  const step = n(increment) || 0.01;
  return Number((Math.ceil((value - 1e-10) / step) * step).toFixed(10));
};
export const money = (amount) => `RM ${Number(amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fixed = (value, decimals = 2) => Number(value || 0).toLocaleString('en-MY', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
export const computePricing = (unitCost, qty, targetMargin, rounding, manualPrice = 0) => {
  const quantity = positiveQty(qty);
  const cost = n(unitCost);
  const target = Math.min(95, n(targetMargin));
  const basePrice = cost / (1 - target / 100);
  const suggested = ceilTo(basePrice, n(rounding) || 0.01);
  const custom = n(manualPrice);
  const salePrice = custom > 0 ? custom : suggested;
  const totalCost = cost * quantity;
  const revenue = salePrice * quantity;
  const profit = revenue - totalCost;
  return {
    qty: quantity, unitCost: cost, totalCost, suggested, salePrice, revenue, profit,
    profitPerUnit: salePrice - cost,
    margin: revenue > 0 ? profit / revenue * 100 : 0,
    markup: totalCost > 0 ? profit / totalCost * 100 : 0,
    target, isManual: custom > 0
  };
};
export const calcMargin = (v) => {
  const qty = positiveQty(v.qty);
  const type = v.mode === 'inhouse' ? 'inhouse' : 'outsource';
  const production = type === 'inhouse' ? n(v.material) + n(v.ink) + n(v.machine) : n(v.factory);
  const unitCost = production + n(v.packaging) + (n(v.delivery) + n(v.design) + n(v.overhead)) / qty;
  return { ...computePricing(unitCost, qty, v.target, v.rounding, v.manualPrice), production, type };
};
const TO_FEET = { ft: 1, in: 1/12, cm: 1/30.48, mm: 1/304.8, m: 1/0.3048 };
export const calcSize = (v) => {
  const qty = positiveQty(v.qty);
  const factor = TO_FEET[v.unit] || 1;
  const sqft = n(v.width) * n(v.height) * factor * factor;
  const sqm = sqft * 0.09290304;
  const withWaste = sqft * (1 + n(v.waste) / 100);
  const billedArea = Math.max(n(v.minArea), ceilTo(withWaste, n(v.areaStep) || 0.01));
  const unitCost = billedArea * n(v.rate) + n(v.finishing) + (n(v.delivery) + n(v.design)) / qty;
  return {
    ...computePricing(unitCost, qty, v.target, v.rounding), sqft, sqm, billedArea,
    isValid: n(v.width) > 0 && n(v.height) > 0,
    productionTotal: billedArea * n(v.rate) * qty
  };
};
export const SHEET_SIZES = {
  A4: [210, 297], A3: [297, 420], A5: [148, 210], SRA3: [320, 450]
};
export const calcSticker = (v) => {
  const sheetSize = SHEET_SIZES[v.paper] || [n(v.paperWidth), n(v.paperHeight)];
  const [paperW, paperH] = sheetSize;
  const margin = n(v.margin);
  const gap = n(v.gap);
  const bleed = n(v.bleed);
  const isCircle = v.shape === 'circle';
  const width = n(v.stickerWidth);
  const height = isCircle ? width : n(v.stickerHeight);
  const usableW = Math.max(0, paperW - margin * 2);
  const usableH = Math.max(0, paperH - margin * 2);
  const outerW = width + bleed * 2;
  const outerH = height + bleed * 2;
  const calculateFit = (itemW, itemH) => {
    if (!(itemW > 0 && itemH > 0)) return { cols: 0, rows: 0, count: 0 };
    const cols = Math.max(0, Math.floor((usableW + gap + 1e-9) / (itemW + gap)));
    const rows = Math.max(0, Math.floor((usableH + gap + 1e-9) / (itemH + gap)));
    return { cols, rows, count: cols * rows };
  };
  const normal = calculateFit(outerW, outerH);
  const rotated = calculateFit(outerH, outerW);
  const useRotated = rotated.count > normal.count;
  const best = useRotated ? rotated : normal;
  const perSheet = best.count;
  const qty = positiveQty(v.qty);
  const reserveQty = Math.ceil(qty * (1 + n(v.reserve) / 100));
  const sheets = perSheet ? Math.ceil(reserveQty / perSheet) : 0;
  const costPerSheet = n(v.paperCost) + n(v.inkCost) + n(v.laminateCost) + n(v.cutCost);
  const totalCost = sheets * costPerSheet + n(v.setupCost);
  const unitCost = totalCost / qty;
  const pricing = computePricing(unitCost, qty, v.target, v.rounding);
  return {
    ...pricing, paperW, paperH, usableW, usableH, width, height, outerW, outerH,
    margin, gap, bleed, isCircle, perSheet, normal, rotated, useRotated, cols: best.cols, rows: best.rows,
    tileW: useRotated ? outerH : outerW, tileH: useRotated ? outerW : outerH,
    reserveQty, sheets, costPerSheet, leftover: sheets * perSheet - qty,
    isValid: paperW > 0 && paperH > 0 && width > 0 && height > 0 && usableW > 0 && usableH > 0 && perSheet > 0
  };
};
