import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/response';
import {
  getUserScope,
  applyApplicationScope,
  applyInterviewScope,
  applyOfferScope,
  applyJobScope,
} from '../../utils/scope';

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export async function hiringOverview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const apps = await prisma.application.findMany({
      where: applyApplicationScope({}, scope),
      select: { appliedAt: true, status: true },
    });
    const interviews = await prisma.interview.findMany({
      where: applyInterviewScope({}, scope),
      select: { scheduledAt: true },
    });
    const offers = await prisma.offer.findMany({
      where: applyOfferScope({}, scope),
      select: { createdAt: true, status: true },
    });

    const map: Record<string, { month: string; applications: number; interviews: number; offers: number; joining: number }> = {};
    const bump = (key: string, field: 'applications' | 'interviews' | 'offers' | 'joining') => {
      if (!map[key]) map[key] = { month: key, applications: 0, interviews: 0, offers: 0, joining: 0 };
      map[key][field] += 1;
    };

    for (const a of apps) {
      bump(monthKey(a.appliedAt), 'applications');
      if (a.status === 'JOINED') bump(monthKey(a.appliedAt), 'joining');
    }
    for (const i of interviews) bump(monthKey(i.scheduledAt), 'interviews');
    for (const o of offers) bump(monthKey(o.createdAt), 'offers');

    return ApiResponse.success(res, Object.values(map).sort((a, b) => a.month.localeCompare(b.month)));
  } catch (err) {
    next(err);
  }
}

export async function byDepartment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const apps = await prisma.application.findMany({
      where: applyApplicationScope({ status: { in: ['JOINED', 'OFFER_ACCEPTED', 'SELECTED'] } }, scope),
      include: { job: { include: { department: true } } },
    });
    const map = new Map<string, { name: string; count: number }>();
    for (const a of apps) {
      const id = a.job.departmentId;
      const name = a.job.department.name;
      map.set(id, { name, count: (map.get(id)?.count ?? 0) + 1 });
    }
    return ApiResponse.success(res, Array.from(map.entries()).map(([key, v]) => ({ key, ...v })));
  } catch (err) {
    next(err);
  }
}

export async function byPosition(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const apps = await prisma.application.findMany({
      where: applyApplicationScope({ status: { in: ['JOINED', 'OFFER_ACCEPTED', 'SELECTED'] } }, scope),
      include: { job: true },
    });
    const map = new Map<string, { name: string; count: number }>();
    for (const a of apps) {
      map.set(a.jobId, { name: a.job.title, count: (map.get(a.jobId)?.count ?? 0) + 1 });
    }
    return ApiResponse.success(res, Array.from(map.entries()).map(([key, v]) => ({ key, ...v })));
  } catch (err) {
    next(err);
  }
}

