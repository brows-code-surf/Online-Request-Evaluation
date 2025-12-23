'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation';
import Loader from '../_components/loader';
import { createUser, sendConfirmationEmail, checkEmailExists, checkEmployeeIDExists, sendNotification } from './_actions';
import { ToastContainer, toast } from 'react-toastify';
import LoaderButton from '../_components/loaderButton'
import { JobTitles, Departments, JobLevel } from '../../utils/jobConstants';
import { Location } from '../../utils/locationConstants';
import { generatePassword } from '../../utils/generatePassword';

export default function Signup() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [emailChecking, setEmailChecking] = useState(false);
    const [employeeIdChecking, setEmployeeIdChecking] = useState(false);
    const [employeeIdError, setEmployeeIdError] = useState('');

    const allowedDomains = ["santehfeeds.com", "gmail.com"];

    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');

    const handleJobChange = (e) => {
        const jobId = parseInt(e.target.value);
        setSelectedJobId(jobId);

        const job = JobTitles.find(j => j.id === jobId);
        const jobTitle = job ? job.value : '';
        const jobLevel = job ? JobLevel.find(jl => jl.id === job.jobLevelId)?.value : '';

        const departmentName = job
            ? Departments.find(d => d.id === job.departmentId)?.value
            : '';

        setSelectedDepartment(departmentName);
        setFormData(prev => ({
            ...prev,
            jobTitle: jobTitle,
            jobLevel: jobLevel
        }));
    };

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        location: '',
        department: '',
        jobTitle: '',
        jobLevel: '',
        employeeid: ''
    });

    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === 'email') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));

            // Check if email exists when user stops typing
            if (value) {
                setEmailChecking(true);
                try {
                    const result = await checkEmailExists(value);
                    if (result.success) {
                        if (result.exists) {
                            setEmailError('This email is already registered');
                        } else {
                            setEmailError('');
                        }
                    }
                } catch (error) {
                    console.error('Email check error:', error);
                }
                setEmailChecking(false);
            } else {
                setEmailError('');
            }
        } else if (name === 'employeeid') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));

            if (value) {
                setEmployeeIdChecking(true);
                try {
                    const result = await checkEmployeeIDExists(value);
                    if (result.success) {
                        if (result.exists) {
                            setEmployeeIdError('This Employee ID is already registered');
                        } else {
                            setEmployeeIdError('');
                        }
                    }
                } catch (error) {
                    console.error('Employee ID check error:', error);
                }
                setEmployeeIdChecking(false);
            } else {
                setEmployeeIdError('');
            }
        }

        else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Final email check before submission
            if (formData.email) {
                const emailCheckResult = await checkEmailExists(formData.email);
                if (emailCheckResult.success && emailCheckResult.exists) {
                    toast.error('This email is already registered!');
                    setLoading(false);
                    return;
                }

                
                const emailDomain = formData.email.split('@')[1];
                if (!allowedDomains.includes(emailDomain)) {
                    toast.error('Email domain is not allowed!');
                    setLoading(false);
                    return;
                }

                const employeeIdCheckResult = await checkEmployeeIDExists(formData.employeeid);
                if (employeeIdCheckResult.success && employeeIdCheckResult.exists) {
                    toast.error('This employee ID is already registered!');
                    setLoading(false);
                    return;
                } 

                const autoPassword = generatePassword();
                const submitData = {
                    ...formData,
                    password: autoPassword,
                    jobTitle: formData.jobTitle,
                    department: selectedDepartment
                };

                const res = await createUser(submitData);
                if (res.success) {
                    await sendConfirmationEmail({
                        email: formData.email,
                        title: 'Account Created',
                        companyName: 'SANTEH FEEDS CORPORATION',
                        greeting: 'Good Day!',
                        name: formData.fullName,
                        body: 'Your account has been successfully created and is pending approval. You will be notified once it is approved.',
                        buttonText: 'View Dashboard',
                        buttonUrl: 'http://localhost:3000/login',
                        companyEmail: 'j.valencia@santehfeeds.com',
                        companyPhone: '+63 2 8584 4572'
                    });
                    await sendNotification(
                        'New Account Request',
                        `A new account has been requested by ${formData.fullName} (${formData.email}). Please review and approve the account.`,
                        formData.email,
                        formData.employeeid
                    );

                    toast.success(`Account request submitted! An email has been sent to ${formData.email}`);
                    setTimeout(() => {
                        router.push('/login');
                    }, 4500);
                } else {
                    toast.error(res.message);
                }
            }
        } catch (error) {
            toast.error('Error creating account. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-500 to-green-400 animate-gradient">
            <Loader loading={loading} />
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="colored"
            />
            <div className="max-w-2xl w-full p-8 sm:p-10 bg-white rounded-xl shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-10">
                    <button
                        className="text-gray-500 hover:text-gray-700 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-50"
                        onClick={() => router.back()}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center flex-1">
                        Request Account
                    </h2>

                    <div className="w-6" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor='employeeid' className="block text-sm font-semibold text-gray-800 mb-3">
                                Employee ID
                            </label>
                            <div className="relative">
                                <input
                                    id="employeeid"
                                    name="employeeid"
                                    type="text"
                                    value={formData.employeeid}
                                    onChange={handleChange}
                                    required
                                    className={`mt-1 text-black block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200 hover:border-gray-400 ${employeeIdError ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {employeeIdChecking && (
                                    <span className="absolute right-4 top-4 text-gray-500 text-sm font-medium">
                                        Checking...
                                    </span>
                                )}
                            </div>
                            {employeeIdError && (
                                <p className="mt-2 text-sm text-red-600 font-medium">{employeeIdError}</p>
                            )}
                        </div>
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-semibold text-gray-800 mb-3"
                            >
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                className="mt-1 text-black block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200 hover:border-gray-400"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="location" className="block text-sm font-semibold text-gray-800 mb-3">
                                Location
                            </label>
                            <select
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                                className="mt-1 text-black block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200 hover:border-gray-400 appearance-none bg-white"
                            >
                                <option value="">Select a location</option>
                                {Location.map((loc) => (
                                    <option key={loc.id} value={loc.value}>
                                        {loc.value}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label
                                htmlFor="jobTitle"
                                className="block text-sm font-semibold text-gray-800 mb-3"
                            >
                                Job Title
                            </label>
                            <select
                                id="jobTitle"
                                name="jobTitle"
                                value={selectedJobId}
                                onChange={handleJobChange}
                                required
                                className="mt-1 text-black block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200 hover:border-gray-400 appearance-none bg-white"
                            >
                                <option value="">Select a job</option>
                                {JobTitles.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.value}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-600 font-medium">
                                Please select your Job Title to fill Department.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor='department' className="block text-sm font-semibold text-gray-800 mb-3">
                                Department
                            </label>
                            <input
                                id="department"
                                name="department"
                                type="text"
                                value={selectedDepartment}
                                readOnly
                                required
                                className="mt-1 text-black block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200"
                            />
                        </div>
                        <div>
                            <label htmlFor='jobLevel' className="block text-sm font-semibold text-gray-800 mb-3">
                                Job Level
                            </label>
                            <input
                                id="jobLevel"
                                name="jobLevel"
                                type="text"
                                value={formData.jobLevel}
                                readOnly
                                required
                                className="mt-1 text-black block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-3">
                            Email
                        </label>
                        <div className="relative">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className={`mt-1 text-black block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 transition-all duration-200 hover:border-gray-400 ${emailError ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {emailChecking && (
                                <span className="absolute right-4 top-4 text-gray-500 text-sm font-medium">
                                    Checking...
                                </span>
                            )}
                        </div>
                        {emailError && (
                            <p className="mt-2 text-sm text-red-600 font-medium">{emailError}</p>
                        )}
                    </div>
                    <div>
                        {loading ? (
                            <div className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600">
                                <LoaderButton loading={loading} />
                            </div>
                        ) : (
                            <button
                                type="submit"
                                disabled={emailError !== '' || employeeIdError !== ''}
                                className="w-full flex justify-center py-4 px-4 border-2 border-blue-500 rounded-lg shadow-sm text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Sign up
                            </button>
                        )}
                        <p className="mt-3 text-xs text-gray-600 font-medium text-center">Account will be reviewed after signing up</p>
                    </div>
                </form>
            </div>
        </div >
    )
}
