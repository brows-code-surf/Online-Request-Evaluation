"use client";

import React, { useState, useEffect } from "react";
import { CardHeader, CardTitle, CardContent, CardFooter } from "../../../../_components/card";
import BudgetModal from "../../../_components/BudgetModal";
import ConfirmModal from "../../../_components/confirmModal";
import SuccessModal from "../../../_components/successModal";
import { useAuth } from "@/utils/authContext";
import { getAllPaymentTerms, getLatestReferenceNo, saveRFPDetails } from "../index";

function parseEwtPercent(ewtString) {
    if (!ewtString) return 0;
    const m = ewtString.match(/(\d+(?:\.\d+)?)%/);
    return m ? parseFloat(m[1]) : 0;
}

function formatNumber(value) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EWT_OPTIONS = ["", "2% WC158", "5% WC100", "10% WC010", "15% WC160"];
const LOCATION_OPTIONS = ["Head Office", "Cebu", "Manila", "Davao"];
const COST_CENTER_OPTIONS = ["","HR-OD", "SALES-VIS", "MARKETING"];

export default function CreateRFPRequest({ darkMode, onRequestSaved }) {
    const { user } = useAuth();
    const [lines, setLines] = useState([{ id: 1, description: "", budgetCode: "", acct: "", costCenter: "", location: "", amount: 0, ewt: "" }]);
    const [budgetModalFor, setBudgetModalFor] = useState(null);
    const [focusLineId, setFocusLineId] = useState(null);

    const [paymentTerms, setPaymentTerms] = useState([]);
    const [paymentTerm, setPaymentTerm] = useState("");
    const [costCenter, setCostCenter] = useState("");
    const [location, setLocation] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [payee, setPayee] = useState("");
    const [payeeTIN, setPayeeTIN] = useState("");
    const [referenceNo, setReferenceNo] = useState("");
    const [showErrors, setShowErrors] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successAction, setSuccessAction] = useState(null);

    const [grossTotal, ewtTotal, netPayable] = (() => {
        const gross = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
        const ewt = lines.reduce((sum, line) => sum + (Number(line.amount) * parseEwtPercent(line.ewt) / 100), 0);
        return [gross, ewt, gross - ewt];
    })();

    const loadReferenceNo = async () => {
        try {
            const result = await getLatestReferenceNo();
            if (result.success && result.referenceNo) setReferenceNo(result.referenceNo);
        } catch (error) {
            console.error('Error loading reference number:', error);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const result = await getLatestReferenceNo();
                if (result.success && result.referenceNo) setReferenceNo(result.referenceNo);
            } catch (error) {
                console.error('Error loading reference number:', error);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const loadPaymentTerms = async () => {
            try {
                const result = await getAllPaymentTerms();
                if (result.success) setPaymentTerms(result.paymentTerms);
            } catch (error) {
                console.error('Error loading payment terms:', error);
            }
        };
        loadPaymentTerms();
    }, []);

    const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

    const fieldCls = (hasError) =>
        `${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-stone-200 text-gray-900'} p-3 rounded-md w-full border-2 ${hasError ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-stone-400'}`;

    const lineCls = (hasError) =>
        `w-full px-2 py-1.5 text-sm bg-transparent border-0 rounded focus:outline-none focus:ring-1 ${hasError ? 'ring-1 ring-red-500' : 'focus:ring-blue-500'} ${darkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`;

    const updateLine = (id, field, value) => {
        setLines(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)));
    };

    const addLine = () => {
        const newId = lines.length ? Math.max(...lines.map(l => l.id)) + 1 : 1;
        setLines(prev => [...prev, { id: newId, description: "", budgetCode: "", acct: "", costCenter: "", location: "", amount: 0, ewt: "" }]);
        setFocusLineId(newId);
    };

    const removeLine = (id) => {
        setLines(prev => prev.filter(l => l.id !== id));
    };

    const handleLineKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addLine();
        }
    };

    const isFormValid = () => {
        const headerValid = !isEmpty(payee)
            && !isEmpty(expenseCategory)
            && !isEmpty(costCenter)
            && !isEmpty(location)
            && !isEmpty(payeeTIN)
            && (paymentTerms.length === 0 || !isEmpty(paymentTerm));
        const linesValid = lines.every(l =>
            !isEmpty(l.description)
            && !isEmpty(l.budgetCode)
            && !isEmpty(l.acct)
            && !isEmpty(l.costCenter)
            && !isEmpty(l.location)
            && Number(l.amount) > 0
        );
        return headerValid && linesValid;
    };

    const handleActionClick = (action) => {
        setShowErrors(true);
        if (isFormValid()) setPendingAction(action);
    };

    const handleConfirm = async () => {
        const action = pendingAction;
        setPendingAction(null);

        const payload = {
            referenceNo,
            rfpStatus: action === "submit" ? "SUBMITTED" : "DRAFT",
            payee,
            expenseCategory,
            costCenter,
            location,
            paymentTerms: paymentTerm,
            payeeTIN,
            createdBy: user?.empName || "",
            dateCreated: new Date().toISOString(),
            lines: lines.map(l => ({
                description: l.description,
                budgetCode: l.budgetCode,
                acct: l.acct,
                costCenter: l.costCenter,
                location: l.location,
                amount: l.amount,
                ewt: l.ewt
            }))
        };

        try {
            const result = await saveRFPDetails(payload);
            if (result.success) {
                setSuccessAction(action);
                resetForm();
                setShowSuccess(true);
                onRequestSaved?.();
            } else {
                console.error('Save failed:', result.message);
            }
        } catch (error) {
            console.error('Error saving RFP request:', error);
        }
    };

    const resetForm = () => {
        setLines([{ id: 1, description: "", budgetCode: "", acct: "", costCenter: "", location: "", amount: 0, ewt: "" }]);
        setPayee("");
        setPayeeTIN("");
        setExpenseCategory("");
        setCostCenter("");
        setLocation("");
        setPaymentTerm("");
        setShowErrors(false);
        setFocusLineId(null);
        loadReferenceNo();
    };

    return (
        <div className="w-full mx-auto p-3 sm:p-4 md:p-6">
            <CardHeader>
                <div className="flex items-center justify-between w-full">
                    <CardTitle className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>New request for payment</CardTitle>
                    <span className={`px-4 py-1.5 text-sm font-mono font-bold rounded-md ${darkMode ? 'bg-blue-600 text-white' : 'bg-[#163c66] text-white'} shadow-md`}>
                        {referenceNo || 'RFP-00000000'}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-4 md:grid-cols-4 mb-4">
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payee</label>
                        <input type="text" value={payee} className={fieldCls(showErrors && isEmpty(payee))}
                            onChange={(e) => setPayee(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Expense category</label>
                        <select
                            value={expenseCategory}
                            onChange={(e) => setExpenseCategory(e.target.value)}
                            className={fieldCls(showErrors && isEmpty(expenseCategory))}
                        >
                            <option></option>
                            <option value="Manpower / training">Manpower / training</option>
                            <option value="Office supplies">Office supplies</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Travel">Travel</option>
                            <option value="Professional fees">Professional fees</option>
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Cost center (default)</label>
                        <select
                            value={costCenter}
                            onChange={(e) => setCostCenter(e.target.value)}
                            className={fieldCls(showErrors && isEmpty(costCenter))}
                        >
                            {COST_CENTER_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Location (default)</label>
                        <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className={fieldCls(showErrors && isEmpty(location))}
                        >
                            <option value=""></option>
                            {LOCATION_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payment terms</label>
                        <select
                            value={paymentTerm}
                            onChange={(e) => setPaymentTerm(e.target.value)}
                            className={fieldCls(showErrors && paymentTerms.length > 0 && isEmpty(paymentTerm))}
                        >
                            <option value=""></option>
                            {paymentTerms.map((pt) => (
                                <option key={pt.id ?? pt.paymentTermId} value={pt.paymentTermId}>
                                    {pt.paymentTermId}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payee TIN</label>
                        <input type="text" value={payeeTIN} className={fieldCls(showErrors && isEmpty(payeeTIN))}
                            onChange={(e) => setPayeeTIN(e.target.value)}
                        />
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
                            {lines.map((line, index) => {
                                const rowBg = index % 2 === 1
                                    ? (darkMode ? 'bg-stone-700' : 'bg-stone-100')
                                    : (darkMode ? 'bg-gray-800' : 'bg-card');
                                return (
                                    <tr key={line.id} className={rowBg}>
                                        <td className="p-2 align-middle text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 text-center">{line.id}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(line.id)}
                                                    title="Remove line"
                                                    className={`px-2 py-1 rounded-md text-base leading-none transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.description}
                                                autoFocus={focusLineId === line.id}
                                                onChange={(e) => updateLine(line.id, "description", e.target.value)}
                                                onKeyDown={handleLineKeyDown}
                                                placeholder="Description"
                                                className={lineCls(showErrors && isEmpty(line.description))}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={line.budgetCode}
                                                    placeholder="Select"
                                                    onClick={() => setBudgetModalFor(line.id)}
                                                    onKeyDown={handleLineKeyDown}
                                                    className={`${lineCls(showErrors && isEmpty(line.budgetCode))} cursor-pointer font-mono`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setBudgetModalFor(line.id)}
                                                    title="Choose budget account"
                                                    className={`px-2 py-2 rounded-md text-xs whitespace-nowrap transition-colors ${darkMode ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-stone-300'}`}
                                                >
                                                    …
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.acct}
                                                onChange={(e) => updateLine(line.id, "acct", e.target.value)}
                                                onKeyDown={handleLineKeyDown}
                                                placeholder="Acct"
                                                className={lineCls(showErrors && isEmpty(line.acct))}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.costCenter}
                                                onChange={(e) => updateLine(line.id, "costCenter", e.target.value)}
                                                onKeyDown={handleLineKeyDown}
                                                placeholder="Cost center"
                                                className={lineCls(showErrors && isEmpty(line.costCenter))}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.location}
                                                onChange={(e) => updateLine(line.id, "location", e.target.value)}
                                                onKeyDown={handleLineKeyDown}
                                                placeholder="Location"
                                                className={lineCls(showErrors && isEmpty(line.location))}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="number"
                                                value={line.amount}
                                                onChange={(e) => updateLine(line.id, "amount", parseFloat(e.target.value) || 0)}
                                                onKeyDown={handleLineKeyDown}
                                                placeholder="0.00"
                                                    className={`${lineCls(showErrors && !(Number(line.amount) > 0))} text-right`}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <select
                                                value={line.ewt}
                                                onChange={(e) => updateLine(line.id, "ewt", e.target.value)}
                                                onKeyDown={handleLineKeyDown}
                                                className={lineCls(false)}
                                            >
                                                {EWT_OPTIONS.map((opt) => (
                                                    <option key={opt || "none"} value={opt}>{opt || "—"}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
            <CardFooter>
                <div className="flex items-center justify-between w-full">
                    <div className="flex gap-3">
                        <button onClick={() => handleActionClick("draft")} className={`px-14 py-2 font-bold rounded-md border cursor-pointer transition-colors duration-200 active:scale-95 ${darkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-400 hover:bg-gray-100'}`}>
                            Save draft
                        </button>

                        <button onClick={() => handleActionClick("submit")} className={`px-14 py-2 font-bold rounded-md text-white cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-95 ${darkMode ? 'bg-[#1f4d82]' : 'bg-[#163c66]'}`}>
                            Submit request
                        </button>
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

            <BudgetModal
                isOpen={budgetModalFor !== null}
                onClose={() => setBudgetModalFor(null)}
                onSelect={(code) => {
                    if (budgetModalFor !== null) updateLine(budgetModalFor, "budgetCode", code);
                    setBudgetModalFor(null);
                }}
                darkMode={darkMode}
            />

            <ConfirmModal
                isOpen={pendingAction !== null}
                title={pendingAction === "submit" ? "Submit Request" : "Save Draft"}
                message={pendingAction === "submit"
                    ? "Submit this request for approval? This action cannot be undone."
                    : "Save this request as a draft?"}
                confirmButtonText={pendingAction === "submit" ? "Submit" : "Save Draft"}
                confirmButtonColor={pendingAction === "submit" ? "blue" : "green"}
                onConfirm={handleConfirm}
                onCancel={() => setPendingAction(null)}
                hasBackdrop={true}
            />

            <SuccessModal
                isOpen={showSuccess}
                title={successAction === "submit" ? "Request Submitted" : "Draft Saved"}
                message={successAction === "submit"
                    ? "Your request has been submitted for approval."
                    : "Your request has been saved as a draft."}
                onClose={() => setShowSuccess(false)}
            />
        </div>
    );
}
