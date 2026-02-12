// Inventory dashboard
// import statuses from "@/data/status.json";
import { ComponentProcessMap, DetailedIssue, ItemType, ProjectStatusType } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
type Prop = {
    filteredIssues: DetailedIssue[] | null
    statuses: ProjectStatusType[]
    mainItemProduced: ItemType
}
const Inventory = ({ filteredIssues, statuses, mainItemProduced }: Prop) => {
    const items = [...new Set(filteredIssues?.map(d => d.item.name))];
    const inventoryDashboard: ComponentProcessMap = {};
    filteredIssues?.forEach(i => {
        const n = i.item.name;
        const rv = i.item.reorderValue;
        const s = i.status;
        const q = i.quantity
        if (!inventoryDashboard[n]) {
            inventoryDashboard[n] = {};
        }
        if (!inventoryDashboard[n][s['key']]) {
            inventoryDashboard[n][s['key']] = 0;
            inventoryDashboard[n]["REORDER_VALUE"] = rv;
        }
        inventoryDashboard[n][s['key']] += q;
    });

    //  this is the inventory Dashboard structure
    //  {
    //     "TABLE BASE": {
    //       "PURCHASE": 40,
    //       "STORE": 30,
    //       "BUFFING": 30
    //     },
    //     "GEAR BOX": {
    //       "PURCHASE": 20,
    //       "ASSEMBLY": 10
    //     }
    //   }

    const STAGE_STYLES = {
        STORE: "bg-amber-100 text-amber-700 border-amber-200",
        SALES: "bg-green-100 text-green-700 border-green-200",
        PURCHASE: "bg-blue-100 text-blue-700 border-blue-200",
        TODO: "bg-purple-100 text-purple-700 border-purple-200",
        DEFAULT: "bg-gray-100 text-gray-700 border-gray-200",
    };


    return (
        <>
            <div className="rounded-3xl overflow-hidden bg-white/70 backdrop-blur-2xl  border border-white/50 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-175">
                        <thead>
                            <tr className="border-b border-gray-200/50">
                                <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">Item</th>
                                {statuses.map(stage => (
                                    <th
                                        key={stage.key}
                                        className={`
                             px-6 py-2 text-center text-xs font-semibold uppercase tracking-wider
                             rounded-full 
                             ${STAGE_STYLES[stage.key as keyof typeof STAGE_STYLES] || STAGE_STYLES.DEFAULT}
                           `}
                                    >
                                        {stage.key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/60">
                            {filteredIssues && filteredIssues.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-4 text-center">
                                        <div className="max-w-md mx-auto">
                                            <div className="text-7xl mb-6 text-gray-150">📂</div>
                                            <p className="text-xl font-medium text-gray-700">All clear</p>
                                            <p className="text-base text-gray-500 mt-3">
                                                No issues in this sprint yet. Create one to get started.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => {
                                    const quantityInStore = inventoryDashboard[item]?.["STORE"] || 0;
                                    const isLowStock = quantityInStore <= inventoryDashboard[item]?.["REORDER_VALUE"];
                                    const isMain = item === mainItemProduced.name
                                    
                                    return (
                                        <tr key={item} className={`group hover:bg-white/10 border-b border-white/5 transition-all duration-500 ease-out ${isMain ? 'bg-rose-500/5' : ''}`}>
                                            <td className={`px-8 py-6 font-medium`}>
                                                <div className="flex items-center gap-4">
                                                    <span className="tracking-wide">{item}</span>
                                                    {isLowStock && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                            <span className="
                                                            relative
                                                            px-3 
                                                            py-1 
                                                            text-[10px] 
                                                            font-bold 
                                                            uppercase 
                                                            tracking-widest
                                                            text-red-500
                                                            bg-amber-500/10
                                                            border border-red-500/30
                                                            rounded-full
                                                            backdrop-blur-md
                                                            shadow-[0_0_15px_rgba(245,158,11,0.2)]
                                                            animate-pulse
                                                            before:content-['']
                                                            before:absolute
                                                            before:inset-0
                                                            before:rounded-full
                                                            before:bg-amber-400/5
                                                            group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]
                                                            transition-shadow
                                                            duration-500
                                                        ">
                                                            Low Stock
                                                        </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Reorder value = {inventoryDashboard[item]?.["REORDER_VALUE"]}</p>
                                                                <p>Stock in Store = {inventoryDashboard[item]?.["STORE"] ?? 0}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </td>
                                            {statuses.map(stage => (
                                                <td key={stage.key} className="px-8 py-6 text-center font-mono transition-colors duration-300">
                                                    {inventoryDashboard[item]?.[stage.key] ?? '.'}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}
export default Inventory;