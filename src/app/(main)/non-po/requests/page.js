"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../../_components/card";
import HeaderNavBar from '@/app/_components/headerNavBar';
import { useAuth } from "@/utils/authContext";

const initialLines = [
    { id: 1, description: "Trainer professional fee", budgetCode: "TRN-PROF", acct: "6510", costCenter: "HR-OD", location: "Head Office", amount: 60000, ewt: "10% WC010" },
    { id: 2, description: "Hotel / venue", budgetCode: "TRN-VENUE", acct: "6520", costCenter: "HR-OD", location: "Head Office", amount: 20000, ewt: "5% WC100" },
    { id: 3, description: "Meals", budgetCode: "TRN-MEALS", acct: "6530", costCenter: "HR-OD", location: "Head Office", amount: 12000, ewt: "" },
    { id: 4, description: "Materials (Cebu)", budgetCode: "TRN-MATL", acct: "6540", costCenter: "SALES-VIS", location: "Cebu", amount: 8000, ewt: "" },
];

function parseEwtPercent(ewtString) {
    if (!ewtString) return 0;
    const m = ewtString.match(/(\d+(?:\.\d+)?)%/);
    return m ? parseFloat(m[1]) : 0;
}

function formatNumber(value) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Page() {
    const { darkMode } = useAuth();
    const [lines] = useState(initialLines);

    const [expenseCategory, setExpenseCategory] = useState("Manpower / training");
    
    const grossTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0), [lines]);
    const ewtTotal = useMemo(
        () => lines.reduce((s, l) => s + ((Number(l.amount) || 0) * (parseEwtPercent(l.ewt) / 100)), 0),
        [lines]
    );
    const netPayable = grossTotal - ewtTotal;

    return (
        <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <HeaderNavBar />
            <div className={`flex-1 overflow-y-auto pt-14 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="w-full mx-auto p-3 sm:p-4 md:p-6">

                    <CardHeader>
                        <CardTitle className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>New request for payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4 md:grid-cols-4 mb-4">
                            <div>
                                <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payee</label>
                                <input type="text" value="Training Solutions Inc." className={`${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-400 text-gray-900'} p-3 rounded-md w-full`} readOnly />
                            </div>
                            <div>
                                <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Expense category</label>
                                <select
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    className={`${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-400 text-gray-900'} p-3 rounded-md w-full`}
                                >
                                    <option value="Manpower / training">Manpower / training</option>
                                    <option value="Office supplies">Office supplies</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Travel">Travel</option>
                                    <option value="Professional fees">Professional fees</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Cost center (default)</label>
                                <input type="text" value="HR-OD" className={`${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-400 text-gray-900'} p-3 rounded-md w-full`} readOnly />
                            </div>
                            <div>
                                <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Location (default)</label>
                                <input type="text" value="Head Office" className={`${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-400 text-gray-900'} p-3 rounded-md w-full`} readOnly />
                            </div>

                            <div>
                                <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payment terms</label>
                                <input type="text" value="Bank transfer" className={`${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-400 text-gray-900'} p-3 rounded-md w-full`} readOnly />
                            </div>
                            <div>
                                <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payee TIN</label>
                                <input type="text" value="234-567-890" className={`${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-400 text-gray-900'} p-3 rounded-md w-full`} readOnly />
                            </div>
                        </div>

                        <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Line items (per-line budget code, cost center, location &amp; EWT)</h3>

                        <div className="overflow-x-auto">
                            <table className="w-full table-auto border-separate [border-spacing:0 8px]">
                                <thead>
                                    <tr>
                                        <th className="text-left bg-[#163c66] text-white p-3">#</th>
                                        <th className="text-left bg-[#163c66] text-white p-3">Description</th>
                                        <th className="text-left bg-[#163c66] text-white p-3">Budget code</th>
                                        <th className="text-left bg-[#163c66] text-white p-3">Acct</th>
                                        <th className="text-left bg-[#163c66] text-white p-3">Cost center</th>
                                        <th className="text-left bg-[#163c66] text-white p-3">Location</th>
                                        <th className="text-right bg-[#163c66] text-white p-3">Amount</th>
                                        <th className="text-left bg-[#163c66] text-white p-3">EWT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, index) => (
                                        <tr key={line.id} className={`mb-2 ${index % 2 === 1 ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : (darkMode ? 'bg-gray-800' : 'bg-card')}`}>
                                            <td className="p-3 align-middle text-sm">{line.id}</td>
                                            <td className="p-3 align-middle text-sm">{line.description}</td>
                                            <td className="p-3 align-middle text-sm font-mono">{line.budgetCode}</td>
                                            <td className="p-3 align-middle text-sm">{line.acct}</td>
                                            <td className="p-3 align-middle text-sm">{line.costCenter}</td>
                                            <td className="p-3 align-middle text-sm">{line.location}</td>
                                            <td className="p-3 align-middle text-sm text-right">{formatNumber(line.amount)}</td>
                                            <td className="p-3 align-middle text-sm">{line.ewt || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex gap-3">
                                <button className={`px-15 py-2 font-bold rounded-md border ${darkMode ? 'border-gray-600' : 'border-gray-400'}`}>Save draft</button>
                                <button className={`px-15 py-2 font-bold rounded-md text-white ${darkMode ? 'bg-[#1f4d82]' : 'bg-[#163c66]'}`}>Submit request</button>
                            </div>

                            <div className="w-full max-w-sm ml-auto">
                                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3">
                                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gross total</span>
                                    <span className={`text-sm text-right ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{formatNumber(grossTotal)}</span>

                                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>EWT withheld (total)</span>
                                    <span className={`text-sm text-right ${darkMode ? 'text-red-400' : 'text-red-500'}`}>- {formatNumber(ewtTotal)}</span>

                                    <span className={`text-sm font-semibold pt-2 border-t ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Net payable</span>
                                    <span className={`text-sm font-semibold text-right pt-2 border-t ${darkMode ? 'text-blue-400' : 'text-primary'}`}>
                                        {formatNumber(netPayable)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardFooter>


                    <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Cost center &amp; location default from the header; any line can override (e.g. line 4 → SALES-VIS / Cebu). EWT is set per line — only taxable lines are withheld.</p>
                </div>

            </div>
        </div>
    );
}

