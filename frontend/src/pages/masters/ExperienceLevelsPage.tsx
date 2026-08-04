import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { experienceLevelService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  minYears: z.coerce.number().min(0, 'Min years required'),
  maxYears: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function ExperienceLevelsPage() {
  return (
    <MasterPage
      title="Experience Level"
      description="Define experience bands for job postings"
      queryKey="experience-levels"
      service={experienceLevelService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Level Name', required: true, placeholder: 'e.g. Senior (5-8 years)' },
        { name: 'minYears', label: 'Min Years', type: 'number', required: true, placeholder: '5' },
        { name: 'maxYears', label: 'Max Years', type: 'number', placeholder: '8 (blank = no limit)' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
      columns={[
        { key: 'name', label: 'Level' },
        { key: 'minYears', label: 'Min Years' },
        { key: 'maxYears', label: 'Max Years', render: (r) => r['maxYears'] != null ? String(r['maxYears']) : '∞' },
      ]}
    />
  );
}
