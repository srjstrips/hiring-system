import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { employmentTypeService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function EmploymentTypesPage() {
  return (
    <MasterPage
      title="Employment Type"
      description="Full Time, Part Time, Contract, etc."
      queryKey="employment-types"
      service={employmentTypeService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Full Time' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
    />
  );
}
