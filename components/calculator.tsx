"use client"
import React, { useState, useMemo } from "react"
import { DetailedIssue, ItemType, ProjectStatusType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Calculator as CalcIcon, AlertCircle, CheckCircle2, ArrowRight, Info } from "lucide-react"

type Props = {
  statuses: ProjectStatusType[];
  filteredIssues: DetailedIssue[] | null;
  projectItems: ItemType[] | null;
};

/**
 * Universal Unit Conversion Matrix
 * Handles Weight, Length, Volume, Area, and Discrete units.
 */
const convertUnits = (quantity: number, from: string, to: string): number => {
  if (!from || !to || from === to) return quantity

  const m = {
    // Weight: Base is Gram
    GRAM: 1,
    KILOGRAM: 1000,
    TONNE: 1000000,
    // Length: Base is Meter
    METERS: 1,
    FEET: 0.3048,
    INCHES: 0.0254,
    // Discrete / Others: Base is 1
    PIECES: 1,
    UNITS: 1,
    SETS: 1,
    PACKETS: 1,
    LITRES: 1,
    SQUARE_METERS: 1,
    CUBIC_METERS: 1,
  }

  const fromFactor = m[from as keyof typeof m] || 1
  const toFactor = m[to as keyof typeof m] || 1

  return (quantity * fromFactor) / toFactor
};

const Calculator = ({ statuses, filteredIssues, projectItems }: Props) => {
  const [targetQuantity, setTargetQuantity] = useState<number>(1);

  const calculation = useMemo(() => {
    if (!projectItems || !filteredIssues) return { canBuild: 0, itemsStatus: [] };

    const itemsStatus = projectItems.map((item) => {
      // 1. Filter inventory specifically in "STORE"
      const storeIssues = filteredIssues.filter(
        (issue) => 
          issue.itemId === item.id && 
          issue.status?.name.toUpperCase() === "STORE"
      );

      const rawStockInStore = storeIssues.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

      // 2. Convert raw inventory units to production 'using' units
      const convertedStock = convertUnits(rawStockInStore, item.itemUnit, item.usingUnit);

      // 3. Calculate requirements based on 'usingQuantity' (Ratio)
      const ratioPerProduct = item.usingQuantity || 0;
      const totalRequired = targetQuantity * ratioPerProduct;
      const maxPossible = ratioPerProduct > 0 ? Math.floor(convertedStock / ratioPerProduct) : 0;

      return {
        ...item,
        rawStock: rawStockInStore,
        availableStock: convertedStock,
        totalRequired,
        maxPossible,
        shortage: Math.max(0, totalRequired - convertedStock),
      };
    });

    const canBuild = itemsStatus.length > 0 
      ? Math.min(...itemsStatus.map((i) => i.maxPossible)) 
      : 0;

    return { canBuild, itemsStatus };
  }, [projectItems, filteredIssues, targetQuantity]);

  return (
    <div className="p-1 space-y-8 min-h-screen text-slate-900 font-sans animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Light Glass Header */}
      <div className="relative p-7 rounded-[2.5rem] border border-white/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] overflow-hidden">
        {/* Amber Glow Geometry */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-200/30 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-100/40 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-100/80 rounded-2xl border border-amber-200 shadow-sm">
                <CalcIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">Production Calculator</h1>
            </div>
            <p className="text-slate-500 text-lg font-medium flex items-center gap-2">
              <Info className="w-4 h-4" /> Analyzing stock in <span className="text-amber-600 font-bold">STORE</span> 
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <Label className="text-slate-400 font-bold ml-1 uppercase tracking-widest text-[10px]">Plan Production Qty</Label>
            <div className="relative group">
              <Input
                type="number"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="h-16 bg-white/60 border-slate-200 text-3xl font-bold rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all shadow-inner px-6"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black tracking-tighter">PCS</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Result Card */}
        <Card className="xl:col-span-1 bg-white/60 backdrop-blur-xl border-white/80 rounded-[2.5rem] shadow-xl border-t-white">
          <CardHeader>
            <CardTitle className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black text-center">Feasibility Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="relative mb-6">
              <div className={`text-9xl font-black transition-colors duration-500 ${calculation.canBuild >= targetQuantity ? 'text-emerald-500' : 'text-amber-500'}`}>
                {calculation.canBuild}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-1000" 
                  style={{ width: `${Math.min((calculation.canBuild / targetQuantity) * 100, 100)}%` }} 
                />
              </div>
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Total Deliverable Units</p>

            <div className="w-full mt-10">
              {calculation.canBuild >= targetQuantity ? (
                <div className="flex items-center gap-4 p-6 rounded-[1.5rem] bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-bold">Inventory Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-6 rounded-[1.5rem] bg-rose-50 border border-rose-100 text-rose-700 shadow-sm">
                  <AlertCircle className="w-6 h-6" />
                  <span className="font-bold">Missing {targetQuantity - calculation.canBuild} Units</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Table */}
        <Card className="xl:col-span-2 bg-white/60 backdrop-blur-xl border-white/80 rounded-[2.5rem] shadow-xl">
          <CardHeader className="border-b border-slate-100/50 p-8">
            <CardTitle className="text-slate-700 font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-400" /> Component Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-[0.2em] bg-slate-50/50">
                    <th className="p-6 font-black">Item Details</th>
                    <th className="p-6 font-black">Stock (Store)</th>
                    <th className="p-6 font-black">Required ({targetQuantity})</th>
                    <th className="p-6 font-black">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculation.itemsStatus.map((item) => (
                    <tr key={item.id} className="group hover:bg-white/40 transition-all">
                      <td className="p-6">
                        <div>
                          <p className="font-bold text-slate-700">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">1 Unit = {item.usingQuantity} {item.usingUnit}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600">{item.rawStock}</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{item.itemUnit}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-400"><ArrowRight className="w-3 h-3"/></div>
                          <span className="font-bold text-slate-600">{Number.isInteger(item.totalRequired)?item.totalRequired:item.totalRequired.toFixed(4)} {item.usingUnit}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        {item.shortage > 0 ? (
                          <div className="inline-flex flex-col">
                            <span className="text-rose-500 font-black text-xs">SHORTAGE</span>
                            <span className="text-[10px] text-rose-400 font-bold">-{Number.isInteger(item.shortage)?item.shortage:item.shortage.toFixed(4)} {item.usingUnit}</span>
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black tracking-tighter">READY</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calculator;