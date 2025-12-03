'use client';

import { JobTitles, Departments } from '../../../utils/jobConstants';
import { Location } from '../../../utils/locationConstants';

export default function UserProfileHeader({ profileData, isEditing, isUserAdmin, onEditClick, profileErrors, onProfileChange, onJobChange }) {
  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{profileData.empName}</h2>
          <p className="text-blue-100">{profileData.email}</p>
        </div>
        {isUserAdmin && !isEditing && (
          <button
            onClick={onEditClick}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="px-6 py-6">
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="empName"
                value={profileData.empName}
                onChange={onProfileChange}
                className={`w-full text-black px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${profileErrors.empName ? 'border-red-500' : 'border-gray-300'}`}
              />
              {profileErrors.empName && (
                <p className="text-red-600 text-xs mt-1">{profileErrors.empName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={onProfileChange}
                className={`w-full px-4 py-2 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${profileErrors.email ? 'border-red-500' : 'border-gray-300'}`}
              />
              {profileErrors.email && (
                <p className="text-red-600 text-xs mt-1 truncate">{profileErrors.email}</p>
              )}
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                name="employeeID"
                value={profileData.employeeID}
                onChange={onProfileChange}
                disabled
                className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title
              </label>
              <select
                name="jobTitle"
                value={profileData.jobTitle}
                onChange={onJobChange}
                className={`w-full text-black px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${profileErrors.jobTitle ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select a job title</option>
                {JobTitles.map((job) => (
                  <option key={job.value} value={job.value}>
                    {job.value}
                  </option>
                ))}
              </select>
              {profileErrors.jobTitle && (
                <p className="text-red-600 text-xs mt-1">{profileErrors.jobTitle}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={profileData.department}
                readOnly
                onChange={onProfileChange}
                className={`w-full text-black px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${profileErrors.department ? 'border-red-500' : 'border-gray-300'}`}
              />
              {profileErrors.department && (
                <p className="text-red-600 text-xs mt-1">{profileErrors.department}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                id="location"
                name="location"
                value={profileData.location}
                onChange={onProfileChange}
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
              {profileErrors.location && (
                <p className="text-red-600 text-xs mt-1">{profileErrors.location}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">EMPLOYEE ID</p>
              <p className="text-gray-900 font-medium">{profileData.employeeID}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">JOB TITLE</p>
              <p className="text-gray-900 font-medium">{profileData.jobTitle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">DEPARTMENT</p>
              <p className="text-gray-900 font-medium">{profileData.department}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">LOCATION</p>
              <p className="text-gray-900 font-medium">{profileData.location}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
