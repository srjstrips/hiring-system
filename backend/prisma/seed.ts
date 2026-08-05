import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// All system permissions: resource:action
const PERMISSIONS = [
  // Users
  { resource: 'users', action: 'read', displayName: 'View Users' },
  { resource: 'users', action: 'create', displayName: 'Create Users' },
  { resource: 'users', action: 'update', displayName: 'Update Users' },
  { resource: 'users', action: 'delete', displayName: 'Delete Users' },
  // Roles
  { resource: 'roles', action: 'read', displayName: 'View Roles' },
  { resource: 'roles', action: 'create', displayName: 'Create Roles' },
  { resource: 'roles', action: 'update', displayName: 'Update Roles' },
  { resource: 'roles', action: 'delete', displayName: 'Delete Roles' },
  // Masters
  { resource: 'masters', action: 'read', displayName: 'View Masters' },
  { resource: 'masters', action: 'create', displayName: 'Create Masters' },
  { resource: 'masters', action: 'update', displayName: 'Update Masters' },
  { resource: 'masters', action: 'delete', displayName: 'Delete Masters' },
  // Jobs
  { resource: 'jobs', action: 'read', displayName: 'View Jobs' },
  { resource: 'jobs', action: 'create', displayName: 'Create Jobs' },
  { resource: 'jobs', action: 'update', displayName: 'Update Jobs' },
  { resource: 'jobs', action: 'delete', displayName: 'Delete Jobs' },
  { resource: 'jobs', action: 'publish', displayName: 'Publish Jobs' },
  // Requisitions
  { resource: 'requisitions', action: 'read', displayName: 'View Requisitions' },
  { resource: 'requisitions', action: 'create', displayName: 'Create Requisitions' },
  { resource: 'requisitions', action: 'update', displayName: 'Update Requisitions' },
  { resource: 'requisitions', action: 'approve', displayName: 'Approve Requisitions' },
  // Candidates
  { resource: 'candidates', action: 'read', displayName: 'View Candidates' },
  { resource: 'candidates', action: 'create', displayName: 'Create Candidates' },
  { resource: 'candidates', action: 'update', displayName: 'Update Candidates' },
  { resource: 'candidates', action: 'delete', displayName: 'Delete Candidates' },
  // Applications
  { resource: 'applications', action: 'read', displayName: 'View Applications' },
  { resource: 'applications', action: 'update', displayName: 'Update Applications' },
  // Interviews
  { resource: 'interviews', action: 'read', displayName: 'View Interviews' },
  { resource: 'interviews', action: 'create', displayName: 'Create Interviews' },
  { resource: 'interviews', action: 'update', displayName: 'Update Interviews' },
  { resource: 'interviews', action: 'feedback', displayName: 'Submit Interview Feedback' },
  // Offers
  { resource: 'offers', action: 'read', displayName: 'View Offers' },
  { resource: 'offers', action: 'create', displayName: 'Create Offers' },
  { resource: 'offers', action: 'update', displayName: 'Update Offers' },
  { resource: 'offers', action: 'approve', displayName: 'Approve Offers' },
  // Reports
  { resource: 'reports', action: 'read', displayName: 'View Reports' },
  // Assessments
  { resource: 'assessments', action: 'read', displayName: 'View Assessments' },
  { resource: 'assessments', action: 'create', displayName: 'Create Assessments' },
  { resource: 'assessments', action: 'update', displayName: 'Update Assessments' },
  { resource: 'assessments', action: 'delete', displayName: 'Delete Assessments' },
  // Email Templates
  { resource: 'email-templates', action: 'read', displayName: 'View Email Templates' },
  { resource: 'email-templates', action: 'create', displayName: 'Create Email Templates' },
  { resource: 'email-templates', action: 'update', displayName: 'Update Email Templates' },
  { resource: 'email-templates', action: 'delete', displayName: 'Delete Email Templates' },
  // Dashboard
  { resource: 'dashboard', action: 'read', displayName: 'View Dashboard' },
  // Employees
  { resource: 'employees', action: 'read', displayName: 'View Employees' },
  { resource: 'employees', action: 'create', displayName: 'Create Employees' },
  { resource: 'employees', action: 'update', displayName: 'Update Employees' },
];

const ROLES = [
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'Full system access',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  {
    name: 'hr',
    displayName: 'HR Manager',
    description: 'Human Resources team member',
    isSystem: true,
    permissions: [
      'masters:read', 'masters:create', 'masters:update',
      'jobs:read', 'jobs:create', 'jobs:update', 'jobs:publish',
      'requisitions:read', 'requisitions:create', 'requisitions:update',
      'candidates:read', 'candidates:create', 'candidates:update',
      'applications:read', 'applications:update',
      'interviews:read', 'interviews:create', 'interviews:update',
      'offers:read', 'offers:create', 'offers:update',
      'assessments:read', 'assessments:create', 'assessments:update', 'assessments:delete',
      'email-templates:read', 'email-templates:create', 'email-templates:update', 'email-templates:delete',
      'reports:read', 'dashboard:read',
      'employees:read', 'employees:create', 'employees:update',
    ],
  },
  {
    name: 'hiring_manager',
    displayName: 'Hiring Manager',
    description: 'Manages hiring for assigned jobs',
    isSystem: true,
    permissions: [
      'jobs:read', 'requisitions:read', 'requisitions:create',
      'candidates:read', 'applications:read', 'applications:update',
      'interviews:read', 'interviews:create', 'interviews:feedback',
      'offers:read', 'dashboard:read',
    ],
  },
  {
    name: 'department_head',
    displayName: 'Department Head',
    description: 'Head of a department',
    isSystem: true,
    permissions: [
      'requisitions:read', 'requisitions:create', 'requisitions:approve',
      'jobs:read', 'candidates:read', 'applications:read',
      'interviews:read', 'reports:read', 'dashboard:read', 'employees:read',
    ],
  },
  {
    name: 'interview_panel',
    displayName: 'Interview Panel',
    description: 'Member of interview panel',
    isSystem: true,
    permissions: [
      'interviews:read', 'interviews:feedback',
      'candidates:read', 'applications:read',
    ],
  },
  {
    name: 'candidate',
    displayName: 'Candidate',
    description: 'Job applicant',
    isSystem: true,
    permissions: [],
  },
];

