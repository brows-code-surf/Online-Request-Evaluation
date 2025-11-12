// constants.js

export const Departments = [
  { id: 1, value: "Engineering" },
  { id: 2, value: "Product" },
  { id: 3, value: "Human Resources" },
  { id: 4, value: "Marketing" },
  { id: 5, value: "Sales" },
  { id: 6, value: "Customer Support" },
  { id: 7, value: "Finance" },
  { id: 8, value: "Administration" },
  { id: 9, value: "MIS" }
];

export const JobTitles = [
  { id: 1, value: "Software Developer", departmentId: 9 },
  { id: 2, value: "Senior Software Developer", departmentId: 9 },
  { id: 3, value: "Project Manager", departmentId: 2 },
  { id: 4, value: "Product Manager", departmentId: 2 },
  { id: 5, value: "Business Analyst", departmentId: 2 },
  { id: 6, value: "HR Specialist", departmentId: 3 },
  { id: 7, value: "Recruiter", departmentId: 3 },
  { id: 8, value: "Marketing Specialist", departmentId: 4 },
  { id: 9, value: "Sales Executive", departmentId: 5 },
  { id: 10, value: "Customer Support Representative", departmentId: 6 },
  { id: 11, value: "Finance Analyst", departmentId: 7 },
  { id: 12, value: "Accountant", departmentId: 7 },
  { id: 13, value: "Office Administrator", departmentId: 8 },
  { id: 14, value: "IT Support Specialist", departmentId: 9 },
  { id: 15, value: "System Administrator", departmentId: 9 },
  { id: 16, value: "Data Analyst", departmentId: 1 }
];
console.log(JobTitles);
console.log(Departments);   