'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation';
import Loader from '../_components/loader';
import { calculateAge } from '../../utils/calculateAge';
import { createUser, sendConfirmationEmail, checkEmailExists } from './_actions';
import { ToastContainer, toast } from 'react-toastify';
import LoaderButton from '../_components/loaderButton'
import { JobTitles, Departments } from './_components/jobConstants';
import { Location } from './_components/locationConstants';
import { generatePassword } from '../../utils/generatePassword';

export default function Signup() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [emailChecking, setEmailChecking] = useState(false);

    const allowedDomains = ["santehfeeds.com", "gmail.com"];

    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');

    const handleJobChange = (e) => {
        const jobId = parseInt(e.target.value);
        setSelectedJobId(jobId);

        const job = JobTitles.find(j => j.id === jobId);
        const jobTitle = job ? job.value : '';

        const departmentName = job
            ? Departments.find(d => d.id === job.departmentId)?.value
            : '';

        setSelectedDepartment(departmentName);
        setFormData(prev => ({
            ...prev,
            jobTitle: jobTitle
        }));
    };

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        location: '',
        department: '',
        jobTitle: '',
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
        } else {
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
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-600 via-blue-500 to-green-400 animate-gradient">
            <Loader />
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="colored"
            />
            <div className="max-w-2xl w-full p-10 bg-white rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-8">
                    <button
                        className="text-gray-500 hover:text-gray-700"
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

                    <h2 className="text-3xl font-bold text-gray-900 text-center flex-1">
                        Request Account
                    </h2>

                    <div className="w-6" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 text-black block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                            />
                        </div>

                        <div className="flex-1">
                            <label
                                htmlFor="jobTitle"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Job Title
                            </label>
                            <select
                                id="jobTitle"
                                name="jobTitle"
                                value={selectedJobId}
                                onChange={handleJobChange}
                                required
                                className="mt-1 text-black block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                            >
                                <option value="">Select a job</option>
                                {JobTitles.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.value}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Please select your Job Title to fill Department.
                            </p>
                        </div>
                    </div>
                    <div>
                        <div className='flex space-x-4'>
                            <div className="flex-1">
                                <label htmlFor='department' className="block text-sm font-medium text-gray-700">
                                    Department
                                </label>
                                <input
                                    id="department"
                                    name="department"
                                    type="text"
                                    value={selectedDepartment}
                                    readOnly
                                    required
                                    className="mt-1 text-black block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                    Location
                                </label>
                                <select
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 text-black block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                                >
                                    <option value="">Select a location</option>
                                    {Location.map((loc) => (
                                        <option key={loc.id} value={loc.value}>
                                            {loc.value}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className='flex space-x-4'>
                            <div className="flex-2">
                                <label htmlFor='employeeid' className="block text-sm font-medium text-gray-700">
                                    Employee ID
                                </label>
                                <input
                                    id="employeeid"
                                    name="employeeid"
                                    type="text"
                                    value={formData.employeeid}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 text-black block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                                className={`mt-1 text-black block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black ${
                                    emailError ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {emailChecking && (
                                <span className="absolute right-3 top-3 text-gray-500 text-sm">
                                    Checking...
                                </span>
                            )}
                        </div>
                        {emailError && (
                            <p className="mt-1 text-xs text-red-600">{emailError}</p>
                        )}
                    </div>
                    <div>
                        {loading ? (
                            <div className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black">
                                <LoaderButton loading={loading} />
                            </div>
                        ) : (
                            <button
                                type="submit"
                                disabled={emailError !== ''}
                                className="w-full flex justify-center py-2 px-4 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-700 hover:bg-blue-200 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sign up
                            </button>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Account will be reviewed after signing up</p>
                    </div>
                </form>
            </div>
        </div >
    )
}
