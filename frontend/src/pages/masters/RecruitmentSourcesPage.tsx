import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { recruitmentSourceService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function RecruitmentSourcesPage() {
  return (
    <MasterPage
      title="Recruitment Source"
      description="LinkedIn, Naukri, Employee Referral, etc."
      queryKey="recruitment-sources"
      service={recruitmentSourceService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Source Name', required: true, placeholder: 'e.g. LinkedIn' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
    />
  );
}
