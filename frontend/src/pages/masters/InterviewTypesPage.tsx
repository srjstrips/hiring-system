import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { interviewTypeService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function InterviewTypesPage() {
  return (
    <MasterPage
      title="Interview Type"
      description="Technical, HR, Managerial, etc."
      queryKey="interview-types"
      service={interviewTypeService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Technical Round' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
    />
  );
}
