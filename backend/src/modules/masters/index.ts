import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { MasterRepository } from './master.repository';
import { DesignationRepository } from './designation.repository';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';
import { createMasterRouter } from './master.routes.factory';
import {
  createDepartmentSchema, updateDepartmentSchema,
  createDesignationSchema, updateDesignationSchema,
  createLocationSchema, updateLocationSchema,
  createEmploymentTypeSchema, updateEmploymentTypeSchema,
  createExperienceLevelSchema, updateExperienceLevelSchema,
  createSkillSchema, updateSkillSchema,
  createInterviewTypeSchema, updateInterviewTypeSchema,
  createEducationSchema, updateEducationSchema,
  createRecruitmentSourceSchema, updateRecruitmentSourceSchema,
  createReasonSchema, updateReasonSchema,
} from './master.validators';
import { ZodSchema } from 'zod';

function buildMasterRouter<T extends { id: string }>(
  model: Prisma.ModelName,
  name: string,
  createSchema: ZodSchema,
  updateSchema: ZodSchema,
  searchFields?: string[]
) {
  const repo = new MasterRepository<T>(model);
  const service = new MasterService<T>(repo, name, searchFields);
  const controller = new MasterController<T>(service);
  return createMasterRouter<T>(controller, createSchema, updateSchema);
}

function buildDesignationRouter() {
  const repo = new DesignationRepository();
  const service = new MasterService(repo, 'Designation', ['name', 'code']);
  const controller = new MasterController(service);
  return createMasterRouter(controller, createDesignationSchema, updateDesignationSchema);
}

const router = Router();

router.use('/departments',       buildMasterRouter('Department',       'Department',       createDepartmentSchema,       updateDepartmentSchema,       ['name', 'code']));
router.use('/designations',      buildDesignationRouter());
router.use('/locations',         buildMasterRouter('Location',         'Location',         createLocationSchema,         updateLocationSchema,         ['name', 'city', 'state']));
router.use('/employment-types',  buildMasterRouter('EmploymentType',   'Employment Type',  createEmploymentTypeSchema,   updateEmploymentTypeSchema));
router.use('/experience-levels', buildMasterRouter('ExperienceLevel',  'Experience Level', createExperienceLevelSchema,  updateExperienceLevelSchema));
router.use('/skills',            buildMasterRouter('Skill',            'Skill',            createSkillSchema,            updateSkillSchema,            ['name', 'category']));
router.use('/interview-types',   buildMasterRouter('InterviewType',    'Interview Type',   createInterviewTypeSchema,    updateInterviewTypeSchema));
router.use('/education',         buildMasterRouter('Education',        'Education',        createEducationSchema,        updateEducationSchema));
router.use('/recruitment-sources', buildMasterRouter('RecruitmentSource', 'Recruitment Source', createRecruitmentSourceSchema, updateRecruitmentSourceSchema));
router.use('/reasons',           buildMasterRouter('Reason',           'Reason',           createReasonSchema,           updateReasonSchema,           ['name', 'type']));

export default router;
