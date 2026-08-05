import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface UserScope {
  isSuperAdmin: boolean;
  userId: string;
  departmentIds: string[] | null;
  locationIds: string[] | null;
}

export async function getUserScope(userId: string, roleName: string): Promise<UserScope> {
  if (roleName === 'super_admin') {
    return { isSuperAdmin: true, userId, departmentIds: null, locationIds: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      departmentId: true,
      departmentAssignments: { select: { departmentId: true } },
      locationAssignments: { select: { locationId: true } },
    },
  });

  const departmentIds = [
    ...new Set([
      ...(user?.departmentAssignments.map((d) => d.departmentId) ?? []),
      ...(user?.departmentId ? [user.departmentId] : []),
    ]),
  ];

  const locationIds = user?.locationAssignments.map((l) => l.locationId) ?? [];

  return {
    isSuperAdmin: false,
    userId,
    departmentIds: departmentIds.length ? departmentIds : [],
    locationIds: locationIds.length ? locationIds : null,
  };
}

export function applyJobScope(
  where: Prisma.JobWhereInput,
  scope: UserScope
): Prisma.JobWhereInput {
  if (scope.isSuperAdmin) return where;

  const scopeFilter: Prisma.JobWhereInput = {
    OR: [
      ...(scope.departmentIds?.length
        ? [{ departmentId: { in: scope.departmentIds } }]
        : [{ departmentId: { in: [] } }]),
      { ownedById: scope.userId },
      { createdById: scope.userId },
      { hiringManagerId: scope.userId },
    ],
  };

  if (scope.locationIds?.length) {
    return {
      AND: [where, scopeFilter, { locationId: { in: scope.locationIds } }],
    };
  }

  return { AND: [where, scopeFilter] };
}

export function applyApplicationScope(
  where: Prisma.ApplicationWhereInput,
  scope: UserScope
): Prisma.ApplicationWhereInput {
  if (scope.isSuperAdmin) return where;

  const jobFilter = applyJobScope({}, scope);

  return {
    AND: [
      where,
      {
        OR: [
          { ownedById: scope.userId },
          { job: jobFilter },
        ],
      },
    ],
  };
}

export function applyInterviewScope(
  where: Prisma.InterviewWhereInput,
  scope: UserScope
): Prisma.InterviewWhereInput {
  if (scope.isSuperAdmin) return where;
  return {
    AND: [
      where,
      {
        OR: [
          { scheduledById: scope.userId },
          { interviewersList: { some: { userId: scope.userId } } },
          { application: applyApplicationScope({}, scope) },
        ],
      },
    ],
  };
}

export function applyOfferScope(
  where: Prisma.OfferWhereInput,
  scope: UserScope
): Prisma.OfferWhereInput {
  if (scope.isSuperAdmin) return where;
  return {
    AND: [
      where,
      {
        OR: [
          { createdById: scope.userId },
          { application: applyApplicationScope({}, scope) },
        ],
      },
    ],
  };
}

export function applyRequisitionScope(
  where: Prisma.ManpowerRequisitionWhereInput,
  scope: UserScope
): Prisma.ManpowerRequisitionWhereInput {
  if (scope.isSuperAdmin) return where;
  return {
    AND: [
      where,
      {
        OR: [
          { createdById: scope.userId },
          ...(scope.departmentIds?.length
            ? [{ departmentId: { in: scope.departmentIds } }]
            : []),
        ],
      },
    ],
  };
}