export async function byRecruiter(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const apps = await prisma.application.findMany({
      where: applyApplicationScope({ ownedById: { not: null } }, scope),
      include: { ownedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    const map = new Map<string, { name: string; count: number }>();
    for (const a of apps) {
      if (!a.ownedBy) continue;
      const name = `${a.ownedBy.firstName} ${a.ownedBy.lastName}`;
      map.set(a.ownedBy.id, { name, count: (map.get(a.ownedBy.id)?.count ?? 0) + 1 });
    }
    return ApiResponse.success(res, Array.from(map.entries()).map(([key, v]) => ({ key, ...v })));
  } catch (err) {
    next(err);
  }
}

export async function onboarding(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const offers = await prisma.offer.findMany({
      where: applyOfferScope({}, scope),
      select: { status: true, createdAt: true, acceptedAt: true },
    });
    const joinings = await prisma.joiningChecklist.findMany({
      include: { application: { include: { job: true } } },
    });

    const scopedJoinings = scope.isSuperAdmin
      ? joinings
      : joinings.filter((j) =>
          !scope.departmentIds?.length || scope.departmentIds.includes(j.application.job.departmentId)
        );

    const summary = {
      offerAccepted: offers.filter((o) => o.status === 'ACCEPTED').length,
      offerDeclined: offers.filter((o) => o.status === 'REJECTED').length,
      joined: scopedJoinings.filter((j) => ['JOINED', 'COMPLETED', 'ONBOARDING'].includes(j.status)).length,
      notJoined: scopedJoinings.filter((j) => j.status === 'NOT_JOINED').length,
    };

    const map: Record<string, any> = {};
    for (const o of offers) {
      const key = monthKey(o.createdAt);
      if (!map[key]) map[key] = { month: key, offerAccepted: 0, offerDeclined: 0, joined: 0, notJoined: 0 };
      if (o.status === 'ACCEPTED') map[key].offerAccepted += 1;
      if (o.status === 'REJECTED') map[key].offerDeclined += 1;
    }
    for (const j of scopedJoinings) {
      const key = monthKey(j.createdAt);
      if (!map[key]) map[key] = { month: key, offerAccepted: 0, offerDeclined: 0, joined: 0, notJoined: 0 };
      if (['JOINED', 'COMPLETED', 'ONBOARDING'].includes(j.status)) map[key].joined += 1;
      if (j.status === 'NOT_JOINED') map[key].notJoined += 1;
    }

    return ApiResponse.success(res, {
      summary,
      data: Object.values(map).sort((a: any, b: any) => a.month.localeCompare(b.month)),
    });
  } catch (err) {
    next(err);
  }
}

export async function retention(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const employees = await prisma.employee.findMany({
      where: scope.isSuperAdmin
        ? undefined
        : { departmentId: { in: scope.departmentIds?.length ? scope.departmentIds : ['__none__'] } },
      include: {
        department: true,
        designation: true,
        candidate: { select: { firstName: true, lastName: true } },
      },
    });

    const joined = employees.length;
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const left = employees.filter((e) => e.status === 'EXITED').length;
    const retentionPct = joined ? Math.round((active / joined) * 100) : 0;

    const byDepartmentMap = new Map<string, any>();
    for (const e of employees) {
      const key = e.departmentId;
      const cur = byDepartmentMap.get(key) ?? {
        name: e.department.name,
        joined: 0,
        active: 0,
        left: 0,
      };
      cur.joined += 1;
      if (e.status === 'ACTIVE') cur.active += 1;
      if (e.status === 'EXITED') cur.left += 1;
      cur.retentionPct = cur.joined ? Math.round((cur.active / cur.joined) * 100) : 0;
      byDepartmentMap.set(key, cur);
    }

    return ApiResponse.success(res, {
      summary: {
        employeesJoined: joined,
        employeesStillActive: active,
        employeesLeft: left,
        retentionPct,
      },
      byDepartment: Array.from(byDepartmentMap.values()),
      data: Array.from(byDepartmentMap.values()),
    });
  } catch (err) {
    next(err);
  }
}

export async function noticePeriod(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const data = await prisma.employee.findMany({
      where: {
        status: { in: ['NOTICE_PERIOD', 'EXITED'] },
        ...(scope.isSuperAdmin
          ? {}
          : { departmentId: { in: scope.departmentIds?.length ? scope.departmentIds : ['__none__'] } }),
      },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        department: true,
        designation: true,
      },
      orderBy: { noticeStartDate: 'desc' },
    });

    const summary = {
      noticeCompleted: data.filter((e) => e.noticeStatus === 'NOTICE_COMPLETED').length,
      noticePending: data.filter((e) =>
        e.noticeStatus === 'NOTICE_STARTED' || e.noticeStatus === 'NOTICE_IN_PROGRESS'
      ).length,
      exitedBeforeCompletion: data.filter((e) => e.noticeStatus === 'EXITED_EARLY').length,
    };

    return ApiResponse.success(res, { summary, data });
  } catch (err) {
    next(err);
  }
}

