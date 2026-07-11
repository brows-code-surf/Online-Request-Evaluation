"use client";

import React, { useState, useEffect } from "react";
import { CardHeader, CardTitle, CardContent, CardFooter } from "../../../../_components/card";
import BudgetModal from "../../../_components/BudgetModal";
import ConfirmModal from "../../../_components/confirmModal";
import SuccessModal from "../../../_components/successModal";
import { useAuth } from "@/utils/authContext";
import { getAllPaymentTerms, updateRFPDetails } from "../index";

function parseEwtPercent(ewtString) {
    if (!ewtString) return 0;
    const m = ewtString.match(/(\d+(?:\.\d+)?)%/);
    return m ? parseFloat(m[1]) : 0;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EWT_OPTIONS = ["", "2% WC158", "5% WC100", "10% WC010", "15% WC160"];
const LOCATION_OPTIONS = ["Head Office", "Cebu", "Manila", "Davao"];
const COST_CENTER_OPTIONS = ["", "HR-OD", "SALES-VIS", "MARKETING"];
const EXPENSE_CATEGORY_OPTIONS = ["Manpower / training", "Office supplies", "Utilities", "Travel", "Professional fees"];

const STATUS_COLOR = {
    DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
    SUBMITTED: "bg-blue-100 text-blue-800 border-blue-300",
    "FOR APPROVAL": "bg-yellow-100 text-yellow-800 border-yellow-300",
    APPROVED: "bg-green-100 text-green-800 border-green-300",
    REJECTED: "bg-red-100 text-red-800 border-red-300"
};

// Ensure the current stored value is always selectable even if it is not in the preset list.
function withCurrent(options, current) {
    if (current === null || current === undefined || current === "") return options;
    return options.includes(current) ? options : [current, ...options];
}

export default function DetailRFPRequest({ darkMode, rfp, onNewRequest, onRequestSaved }) {
    const { user } = useAuth();
    const header = rfp && rfp.length > 0 ? rfp[0] : null;

    const isDraft = (header?.rfpStatus || "DRAFT").toUpperCase() === "DRAFT";

    // Editable header state
    const [payee, setPayee] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [costCenter, setCostCenter] = useState("");
    const [location, setLocation] = useState("");
    const [paymentTerm, setPaymentTerm] = useState("");
    const [payeeTIN, setPayeeTIN] = useState("");

    // Editable line state
    const [lines, setLines] = useState([]);

    const [paymentTerms, setPaymentTerms] = useState([]);
    const [budgetModalFor, setBudgetModalFor] = useState(null);
    const [focusLineId, setFocusLineId] = useState(null);
    const [showErrors, setShowErrors] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successAction, setSuccessAction] = useState(null);
    const [saving, setSaving] = useState(false);

    // (Re)initialize local editable state whenever the selected request data changes.
    const rfpSignature = JSON.stringify(rfp);
    useEffect(() => {
        if (!header) return;
        setPayee(header.payee || "");
        setExpenseCategory(header.expenseCategory || "");
        setCostCenter(header.costCenter || "");
        setLocation(header.location || "");
        setPaymentTerm(header.paymentTerms || "");
        setPayeeTIN(header.payeeTIN || "");
        setLines((rfp || []).map((l, i) => ({
            id: i + 1,
            description: l.description || "",
            budgetCode: l.budgetCode || "",
            acct: l.acct || "",
            costCenter: l.costCenterDetail || l.costCenter || "",
            location: l.locationDetail || l.location || "",
            amount: Number(l.amount) || 0,
            ewt: l.ewt || ""
        })));
        setShowErrors(false);
        setFocusLineId(null);
    }, [rfpSignature]);

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

    const grossTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const ewtTotal = lines.reduce((s, l) => s + (Number(l.amount) * parseEwtPercent(l.ewt) / 100), 0);
    const netPayable = grossTotal - ewtTotal;

    const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

    const fieldCls = (hasError) =>
        `${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-stone-200 text-gray-900'} p-3 rounded-md w-full border-2 ${hasError ? 'border-red-500' : darkMode ? 'border-gray-600' : 'border-stone-400'}`;

    const readOnlyFieldCls = `${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-stone-200 text-gray-900'} p-3 rounded-md w-full border-2 ${darkMode ? 'border-gray-600' : 'border-stone-400'}`;

    const lineCls = (hasError) =>
        `w-full px-2 py-1.5 text-sm bg-transparent border-0 rounded focus:outline-none focus:ring-1 ${hasError ? 'ring-1 ring-red-500' : 'focus:ring-blue-500'} ${darkMode ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`;

    const readOnlyLineCls = `w-full px-2 py-1.5 text-sm bg-transparent border-0 rounded ${darkMode ? 'text-gray-100' : 'text-gray-900'}`;

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
        const linesValid = lines.length > 0 && lines.every(l =>
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
        setSaving(true);

        const payload = {
            rfpStatus: action === "submit" ? "SUBMITTED" : "DRAFT",
            payee,
            expenseCategory,
            costCenter,
            location,
            paymentTerms: paymentTerm,
            payeeTIN,
            createdBy: header.createdBy || "",
            modifiedBy: user?.empName || "",
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
            const result = await updateRFPDetails(header.referenceNo, payload);
            if (result.success) {
                setSuccessAction(action);
                setShowSuccess(true);
                onRequestSaved?.();
            } else {
                console.error('Update failed:', result.message);
            }
        } catch (error) {
            console.error('Error updating RFP request:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!header) {
        return (
            <div className="w-full mx-auto p-3 sm:p-4 md:p-6">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No request selected.</p>
            </div>
        );
    }

    const editable = isDraft;
    const costCenterOptions = withCurrent(COST_CENTER_OPTIONS, costCenter);
    const locationOptions = withCurrent(LOCATION_OPTIONS, location);
    const expenseCategoryOptions = withCurrent(EXPENSE_CATEGORY_OPTIONS, expenseCategory);

    return (
        <div className="w-full mx-auto p-3 sm:p-4 md:p-6">
            <CardHeader>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <CardTitle className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>Request for payment</CardTitle>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-md border ${STATUS_COLOR[header.rfpStatus] || STATUS_COLOR.DRAFT}`}>
                            {header.rfpStatus || 'DRAFT'}
                        </span>
                        {editable && (
                            <span className={`px-3 py-1 text-xs font-semibold rounded-md border ${darkMode ? 'border-amber-500 text-amber-300' : 'border-amber-400 text-amber-700'}`}>
                                Editing
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 text-sm font-mono font-bold rounded-md ${darkMode ? 'bg-blue-600 text-white' : 'bg-[#163c66] text-white'} shadow-md`}>
                            {header.referenceNo}
                        </span>
                        <button
                            type="button"
                            onClick={onNewRequest}
                            className={`px-4 py-2 rounded-md font-semibold border cursor-pointer transition-colors ${darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-gray-400 text-gray-700 hover:bg-gray-100'}`}
                        >
                            + New request
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-4 md:grid-cols-4 mb-4">
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payee</label>
                        {editable ? (
                            <input type="text" value={payee} onChange={(e) => setPayee(e.target.value)} className={fieldCls(showErrors && isEmpty(payee))} />
                        ) : (
                            <input type="text" value={payee} readOnly className={readOnlyFieldCls} />
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Expense category</label>
                        {editable ? (
                            <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className={fieldCls(showErrors && isEmpty(expenseCategory))}>
                                <option value=""></option>
                                {expenseCategoryOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <input type="text" value={expenseCategory} readOnly className={readOnlyFieldCls} />
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Cost center</label>
                        {editable ? (
                            <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className={fieldCls(showErrors && isEmpty(costCenter))}>
                                {costCenterOptions.map((opt) => (
                                    <option key={opt || "none"} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <input type="text" value={costCenter} readOnly className={readOnlyFieldCls} />
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Location</label>
                        {editable ? (
                            <select value={location} onChange={(e) => setLocation(e.target.value)} className={fieldCls(showErrors && isEmpty(location))}>
                                <option value=""></option>
                                {locationOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : (
                            <input type="text" value={location} readOnly className={readOnlyFieldCls} />
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payment terms</label>
                        {editable ? (
                            <select value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} className={fieldCls(showErrors && paymentTerms.length > 0 && isEmpty(paymentTerm))}>
                                <option value=""></option>
                                {withCurrent(paymentTerms.map(pt => pt.paymentTermId), paymentTerm).map((ptId) => (
                                    <option key={ptId} value={ptId}>{ptId}</option>
                                ))}
                            </select>
                        ) : (
                            <input type="text" value={paymentTerm} readOnly className={readOnlyFieldCls} />
                        )}
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>Payee TIN</label>
                        {editable ? (
                            <input type="text" value={payeeTIN} onChange={(e) => setPayeeTIN(e.target.value)} className={fieldCls(showErrors && isEmpty(payeeTIN))} />
                        ) : (
                            <input type="text" value={payeeTIN} readOnly className={readOnlyFieldCls} />
                        )}
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
                                            {editable ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 text-center">{index + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(line.id)}
                                                        title="Remove line"
                                                        className={`px-2 py-1 rounded-md text-base leading-none transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="w-5 text-center">{index + 1}</span>
                                            )}
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.description}
                                                readOnly={!editable}
                                                autoFocus={editable && focusLineId === line.id}
                                                onChange={(e) => updateLine(line.id, "description", e.target.value)}
                                                onKeyDown={editable ? handleLineKeyDown : undefined}
                                                placeholder={editable ? "Description" : undefined}
                                                className={editable ? lineCls(showErrors && isEmpty(line.description)) : readOnlyLineCls}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            {editable ? (
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
                                            ) : (
                                                <input type="text" value={line.budgetCode} readOnly className={`${readOnlyLineCls} font-mono`} />
                                            )}
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.acct}
                                                readOnly={!editable}
                                                onChange={(e) => updateLine(line.id, "acct", e.target.value)}
                                                onKeyDown={editable ? handleLineKeyDown : undefined}
                                                placeholder={editable ? "Acct" : undefined}
                                                className={editable ? lineCls(showErrors && isEmpty(line.acct)) : readOnlyLineCls}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.costCenter}
                                                readOnly={!editable}
                                                onChange={(e) => updateLine(line.id, "costCenter", e.target.value)}
                                                onKeyDown={editable ? handleLineKeyDown : undefined}
                                                placeholder={editable ? "Cost center" : undefined}
                                                className={editable ? lineCls(showErrors && isEmpty(line.costCenter)) : readOnlyLineCls}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            <input
                                                type="text"
                                                value={line.location}
                                                readOnly={!editable}
                                                onChange={(e) => updateLine(line.id, "location", e.target.value)}
                                                onKeyDown={editable ? handleLineKeyDown : undefined}
                                                placeholder={editable ? "Location" : undefined}
                                                className={editable ? lineCls(showErrors && isEmpty(line.location)) : readOnlyLineCls}
                                            />
                                        </td>
                                        <td className="p-2 align-middle">
                                            {editable ? (
                                                <input
                                                    type="number"
                                                    value={line.amount}
                                                    onChange={(e) => updateLine(line.id, "amount", parseFloat(e.target.value) || 0)}
                                                    onKeyDown={handleLineKeyDown}
                                                    placeholder="0.00"
                                                    className={`${lineCls(showErrors && !(Number(line.amount) > 0))} text-right`}
                                                />
                                            ) : (
                                                <input type="text" value={formatNumber(line.amount)} readOnly className={`${readOnlyLineCls} text-right`} />
                                            )}
                                        </td>
                                        <td className="p-2 align-middle">
                                            <select
                                                value={line.ewt || ""}
                                                disabled={!editable}
                                                onChange={(e) => updateLine(line.id, "ewt", e.target.value)}
                                                onKeyDown={editable ? handleLineKeyDown : undefined}
                                                className={editable ? lineCls(false) : readOnlyLineCls}
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
                        {editable && (
                            <>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleActionClick("draft")}
                                    className={`px-14 py-2 font-bold rounded-md border cursor-pointer transition-colors duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${darkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-400 hover:bg-gray-100'}`}
                                >
                                    Save draft
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleActionClick("submit")}
                                    className={`px-14 py-2 font-bold rounded-md text-white cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${darkMode ? 'bg-[#1f4d82]' : 'bg-[#163c66]'}`}
                                >
                                    Submit request
                                </button>
                            </>
                        )}
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

            {editable && (
                <BudgetModal
                    isOpen={budgetModalFor !== null}
                    onClose={() => setBudgetModalFor(null)}
                    onSelect={(code) => {
                        if (budgetModalFor !== null) updateLine(budgetModalFor, "budgetCode", code);
                        setBudgetModalFor(null);
                    }}
                    darkMode={darkMode}
                />
            )}

            <ConfirmModal
                isOpen={pendingAction !== null}
                title={pendingAction === "submit" ? "Submit Request" : "Save Draft"}
                message={pendingAction === "submit"
                    ? "Submit this request for approval? This action cannot be undone."
                    : "Save changes to this draft?"}
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
                    : "Your changes have been saved as a draft."}
                onClose={() => setShowSuccess(false)}
            />
        </div>
    );
}
