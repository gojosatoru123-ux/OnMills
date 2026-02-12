// Shared Table Component (used on both mobile and large screens)
// import statuses from "@/data/status.json";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DetailedIssue, ProjectStatusType } from "@/lib/types";
type Prop = {
    filteredIssues:DetailedIssue[] | null
    statuses:ProjectStatusType[]
}
const IssuesTable = ({filteredIssues, statuses}:Prop) => (
    <div className="rounded-3xl overflow-hidden bg-white/70 backdrop-blur-2xl  border border-white/50 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="overflow-x-auto">
            <table className="w-full min-w-175">
                {/* Header */}
                <thead>
                    <tr className="border-b border-gray-200/50">
                        <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Issue
                        </th>
                        <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Status
                        </th>
                        <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Quantity
                        </th>
                        <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Priority
                        </th>
                        <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Assignee
                        </th>
                    </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-gray-100/60">
                    {filteredIssues && filteredIssues.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="py-4 text-center">
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
                        filteredIssues?.map((issue) => (
                            <tr
                                key={issue.id}
                                className={`hover:bg-white/40 transition-all duration-300 ${issue.item.isMainProduct ? 'bg-red-500/5 border-l-4 border-red-500/50' : ''}`}
                            >
                                {/* Issue Title */}
                                <td className="px-8 py-6">
                                    <div className="text-base font-medium text-gray-900 leading-snug">
                                        {issue.item.name}
                                    </div>
                                </td>

                                {/* Status – Apple-style soft pill */}
                                <td className="px-8 py-6">
                                    <div
                                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${issue.status.name === "SALES"
                                                ? "bg-green-100/80 text-green-700"
                                                : issue.status.name === "PURCHASE"
                                                    ? "bg-blue-100/80 text-blue-700"
                                                    : issue.status.name === "TODO"
                                                        ? "bg-purple-100/80 text-purple-700"
                                                        : "bg-gray-100/80 text-gray-700"
                                            }`}
                                    >
                                        {statuses.find((s) => s.id === issue.statusId)?.name || issue.statusId}
                                    </div>
                                </td>

                                <td className="px-8 py-6">
                                    <div className="text-base font-medium text-gray-900 leading-snug">
                                        {issue.quantity} <span className="text-gray-500 text-sm">{issue.item.itemUnit}</span>
                                    </div>
                                </td>

                                {/* Priority – Clean dot + text */}
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-2.5 h-2.5 rounded-full
                          ${issue.priority === "URGENT" ? "bg-red-500" :
                                                    issue.priority === "HIGH" ? "bg-orange-500" :
                                                        issue.priority === "MEDIUM" ? "bg-amber-500" :
                                                            "bg-green-500"}`}
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            {issue.priority}
                                        </span>
                                    </div>
                                </td>

                                {/* Assignee – Elegant avatar + name */}
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        {issue.assignee ? (
                                            <>
                                                <div className="relative">

                                                    <Avatar className="h-8 w-8 border border-white/10 rounded-full"><AvatarImage src={issue.assignee.profileImageUrl || ""} /><AvatarFallback className="bg-white font-black">{issue.assignee.name?.[0]}</AvatarFallback></Avatar>

                                                    <div className="absolute inset-0 rounded-2xl ring-4 ring-white/60" />
                                                </div>
                                                <span className="font-medium text-gray-800">
                                                    {issue.assignee.name}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-2xl bg-gray-200/70 flex items-center justify-center">
                                                    <span className="text-gray-400 text-lg">◦</span>
                                                </div>
                                                <span className="text-gray-500 font-medium">Unassigned</span>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);
export default IssuesTable;