export async function timeToHire(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const apps = await prisma.application.findMany({
      where: applyApplicationScope({ status: { in: ['JOINED', 'OFFER_ACCEPTED', 'SELECTED'] } }, scope),
      include: {
        job: { include: { department: true } },
        ownedBy: { select: { id: true, firstName: true, lastName: true } },
        timeline: { orderBy: { createdAt: 'asc' } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        offer: true,
      },
    });

    const hireDays: number[] = [];
    const screenDays: number[] = [];
    const interviewDays: number[] = [];
    const offerAcceptDays: number[] = [];
    const joiningDays: number[] = [];

    const byDepartment = new Map<string, { name: string; total: number; count: number }>();
    const byPosition = new Map<string, { name: string; total: number; count: number }>();
    const byRecruiter = new Map<string, { name: string; total: number; count: number }>();
    const byMonth = new Map<string, { name: string; total: number; count: number }>();

    for (const app of apps) {
      const end = app.updatedAt;
      const hire = daysBetween(app.appliedAt, end);
      hireDays.push(hire);

      const screening = app.timeline.find((t) => t.toStatus === 'SCREENING' || t.toStatus === 'SHORTLISTED');
      if (screening) screenDays.push(daysBetween(app.appliedAt, screening.createdAt));

      const firstInterview = app.interviews[0];
      if (firstInterview) interviewDays.push(daysBetween(app.appliedAt, firstInterview.scheduledAt));

      if (app.offer?.sentAt && app.offer.acceptedAt) {
        offerAcceptDays.push(daysBetween(app.offer.sentAt, app.offer.acceptedAt));
      }
      if (app.offer?.acceptedAt && app.status === 'JOINED') {
        joiningDays.push(daysBetween(app.offer.acceptedAt, end));
      }

      const bump = (map: Map<string, any>, key: string, name: string, days: number) => {
        const cur = map.get(key) ?? { name, total: 0, count: 0 };
        cur.total += days;
        cur.count += 1;
        map.set(key, cur);
      };

      bump(byDepartment, app.job.departmentId, app.job.department.name, hire);
      bump(byPosition, app.jobId, app.job.title, hire);
      if (app.ownedBy) bump(byRecruiter, app.ownedBy.id, `${app.ownedBy.firstName} ${app.ownedBy.lastName}`, hire);
      bump(byMonth, monthKey(app.appliedAt), monthKey(app.appliedAt), hire);
    }

    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
    const metrics = {
      avgHire: avg(hireDays),
      avgScreen: avg(screenDays),
      avgInterview: avg(interviewDays),
      avgOfferAccept: avg(offerAcceptDays),
      avgJoining: avg(joiningDays),
    };

    const toRows = (map: Map<string, any>) =>
      Array.from(map.entries()).map(([key, v]) => ({
        key,
        name: v.name,
        count: v.count,
        hires: v.count,
        avgDays: v.count ? Math.round(v.total / v.count) : 0,
      }));

    const remarks: string[] = [];
    if (metrics.avgHire > 45) remarks.push('Hiring slower than target (45 days). Review bottlenecks.');
    else if (metrics.avgHire > 0 && metrics.avgHire <= 30) remarks.push('Hiring improving compared to typical enterprise targets.');
    if (metrics.avgInterview > 14) remarks.push('Interview delays detected.');
    if (metrics.avgOfferAccept > 7) remarks.push('Offer acceptance cycle is longer than expected.');
    if (metrics.avgOfferAccept > 0 && metrics.avgOfferAccept <= 5) remarks.push('Offer acceptance rate timing is healthy.');
    if (!remarks.length) remarks.push('Insufficient historical data for deep trend remarks yet.');

    // silence unused
    void applyJobScope;

    return ApiResponse.success(res, {
      metrics,
      breakdowns: {
        byDepartment: toRows(byDepartment),
        byPosition: toRows(byPosition),
        byRecruiter: toRows(byRecruiter),
        byMonth: toRows(byMonth),
      },
      remarks,
    });
  } catch (err) {
    next(err);
  }
}
