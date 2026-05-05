'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Users, Package, LineChart, Settings } from 'lucide-react';
import HeaderNavBar from '@/app/_components/headerNavBar.js';
import { useAuth } from '@/utils/authContext';

export default function Dashboard() {
    const { darkMode } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const theme = mounted ? darkMode : false;

    const dashboards = [
        {
            title: 'Procurement Dashboard',
            description: 'Monitor procurement requests, performance metrics, and efficiency trends',
            icon: ShoppingCart,
            href: '/dashboard/procurement',
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: 'Supplier Dashboard',
            description: 'Track supplier performance, contracts, and delivery analytics',
            icon: Users,
            href: '/dashboard/supplier',
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Item Dashboard',
            description: 'Analyze item usage, inventory levels, and procurement patterns',
            icon: Package,
            href: '/dashboard/item',
            color: 'from-purple-500 to-purple-600'
        },
        {
            title: 'System Dashboard',
            description: 'System health, user activity, and administrative insights',
            icon: Settings,
            href: '/dashboard/system',
            color: 'from-orange-500 to-orange-600'
        }
    ];

    return (
        <div className={`min-h-screen mt-15 relative overflow-hidden ${theme ? 'bg-gray-900 dark' : 'bg-white'}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
            </div>

            <HeaderNavBar />

            <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        {/* Icon with layered glow effect */}
                        <div className="relative inline-flex items-center justify-center mb-8">
                            <div className="absolute w-24 h-24 rounded-full bg-blue-500 opacity-20 blur-xl animate-pulse" />
                            <div className="absolute w-20 h-20 rounded-full bg-blue-400 opacity-15 blur-md" />
                            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 shadow-2xl shadow-blue-500/40 ring-1 ring-white/10">
                                <LineChart className="w-10 h-10 text-white drop-shadow-md" />
                            </div>
                        </div>

                        {/* Title with subtle gradient */}
                        <h1 className={`text-5xl font-bold mb-4 tracking-tight ${darkMode
                                ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-300'
                                : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-900 to-gray-800'
                            }`}>
                            Dashboard Hub
                        </h1>

                        {/* Decorative divider */}
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <div className={`h-px w-16 ${darkMode ? 'bg-gradient-to-r from-transparent to-blue-400' : 'bg-gradient-to-r from-transparent to-blue-300'}`} />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <div className={`h-px w-16 ${darkMode ? 'bg-gradient-to-l from-transparent to-blue-400' : 'bg-gradient-to-l from-transparent to-blue-300'}`} />
                        </div>

                        {/* Subtitle */}
                        <p className={`text-lg max-w-xl mx-auto leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                            Access comprehensive analytics and insights across all system areas
                            to drive <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>informed decisions</span>
                        </p>
                    </div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                        {dashboards.map((dashboard, index) => {
                            const Icon = dashboard.icon;
                            return (
                                <a
                                    key={dashboard.href}
                                    href={dashboard.href}
                                    className={`group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 ${darkMode ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50' : 'bg-white/70 backdrop-blur-sm border border-gray-200/50'
                                        }`}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Gradient Overlay */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${dashboard.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                                    {/* Animated Border */}
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${dashboard.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]`}>
                                        <div className={`w-full h-full rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}></div>
                                    </div>

                                    <div className="relative p-8 h-full flex flex-col">
                                        {/* Icon */}
                                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${dashboard.color} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="w-8 h-8 text-white" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:${dashboard.color} transition-all duration-300`}>
                                                {dashboard.title}
                                            </h3>
                                            <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed mb-6`}>
                                                {dashboard.description}
                                            </p>
                                        </div>

                                        {/* CTA */}
                                        <div className={`flex items-center justify-between ${darkMode ? 'text-blue-400' : 'text-blue-600'} group-hover:translate-x-2 transition-transform duration-300`}>
                                            <span className="text-sm font-semibold">Explore Dashboard</span>
                                            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${dashboard.color} flex items-center justify-center group-hover:w-8 transition-all duration-300`}>
                                                <span className="text-white text-xs">→</span>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>

                    {/* Bottom Section */}
                    <div className="text-center mt-16">
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Choose a dashboard above to dive deep into specific analytics and metrics
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