async function main() {
  console.log('Seeding database...');

  // Upsert permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: { displayName: perm.displayName },
      create: perm,
    });
  }
  console.log(`✓ ${PERMISSIONS.length} permissions seeded`);

  // Upsert roles and assign permissions
  for (const roleData of ROLES) {
    const { permissions, ...roleFields } = roleData;

    const role = await prisma.role.upsert({
      where: { name: roleFields.name },
      update: { displayName: roleFields.displayName, description: roleFields.description },
      create: roleFields,
    });

    // Clear and reassign role permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permStr of permissions) {
      const [resource, action] = permStr.split(':');
      const perm = await prisma.permission.findUnique({
        where: { resource_action: { resource, action } },
      });
      if (perm) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }
  console.log(`✓ ${ROLES.length} roles seeded with permissions`);

  // Seed super admin user
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
  if (!superAdminRole) throw new Error('Super admin role not found');

  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@company.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        email: 'admin@company.com',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        roleId: superAdminRole.id,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    console.log('✓ Super admin created: admin@company.com / Admin@123');
  } else {
    console.log('✓ Super admin already exists');
  }

  // Seed master data
  const departments = ['Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance', 'Operations'];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, code: name.toUpperCase().replace(/\s+/g, '_').slice(0, 10) },
    });
  }
  console.log(`✓ ${departments.length} departments seeded`);

  const designations = [
    { name: 'Software Engineer', code: 'SWE', level: 3 },
    { name: 'Senior Software Engineer', code: 'SSE', level: 4 },
    { name: 'Tech Lead', code: 'TL', level: 5 },
    { name: 'Engineering Manager', code: 'EM', level: 6 },
    { name: 'HR Executive', code: 'HRE', level: 2 },
    { name: 'HR Manager', code: 'HRM', level: 4 },
    { name: 'Sales Executive', code: 'SE', level: 2 },
    { name: 'Product Manager', code: 'PM', level: 5 },
  ];
  for (const d of designations) {
    await prisma.designation.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }
  console.log(`✓ ${designations.length} designations seeded`);

  const locations = [
    { name: 'Bangalore HQ', city: 'Bangalore', state: 'Karnataka' },
    { name: 'Mumbai Office', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Delhi Office', city: 'Delhi', state: 'Delhi' },
    { name: 'Hyderabad Office', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Chennai Office', city: 'Chennai', state: 'Tamil Nadu' },
  ];
  for (const l of locations) {
    const existing = await prisma.location.findFirst({ where: { name: l.name } });
    if (!existing) await prisma.location.create({ data: l });
  }
  console.log(`✓ ${locations.length} locations seeded`);

  const employmentTypes = ['Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance'];
  for (const name of employmentTypes) {
    await prisma.employmentType.upsert({ where: { name }, update: {}, create: { name } });
  }

  const experienceLevels = [
    { name: 'Fresher', minYears: 0, maxYears: 1 },
    { name: 'Junior (1-3 years)', minYears: 1, maxYears: 3 },
    { name: 'Mid-Level (3-5 years)', minYears: 3, maxYears: 5 },
    { name: 'Senior (5-8 years)', minYears: 5, maxYears: 8 },
    { name: 'Lead (8-12 years)', minYears: 8, maxYears: 12 },
    { name: 'Principal (12+ years)', minYears: 12, maxYears: null },
  ];
  for (const e of experienceLevels) {
    await prisma.experienceLevel.upsert({ where: { name: e.name }, update: {}, create: e });
  }

  const skills = [
    { name: 'JavaScript', category: 'Programming' },
    { name: 'TypeScript', category: 'Programming' },
    { name: 'React', category: 'Frontend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'Python', category: 'Programming' },
    { name: 'Java', category: 'Programming' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'AWS', category: 'Cloud' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Communication', category: 'Soft Skills' },
    { name: 'Leadership', category: 'Soft Skills' },
  ];
  for (const s of skills) {
    await prisma.skill.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  const sources = ['Company Website', 'LinkedIn', 'Naukri', 'Indeed', 'Employee Referral', 'Campus', 'Agency', 'Walk-In'];
  for (const name of sources) {
    await prisma.recruitmentSource.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log('✓ All master data seeded');
  console.log('\n✅ Database seeding complete!');
  console.log('   Login: admin@company.com | Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
