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
  { id: 1, value: "Software Developer", departmentId: 9, jobLevelId: 4 },
  { id: 2, value: "Senior Software Developer", departmentId: 9, jobLevelId: 3 },
  { id: 3, value: "Project Manager", departmentId: 2, jobLevelId: 1 },
  { id: 4, value: "Product Manager", departmentId: 2, jobLevelId: 1 },
  { id: 5, value: "Business Analyst", departmentId: 2, jobLevelId: 4 },
  { id: 6, value: "HR Specialist", departmentId: 3, jobLevelId: 4 },
  { id: 7, value: "Recruiter", departmentId: 3, jobLevelId: 4 },
  { id: 8, value: "Marketing Specialist", departmentId: 4, jobLevelId: 4 },
  { id: 9, value: "Sales Executive", departmentId: 5, jobLevelId: 2 },
  { id: 10, value: "Customer Support Representative", departmentId: 6, jobLevelId: 4 },
  { id: 11, value: "Finance Analyst", departmentId: 7, jobLevelId: 4 },
  { id: 12, value: "Accountant", departmentId: 7, jobLevelId: 4 },
  { id: 13, value: "Office Administrator", departmentId: 8, jobLevelId: 3 },
  { id: 14, value: "IT Support Specialist", departmentId: 9, jobLevelId: 4 },
  { id: 15, value: "System Administrator", departmentId: 9, jobLevelId: 3 },
  { id: 16, value: "Data Analyst", departmentId: 1, jobLevelId: 4 }
];

export const JobLevel = [
  { id: 1, value: "Manager"},
  { id: 2, value: "Officer"},
  { id: 3, value: "In-Charge / Supervisor"},
  { id: 4, value: "Office-Based Employees"},
  { id: 5, value: "Production Rank & File"},
  { id: 6, value: "Union Members"}
];